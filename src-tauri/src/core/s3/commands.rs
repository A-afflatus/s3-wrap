use crate::common::cnet::NetResult;
use crate::core::s3::bucket::{S3Bucket, S3BucketInfo};
use crate::core::s3::credential::{get_s3_pool, CredentialStorage, S3Credential};
use crate::core::s3::object::{S3ObjectDetail, S3ObjectList};
use crate::core::s3::types::S3CorsRule;
use crate::db::sqlite;
use log::{error, info, warn};
use std::future::Future;
use std::sync::Arc;
use tauri::async_runtime::block_on;
use tauri::command;

pub(crate) fn execute<F, Fut, T>(id: String, f: F) -> NetResult<T>
where
    F: Fn(Arc<S3Credential>) -> Fut,
    Fut: Future<Output = NetResult<T>>,
{
    block_on(async move {
        let pool = get_s3_pool().read().await;
        match pool.get(&id) {
            //池子里有直接用
            Some(o) => f(o.clone()).await,
            None => {
                info!("凭证:{}-不存在，从数据库中载入", &id);
                //归还读锁
                drop(pool);
                //载入数据库链接池
                match sqlite::get_sql_lite_pool().acquire().await {
                    Ok(mut conn) => {
                        //查询库里是否有
                        match sqlx::query_as::<_, CredentialStorage>("select id,name,access_key_id,secret_access_key,region,endpoint,force_path_style from credentials where id = ?")
                            .bind(&id)
                            .fetch_optional(&mut *conn)
                            .await
                        {
                            Ok(opt) => {
                                match opt { 
                                    Some(credential) => {
                                        //载入
                                        match S3Credential::preload(credential).await {
                                            Ok(s3) => {
                                                info!("凭证:{}-加载成功",&id);
                                                let id = &s3.id.clone();
                                                let s3 =Arc::new(s3);
                                                let mut pool = get_s3_pool().write().await;
                                                pool.insert(id.clone(), s3.clone());
                                                drop(pool);
                                                info!("凭证:{}-载入成功",&id);
                                                f(s3.clone()).await
                                            },
                                            Err(err) => {
                                                error!("载入凭证失败: {:#?}", err);
                                                NetResult::err(format!("载入凭证失败：{:#?}",err))
                                            }
                                        }
                                    },
                                    None => {
                                        warn!("查询凭证信息失败: 凭证不存在");
                                        NetResult::err("凭证不存在".to_string())
                                    }
                                }
                            },
                            Err(err) => {
                                warn!("数据库查询凭证信息失败: {:#?}", err);
                                NetResult::err(format!("载入凭证失败：{err:?}"))
                            }
                        }
                    }
                    Err(err) => {
                        warn!("获取数据库连接失败: {:#?}", err);
                        NetResult::err(format!("载入凭证失败：{err:?}"))
                    }
                }
            }
        }
    })
}
/// 保存凭证信息
#[command]
pub fn save_credential(param: CredentialStorage) -> NetResult<()> {
    block_on(async move {
        match S3Credential::preload(param).await {
            Ok(s3) => match s3.save_credential().await {
                Ok(_) => {
                    let mut pool = get_s3_pool().write().await;
                    pool.insert(s3.id.clone(), Arc::new(s3));
                    NetResult::ok_empty()
                }
                Err(err) => {
                    warn!("保存凭证信息失败: {:#?}", err);
                    NetResult::err(err.to_string())
                }
            },
            Err(err) => NetResult::err(format!("{:?}", err)),
        }
    })
}
/// 获取buckets
#[command]
pub fn get_buckets(id: String) -> NetResult<Vec<S3Bucket>> {
    execute(id, |credential| async move {
        match credential.get_buckets().await {
            Ok(buckets) => {
                return NetResult::ok(
                    buckets
                        .into_iter()
                        .map(|bucket| bucket.into())
                        .collect::<Vec<S3Bucket>>(),
                );
            }
            Err(e) => {
                warn!("获取bucket列表失败: {:#?}", e);
                NetResult::ok(vec![])
            }
        }
    })
}
/// 查询bucket下object列表
#[command]
pub fn list_objects(
    id: String,
    bucket: String,
    max_keys: i32,
    prefix: Option<String>,
    continuation_token: Option<String>,
) -> NetResult<S3ObjectList> {
    execute(id, |credential| {
        let bucket = bucket.clone();
        let prefix = prefix.clone();
        let continuation_token = continuation_token.clone();
        async move {
            match credential
                .list_objects(bucket, max_keys, prefix, continuation_token)
                .await
            {
                Ok(object_list) => NetResult::ok(object_list),
                Err(e) => {
                    warn!("获取对象列表失败: {:#?}", e);
                    NetResult::err(e.to_string())
                }
            }
        }
    })
}

