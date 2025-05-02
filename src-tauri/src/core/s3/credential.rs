use crate::middleware::sqlite;
use anyhow::anyhow;
use aws_sdk_s3::config::Credentials;
use aws_sdk_s3::config::{Region, RequestChecksumCalculation, ResponseChecksumValidation};
use aws_sdk_s3::Client;
use aws_sdk_s3::Config;
use aws_smithy_types::retry::{RetryConfig, RetryMode};
use log::{info, warn};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::collections::HashMap;
use std::error::Error;
use std::sync::{Arc, OnceLock};
use std::time::Duration;
use tokio::sync::RwLock;

static S3_POOL: OnceLock<Arc<RwLock<HashMap<String, Arc<S3Credential>>>>> = OnceLock::new();
pub fn get_s3_pool() -> &'static RwLock<HashMap<String, Arc<S3Credential>>> {
    S3_POOL.get_or_init(|| {
        let pool = Arc::new(RwLock::new(HashMap::new()));
        info!("S3凭证池加载完成");
        pool
    })
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow, Clone)]
pub struct CredentialStorage {
    pub id: String,
    pub name: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    pub endpoint: String,
    pub force_path_style: bool,
}
#[derive(Debug)]
pub struct S3Credential {
    pub id: String,
    pub name: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub region: String,
    pub endpoint: String,
    pub force_path_style: bool,
    pub client: Client,
}
impl S3Credential {
    /// 预加载凭证信息
    pub async fn preload(value: CredentialStorage) -> anyhow::Result<S3Credential> {
        // 创建 AWS 凭证
        let credentials = Credentials::new(
            &value.access_key_id,
            &value.secret_access_key,
            None,
            None,
            "custom",
        );
        // 验证 S3 客户端
        let client = Client::from_conf(
            Config::builder()
                .region(Region::new(value.region.to_string()))
                .credentials_provider(credentials.clone())
                .endpoint_url(&value.endpoint)
                .force_path_style(value.force_path_style)
                .timeout_config(
                    aws_sdk_s3::config::timeout::TimeoutConfigBuilder::new()
                        .connect_timeout(Duration::from_secs(20))
                        .read_timeout(Duration::from_secs(20))
                        .operation_timeout(Duration::from_secs(20))
                        .build(),
                )
                .request_checksum_calculation(RequestChecksumCalculation::WhenRequired)
                .response_checksum_validation(ResponseChecksumValidation::WhenRequired)
                .behavior_version_latest()
                .build(),
        );
        //验证客户端
        match client.list_buckets().send().await {
            Ok(_) => {}
            Err(e) => {
                log::error!("S3连接失败: {:#?}", e);
                return Err(anyhow!("S3连接失败"));
            }
        }
        //创建使用的s3客户端
        let client = Client::from_conf(
            Config::builder()
                .region(Region::new(value.region.to_string()))
                .credentials_provider(credentials)
                .endpoint_url(&value.endpoint)
                .force_path_style(value.force_path_style)
                .timeout_config(
                    aws_sdk_s3::config::timeout::TimeoutConfigBuilder::new()
                        .connect_timeout(Duration::from_secs(60))
                        .read_timeout(Duration::from_secs(60))
                        .operation_timeout(Duration::from_secs(60))
                        .build(),
                )
                .retry_config(RetryConfig::standard().with_retry_mode(RetryMode::Standard))
                .request_checksum_calculation(RequestChecksumCalculation::WhenRequired)
                .response_checksum_validation(ResponseChecksumValidation::WhenRequired)
                .behavior_version_latest()
                .build(),
        );

        Ok(S3Credential {
            id: value.id,
            name: value.name,
            access_key_id: value.access_key_id,
            secret_access_key: value.secret_access_key,
            region: value.region,
            endpoint: value.endpoint,
            force_path_style: value.force_path_style,
            client,
        })
    }
    /// 保存凭证信息
    pub(crate) async fn save_credential(&self) -> Result<(), Box<dyn Error>> {
        let mut conn = sqlite::get_sql_lite_pool().acquire().await?;

        let count: i64 =
            sqlx::query(r#"SELECT count(1) FROM credentials WHERE name = ?1 and id != ?2"#)
                .bind(&self.name)
                .bind(&self.id)
                .fetch_one(&mut *conn)
                .await?
                .get(0);
        if count > 0 {
            warn!("凭证名称已存在");
            return Err(Box::from(String::from("凭证名称已存在")));
        }
        let rows_affected= sqlx::query(r#"UPDATE credentials SET name = ?1,access_key_id = ?2,secret_access_key = ?3,region = ?4,endpoint = ?5,force_path_style = ?6 WHERE id = ?7"#)
            .bind(&self.name)
            .bind(&self.access_key_id)
            .bind(&self.secret_access_key)
            .bind(&self.region)
            .bind(&self.endpoint)
            .bind(&self.force_path_style)
            .bind(&self.id)
            .execute(&mut *conn)
            .await?.rows_affected();

        if rows_affected == 0 {
            sqlx::query(r#"INSERT INTO credentials ( id,name,access_key_id,secret_access_key,region,endpoint,force_path_style)VALUES ( ?1,?2,?3 ,?4,?5,?6,?7)"#)
                .bind(&self.id)
                .bind(&self.name)
                .bind(&self.access_key_id)
                .bind(&self.secret_access_key)
                .bind(&self.region)
                .bind(&self.endpoint)
                .bind(&self.force_path_style)
                .execute(&mut *conn)
                .await?;
        }
        Ok(())
    }
}
