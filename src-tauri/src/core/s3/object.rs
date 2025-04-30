use crate::common::utils;
use crate::core::s3::credential::S3Credential;
use crate::core::s3::types::{S3GrantPermission, S3Grantee, S3StorageClass, S3Tag};
use aws_sdk_s3::config::http::HttpRequest;
use aws_sdk_s3::operation::head_object::HeadObjectOutput;
use aws_sdk_s3::operation::list_objects_v2::ListObjectsV2Output;
use aws_sdk_s3::presigning::PresigningConfig;
use aws_sdk_s3::types::{CommonPrefix, Object};
use aws_smithy_types::error::metadata::ProvideErrorMetadata;
use base64::Engine;
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;
use std::fmt::Debug;
use std::time::Duration;
use tokio::fs;

#[derive(Serialize, Deserialize, Debug)]
pub struct S3ObjectList {
    pub contents: Vec<S3Object>,
    pub common_prefixes: Vec<S3CommonPrefix>,
    pub continuation_token: Option<String>,
    pub next_continuation_token: Option<String>,
}
/// 对象详情S3ObjectDetail
#[derive(Serialize, Deserialize, Debug)]
pub struct S3ObjectDetail {
    //头信息
    pub head: Option<S3ObjectHeadInfo>,
    //标签集合
    pub tag_set: Option<Vec<S3Tag>>,
    //对象url
    pub url: Option<String>,
    //权限
    pub acl: Option<Vec<(Option<S3Grantee>, Option<S3GrantPermission>)>>,
}
///对象头信息
#[derive(Serialize, Deserialize, Debug)]
pub struct S3ObjectHeadInfo {
    // 对象最后修改时间
    pub last_modified: Option<String>,
    // 对象内容长度（字节数）
    pub content_length: Option<i64>,
    // ETag
    pub e_tag: Option<String>,
    // 版本ID
    pub version_id: Option<String>,
    // 内容类型（MIME类型）
    pub content_type: Option<String>,
    // 自定义元数据
    pub metadata: Option<::std::collections::HashMap<String, String>>,
    // 储存类型
    pub storage_class: Option<S3StorageClass>,
}
impl From<HeadObjectOutput> for S3ObjectHeadInfo {
    fn from(value: HeadObjectOutput) -> Self {
        Self {
            last_modified: value.last_modified.map(|x| x.to_string()),
            content_length: value.content_length,
            e_tag: value.e_tag,
            version_id: value.version_id,
            content_type: value.content_type,
            metadata: value.metadata,
            storage_class: value.storage_class.map(|x| x.into()),
        }
    }
}