/// 创建bucket
#[command]
pub fn create_bucket(
    id: String,
    bucket_name: String,
    acl: Option<String>,
    object_lock: Option<bool>,
) -> NetResult<()> {
    execute(id, |credential| {
        let bucket_name = bucket_name.clone();
        let acl = acl.clone();
        let object_lock = object_lock.clone();
        async move {
            match credential
                .create_bucket(bucket_name, acl, object_lock)
                .await
            {
                Ok(_) => NetResult::ok(()),
                Err(e) => {
                    warn!("创建Bucket失败: {:#?}", e);
                    NetResult::err(e.to_string())
                }
            }
        }
    })
}
/// 删除bucket
#[command]
pub fn delete_bucket(id: String, bucket_name: String) -> NetResult<()> {
    execute(id, |credential| {
        let bucket_name = bucket_name.clone();
        async move {
            match credential.delete_bucket(bucket_name).await {
                Ok(_) => NetResult::ok(()),
                Err(e) => {
                    warn!("删除Bucket失败: {:#?}", e);
                    NetResult::err(e.to_string())
                }
            }
        }
    })
}

/// 推对象
#[command]
pub fn put_object(
    id: String,
    bucket: String,
    key: String,
    file_path: Option<String>,
) -> NetResult<()> {
    execute(id, |credential| {
        let bucket = bucket.clone();
        let key = key.clone();
        let file_path = file_path.clone(); // 新增 file_path 参数
        async move {
            match credential.put_object(bucket, key, file_path).await {
                Ok(_) => NetResult::ok(()),
                Err(e) => {
                    warn!("推对象失败: {:#?}", e);
                    NetResult::err(e.to_string())
                }
            }
        }
    })
}

/// 删除多个对象
#[command]
pub fn delete_objects(id: String, bucket: String, keys: Vec<String>) -> NetResult<()> {
    execute(id, |credential| {
        let bucket = bucket.clone();
        let keys = keys.clone();
        async move {
            match credential.delete_objects(bucket, keys).await {
                Ok(_) => NetResult::ok(()),
                Err(e) => {
                    warn!("删除对象失败: {:#?}", e);
                    NetResult::err(e.to_string())
                }
            }
        }
    })
}
/// 获取对象url
#[command]
pub fn get_object_url(id: String, bucket: String, key: String, millis: u64) -> NetResult<String> {
    execute(id, |credential| {
        let bucket = bucket.clone();
        let key = key.clone();
        async move {
            match credential.get_object_uri(bucket, key, millis).await {
                Ok(url) => NetResult::ok(url),
                Err(e) => {
                    warn!("获取对象url失败: {:#?}", e);
                    NetResult::err(e.to_string())
                }
            }
        }
    })
}
/// 获取bucket详细信息
#[command]
pub fn get_bucket_info(id: String, bucket: String) -> NetResult<S3BucketInfo> {
    execute(id, |credential| {
        let bucket = bucket.clone();
        async move {
            match credential.get_bucket_info(bucket).await {
                Ok(info) => NetResult::ok(info),
                Err(e) => {
                    warn!("获取bucket详细信息失败: {:#?}", e);
                    NetResult::err(e.to_string())
                }
            }
        }
    })
}
/// 为bucket添加跨域设置
#[command]
pub fn put_bucket_cors(id: String, bucket: String, cors_rule: S3CorsRule) -> NetResult<()> {
    execute(id, |credential| {
        let bucket = bucket.clone();
        let rule = cors_rule.clone();
        async move {
            match credential.put_bucket_cors(bucket, rule).await {
                Ok(_) => NetResult::ok(()),
                Err(e) => NetResult::err(format!("{e:?}")),
            }
        }
    })
}
/// 为bucket删除跨域设置
#[command]
pub fn delete_bucket_cors(id: String, bucket: String) -> NetResult<()> {
    execute(id, |credential| {
        let bucket = bucket.clone();
        async move {
            match credential.delete_bucket_cors(bucket).await {
                Ok(_) => NetResult::ok(()),
                Err(e) => NetResult::err(format!("{e:?}")),
            }
        }
    })
}
/// 获取对象详情
#[command]
pub fn get_object_info(id: String, bucket: String, key: String) -> NetResult<S3ObjectDetail> {
    execute(id, |credential| {
        let bucket = bucket.clone();
        let key = key.clone();
        async move {
            match credential.get_object_info(bucket, key).await {
                Ok(detail) => NetResult::ok(detail),
                Err(e) => NetResult::err(format!("{e:?}")),
            }
        }
    })
}
