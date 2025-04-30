use aws_sdk_s3::types::{CorsRule, Grantee, Permission, StorageClass, Tag};
use serde::{Deserialize, Serialize};
use std::fmt::Display;

///跨域规则
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct S3CorsRule {
    pub id: Option<String>,
    //允许的标头
    pub allowed_headers: Option<Vec<String>>,
    //允许的请求方式
    pub allowed_methods: Vec<String>,
    //允许的源
    pub allowed_origins: Vec<String>,
    //暴露的标头
    pub expose_headers: Option<Vec<String>>,
    //浏览器缓存指定资源的印前检查响应的时间（以秒为单位）。
    pub max_age_seconds: Option<i32>,
}
impl From<&CorsRule> for S3CorsRule {
    fn from(value: &CorsRule) -> Self {
        Self {
            id: value.id.clone(),
            allowed_headers: value.allowed_headers.clone(),
            allowed_methods: value.allowed_methods.clone(),
            allowed_origins: value.allowed_origins.clone(),
            expose_headers: value.expose_headers.clone(),
            max_age_seconds: value.max_age_seconds.clone(),
        }
    }
}
///ACL
#[derive(Serialize, Deserialize, Debug)]
pub struct S3Grantee {
    pub id: Option<String>,
    //被授权者名称
    pub display_name: Option<String>,
    //被授权者电子邮件地址。
    pub email_address: Option<String>,
    //被授权者组的 URI。
    pub uri: Option<String>,
}
impl From<Grantee> for S3Grantee {
    fn from(value: Grantee) -> Self {
        Self {
            id: value.id.clone(),
            display_name: value.display_name.clone(),
            email_address: value.email_address.clone(),
            uri: value.uri.clone(),
        }
    }
}
///权限
#[derive(Serialize, Deserialize, Debug)]
pub enum S3GrantPermission {
    //完全控制
    FullControl,
    //读
    Read,
    //读ACP
    ReadAcp,
    //写
    Write,
    //写ACP
    WriteAcp,
    Other(String),
}
impl From<Permission> for S3GrantPermission {
    fn from(value: Permission) -> Self {
        match value {
            Permission::FullControl => S3GrantPermission::FullControl,
            Permission::Read => S3GrantPermission::Read,
            Permission::ReadAcp => S3GrantPermission::ReadAcp,
            Permission::Write => S3GrantPermission::Write,
            Permission::WriteAcp => S3GrantPermission::WriteAcp,
            _ => S3GrantPermission::Other(value.to_string()),
        }
    }
}
impl Display for S3GrantPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let str = match self {
            S3GrantPermission::FullControl => "FULL_CONTROL".to_string(),
            S3GrantPermission::Read => "READ".to_string(),
            S3GrantPermission::ReadAcp => "READ_ACP".to_string(),
            S3GrantPermission::Write => "WRITE".to_string(),
            S3GrantPermission::WriteAcp => "WRITE_ACP".to_string(),
            S3GrantPermission::Other(value) => value.clone(),
        };
        write!(f, "{}", str)
    }
}
///标签信息
#[derive(Serialize, Deserialize, Debug)]
pub struct S3Tag {
    pub key: String,
    pub value: String,
}
impl From<&Tag> for S3Tag {
    fn from(value: &Tag) -> Self {
        Self {
            key: value.key.clone(),
            value: value.value.clone(),
        }
    }
}
///对象储存类型
#[derive(Serialize, Deserialize, Debug)]
pub enum S3StorageClass {
    // 深度归档存储类，适用于极少访问的数据长期存储
    DeepArchive,
    // 快速单区域存储类，提供低延迟访问
    ExpressOnezone,
    // 冰川存储类，适用于长期存档且很少访问的数据
    Glacier,
    // 冰川即时检索存储类，提供快速检索的存档数据
    GlacierIr,
    // 智能分层存储类，根据访问模式自动优化存储成本
    IntelligentTiering,
    // 单区域不频繁访问存储类，平衡存储成本和访问性能
    OnezoneIa,
    // 本地扩展存储类，用于AWS Outposts环境
    Outposts,
    // 降低冗余存储类(不推荐使用)，提供较低冗余级别的存储
    ReducedRedundancy,
    // Snow存储类，适用于AWS Snow系列设备
    Snow,
    // 标准存储类，适用于频繁访问的数据
    Standard,
    // 标准不频繁访问存储类，适用于不经常访问但需要快速检索的数据
    StandardIa,
    //其他
    Other(String),
}
impl From<StorageClass> for S3StorageClass {
    fn from(value: StorageClass) -> Self {
        match value {
            StorageClass::DeepArchive => S3StorageClass::DeepArchive,
            StorageClass::ExpressOnezone => S3StorageClass::ExpressOnezone,
            StorageClass::Glacier => S3StorageClass::Glacier,
            StorageClass::GlacierIr => S3StorageClass::GlacierIr,
            StorageClass::IntelligentTiering => S3StorageClass::IntelligentTiering,
            StorageClass::OnezoneIa => S3StorageClass::OnezoneIa,
            StorageClass::Outposts => S3StorageClass::Outposts,
            StorageClass::ReducedRedundancy => S3StorageClass::ReducedRedundancy,
            StorageClass::Snow => S3StorageClass::Snow,
            StorageClass::Standard => S3StorageClass::Standard,
            StorageClass::StandardIa => S3StorageClass::StandardIa,
            _ => S3StorageClass::Other(value.to_string()),
        }
    }
}
impl Display for S3StorageClass {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let str = match self {
            S3StorageClass::DeepArchive => "DEEP_ARCHIVE".to_string(),
            S3StorageClass::ExpressOnezone => "EXPRESS_ONEZONE".to_string(),
            S3StorageClass::Glacier => "GLACIER".to_string(),
            S3StorageClass::GlacierIr => "GLACIER_IR".to_string(),
            S3StorageClass::IntelligentTiering => "INTELLIGENT_TIERING".to_string(),
            S3StorageClass::OnezoneIa => "ONEZONE_IA".to_string(),
            S3StorageClass::Outposts => "OUTPOSTS".to_string(),
            S3StorageClass::ReducedRedundancy => "REDUCED_REDUNDANCY".to_string(),
            S3StorageClass::Snow => "SNOW".to_string(),
            S3StorageClass::Standard => "STANDARD".to_string(),
            S3StorageClass::StandardIa => "STANDARD_IA".to_string(),
            S3StorageClass::Other(value) => value.clone(),
        };
        write!(f, "{}", str)
    }
}