impl From<ListObjectsV2Output> for S3ObjectList {
    fn from(value: ListObjectsV2Output) -> Self {
        S3ObjectList {
            contents: value
                .contents
                .unwrap_or_default()
                .into_iter()
                .map(|x| x.into())
                .collect(),
            common_prefixes: value
                .common_prefixes
                .unwrap_or_default()
                .into_iter()
                .map(|x| x.into())
                .collect(),
            continuation_token: value.continuation_token,
            next_continuation_token: value.next_continuation_token,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct S3Object {
    pub key: Option<String>,
    pub last_modified: Option<String>,
    pub e_tag: Option<String>,
    pub size: Option<i64>,
}
impl From<Object> for S3Object {
    fn from(value: Object) -> Self {
        S3Object {
            key: value.key,
            last_modified: value.last_modified.map(|x| x.to_string()),
            e_tag: value.e_tag,
            size: value.size,
        }
    }
}
#[derive(Serialize, Deserialize, Debug)]
pub struct S3CommonPrefix {
    pub prefix: Option<String>,
}
impl From<CommonPrefix> for S3CommonPrefix {
    fn from(value: CommonPrefix) -> Self {
        S3CommonPrefix {
            prefix: value.prefix,
        }
    }
}

impl S3Credential {
    /**
     * 文件检索
     */
    pub(crate) async fn list_objects(
        &self,
        bucket: String,
        max_keys: i32,
        prefix: Option<String>,
        continuation_token: Option<String>,
    ) -> Result<S3ObjectList, Box<dyn Error>> {
        let mut resp = self
            .client
            .list_objects_v2()
            .bucket(bucket)
            .delimiter("/".to_owned())
            .set_prefix(prefix)
            .max_keys(max_keys)
            .set_continuation_token(continuation_token)
            .into_paginator()
            .send();

        if let Some(result) = resp.next().await {
            match result {
                Ok(result) => Ok(result.into()),
                Err(err) => {
                    error!("查询对象列表失败: {:#?}", err);
                    Err(Box::from(err.message().unwrap_or(err.to_string().as_str())))
                }
            }
        } else {
            Err(Box::from("查询对象列表失败"))
        }
    }
    /**
     * 推对象
     */
    pub(crate) async fn put_object(
        &self,
        bucket: String,
        key: String,
        file_path: Option<String>,
    ) -> Result<(), Box<dyn Error>> {
        info!(
            "上传文件-bucket:{},key: {},file_path: {:?}",
            bucket, key, file_path
        );

        match file_path {
            Some(path) => {
                let mut metadata: HashMap<String, String> = HashMap::new();
                metadata.insert(
                    "S3Warp-Content-Type".to_string(),
                    utils::get_file_type(path.clone()),
                );
                let file_content = fs::read(&path).await?;
                self.client
                    .put_object()
                    .bucket(bucket)
                    .key(key)
                    .set_metadata(Some(metadata))
                    .body(file_content.into())
                    .send()
                    .await?;
            }
            None => {
                // 创建目录
                self.client
                    .put_object()
                    .bucket(bucket)
                    .key(key)
                    .send()
                    .await?;
            }
        }
        Ok(())
    }
    /**
     * 删除多个对象
     */
    pub(crate) async fn delete_objects(
        &self,
        bucket: String,
        keys: Vec<String>,
    ) -> Result<(), Box<dyn Error>> {
        info!("删除对象-bucket:{},keys:{:?}", bucket, keys);
        let delete_objects = self.client.delete_objects().bucket(bucket).delete(
            aws_sdk_s3::types::Delete::builder()
                .set_objects(Some(
                    keys.into_iter()
                        .map(|s| {
                            aws_sdk_s3::types::ObjectIdentifier::builder()
                                .key(s)
                                .build()
                        })
                        .collect::<Result<Vec<_>, _>>()?,
                ))
                .build()?,
        );
        match delete_objects
            .customize()
            .mutate_request(calculate_md5_checksum_and_remove_other_checksums)
            .send()
            .await
        {
            Ok(_) => {
                info!("删除对象成功");
            }
            Err(err) => {
                error!("删除对象失败{:#?}", err);
                if let Some(cord) = err.code() {
                    if cord == "NoSuchKey" {
                        return Err(Box::from("此bucket没有对象"));
                    }
                }
                return Err(Box::from(err.message().unwrap_or_default()));
            }
        };
        Ok(())
    }
    /**
     * 获取对象下载uri
     */
    pub(crate) async fn get_object_uri(
        &self,
        bucket: String,
        key: String,
        millis: u64,
    ) -> Result<String, Box<dyn Error>> {
        let obj = self
            .client
            .get_object()
            .bucket(bucket)
            .key(key)
            .presigned(PresigningConfig::expires_in(Duration::from_millis(millis))?)
            .await?;
        Ok(obj.uri().to_string())
    }
    /**
     * 对象详情
     */
    pub(crate) async fn get_object_info(
        &self,
        bucket: String,
        key: String,
    ) -> Result<S3ObjectDetail, Box<dyn Error>> {
        //权限
        let grants = match self
            .client
            .get_object_acl()
            .bucket(bucket.clone())
            .key(key.clone())
            .send()
            .await
        {
            Ok(resp) => {
                info!("Bucket:{},对象Key:{},ACL:{:?}", bucket, key, resp);
                resp.grants
            }
            Err(err) => {
                error!(
                    "Bucket:{},对象Key:{},获取对象ACL失败: {:#?}",
                    bucket, key, err
                );
                None
            }
        };
        let url = match self
            .client
            .get_object()
            .bucket(bucket.clone())
            .key(key.clone())
            .presigned(PresigningConfig::expires_in(Duration::from_secs(5 * 60))?)
            .await
        {
            Ok(resp) => {
                info!(
                    "Bucket:{},对象Key:{},对象下载地址:{:?}",
                    bucket,
                    key,
                    resp.uri()
                );
                Some(resp.uri().to_string())
            }
            Err(err) => {
                error!(
                    "Bucket:{},对象Key:{},获取对象下载地址失败: {:#?}",
                    bucket, key, err
                );
                None
            }
        };
        //标签
        let tag = match self
            .client
            .get_object_tagging()
            .bucket(bucket.clone())
            .key(key.clone())
            .send()
            .await
        {
            Ok(resp) => {
                info!("Bucket:{},对象Key:{},对象Tag:{:?}", bucket, key, resp);
                Some(resp.tag_set)
            }
            Err(err) => {
                error!(
                    "Bucket:{},对象Key:{},获取对象Tag失败: {:#?}",
                    bucket, key, err
                );
                None
            }
        };
        //基本信息、不包括权限
        let head = match self
            .client
            .head_object()
            .bucket(bucket.clone())
            .key(key.clone())
            .send()
            .await
        {
            Ok(resp) => {
                info!("Bucket:{},对象Key:{},对象Head:{:?}", bucket, key, resp);
                Some(resp)
            }
            Err(err) => {
                error!(
                    "Bucket:{},对象Key:{},获取对象Head失败: {:#?}",
                    bucket, key, err
                );
                None
            }
        };
        Ok(S3ObjectDetail {
            head: head.map(|x| x.into()),
            url,
            tag_set: tag.map(|list| list.iter().map(|x| x.into()).collect()),
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
}

fn calculate_md5_checksum_and_remove_other_checksums(http_request: &mut HttpRequest) {
    let remove_headers = http_request.headers().clone();
    let remove_headers: Vec<(&str, &str)> = remove_headers
        .iter()
        .filter(|(name, _)| {
            name.starts_with("x-amz-checksum") || name.starts_with("x-amz-sdk-checksum")
        })
        .collect();

    for (name, _) in remove_headers {
        http_request.headers_mut().remove(name);
    }

    if let Some(bytes) = http_request.body().bytes() {
        let md5 = md5::compute(bytes);
        let checksum_value = base64::engine::general_purpose::STANDARD.encode(md5.as_slice());
        http_request
            .headers_mut()
            .append("Content-MD5", checksum_value);
    }
}
