use crate::core::s3::credential::S3Credential;
use crate::core::s3::types::{S3CorsRule, S3GrantPermission, S3Grantee};
use aws_sdk_s3::types::{Bucket, CorsConfiguration, CorsRule};
use aws_smithy_types::error::metadata::ProvideErrorMetadata;
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::error::Error;

#[derive(Serialize, Deserialize, Debug)]
pub struct S3Bucket {
    pub name: String,
    pub bucket_region: String,
    pub creation_date: String,
}
//详细信息
#[derive(Serialize, Deserialize, Debug)]
pub struct S3BucketInfo {
    pub name: String,
    //区域
    pub location: Option<String>,
    //region
    pub bucket_region: Option<String>,
    //跨域配置
    pub cors_rule: Option<Vec<S3CorsRule>>,
    //权限
    pub acl: Option<Vec<(Option<S3Grantee>, Option<S3GrantPermission>)>>,
}

impl From<Bucket> for S3Bucket {
    fn from(bucket: Bucket) -> Self {
        S3Bucket {
            name: bucket.name.unwrap_or_default(),
            bucket_region: bucket.bucket_region.unwrap_or_default(),
            creation_date: {
                match bucket.creation_date {
                    Some(date) => date.to_string(),
                    None => "空".to_string(),
                }
            },
        }
    }
}

impl S3Credential {
    /**
     * 创建bucket
     */
    pub(crate) async fn create_bucket(
        &self,
        bucket_name: String,
        acl: Option<String>,
        object_lock: Option<bool>,
    ) -> Result<(), Box<dyn Error>> {
        info!(
            "创建bucket: {}, acl: {:#?},object_lock: {:#?}",
            bucket_name, acl, object_lock
        );
        match self
            .client
            .create_bucket()
            .bucket(bucket_name)
            .set_acl(acl.map(|x| x.parse().unwrap()))
            .set_object_lock_enabled_for_bucket(object_lock)
            .send()
            .await
        {
            Ok(_) => {
                info!("创建bucket成功");
            }
            Err(err) => {
                error!("创建bucket失败{:#?}", err);
                return Err(Box::from(err.message().unwrap_or("创建bucket失败")));
            }
        };
        Ok(())
    }
    /**
     * bucket列表
     */
    pub(crate) async fn get_buckets(&self) -> Result<Vec<Bucket>, Box<dyn Error>> {
        let buckets = self
            .client
            .list_buckets()
            .send()
            .await?
            .buckets
            .unwrap_or_default()
            .to_vec();
        Ok(buckets)
    }
    /**
     * 删除bucket
     */
    pub(crate) async fn delete_bucket(&self, bucket_name: String) -> Result<(), Box<dyn Error>> {
        info!("删除bucket: {}", bucket_name);
        match self.client.delete_bucket().bucket(bucket_name).send().await {
            Ok(_) => {
                info!("删除bucket成功");
            }
            Err(err) => {
                error!("删除bucket失败{:#?}", err);
                if let Some(cord) = err.code() {
                    if cord == "BucketNotEmpty" {
                        return Err(Box::from("此bucket还有对象，请先删除它们"));
                    }
                }
                return Err(Box::from(err.message().unwrap_or(err.to_string().as_str())));
            }
        };
        Ok(())
    }
    /**
     * 查询bucket详细信息
     */
    pub(crate) async fn get_bucket_info(
        &self,
        bucket: String,
    ) -> Result<S3BucketInfo, Box<dyn Error>> {
        info!("查询bucket信息: {}", bucket);
        // 获取bucket信息
        let bucket_region = match self
            .client
            .head_bucket()
            .bucket(bucket.clone())
            .send()
            .await
        {
            Ok(head) => {
                info!("Bucket:{}-头信息: {:?}", bucket, head);
                head.bucket_region
            }
            Err(err) => {
                warn!("Bucket:{}-头信息: {:#?}", bucket, err.code());
                None
            }
        };
        // 获取跨域信息
        let core_rules = match self
            .client
            .get_bucket_cors()
            .bucket(bucket.clone())
            .send()
            .await
        {
            Ok(cors) => {
                info!("Bucket:{}-跨域信息: {:?}", bucket, cors.cors_rules);
                cors.cors_rules
            }
            Err(err) => {
                warn!("Bucket:{}-跨域信息: {:#?}", bucket, err.code()); // NoSuchCORSConfiguration
                None
            }
        };
        // 获取区域
        let location = match self
            .client
            .get_bucket_location()
            .bucket(bucket.clone())
            .send()
            .await
        {
            Ok(location) => {
                info!(
                    "Bucket:{}-区域信息: {:?}",
                    bucket, location.location_constraint
                );
                location.location_constraint
            }
            Err(err) => {
                warn!("Bucket:{}-区域信息: {:#?}", bucket, err.code());
                None
            }
        };
        // 获取 ACL
        let grants = match self
            .client
            .get_bucket_acl()
            .bucket(bucket.clone())
            .send()
            .await
        {
            Ok(acl) => {
                info!("Bucket:{}-权限信息: {:?}", bucket, acl.grants);
                acl.grants
            }
            Err(err) => {
                warn!("Bucket:{}-权限信息: {:#?}", bucket, err.code());
                None
            }
        };
        Ok(S3BucketInfo {
            name: bucket.clone(),
            location: location.map(|x| x.to_string()),
            bucket_region,
            cors_rule: core_rules.map(|list| list.iter().map(|x| x.into()).collect()),
            acl: grants.map(|list| {
                list.iter()
                    .map(|grant| {
                        (
                            grant.grantee.clone().map(|grantee| grantee.into()),
                            grant.permission.clone().map(|permission| permission.into()),
                        )
                    })
                    .collect()
            }),
        })
    }
    /**
     * 为bucket添加跨域设置
     */
    pub(crate) async fn put_bucket_cors(
        &self,
        bucket: String,
        cors_rule: S3CorsRule,
    ) -> Result<(), Box<dyn Error>> {
        info!("为bucket: {}添加跨域设置", bucket);
        match self
            .client
            .put_bucket_cors()
            .cors_configuration(
                CorsConfiguration::builder()
                    .cors_rules(
                        CorsRule::builder()
                            .set_allowed_origins(Some(cors_rule.allowed_origins))
                            .set_allowed_methods(Some(cors_rule.allowed_methods))
                            .set_allowed_headers(cors_rule.allowed_headers)
                            .set_expose_headers(cors_rule.expose_headers)
                            .set_max_age_seconds(cors_rule.max_age_seconds)
                            .build()?,
                    )
                    .build()?,
            )
            .bucket(bucket.clone())
            .send()
            .await
        {
            Ok(_) => {
                info!("为bucket: {}添加跨域设置成功", bucket);
                Ok(())
            }
            Err(err) => {
                error!("为bucket: {}添加跨域设置失败{:#?}", bucket, err);
                Err(Box::from(format!("添加跨域设置失败: {err:?}")))
            }
        }
    }
    /**
     * 删除跨域设置
     */
    pub(crate) async fn delete_bucket_cors(&self, bucket: String) -> Result<(), Box<dyn Error>> {
        info!("删除bucket: {}的跨域设置", bucket);
        match self
            .client
            .delete_bucket_cors()
            .bucket(bucket.clone())
            .send()
            .await
        {
            Ok(_) => {
                info!("删除bucket: {}的跨域设置成功", bucket);
                Ok(())
            }
            Err(err) => {
                error!("为bucket: {}添加跨域设置失败{:#?}", bucket, err);
                Err(Box::from(format!("添加跨域设置失败: {err:?}")))
            }
        }
    }
}
