use directories::UserDirs;
use log::info;
use sqlx::sqlite::SqlitePool;
use sqlx::{Executor, Pool, Sqlite};
use std::sync::{Arc, OnceLock};
use tauri::async_runtime::block_on;
use tokio::fs;
use tokio::fs::File;

static SQL_LITE_POOL: OnceLock<Pool<Sqlite>> = OnceLock::new();
/**
 * 获取数据库连接池
 */
pub fn get_sql_lite_pool() -> &'static Pool<Sqlite> {
    SQL_LITE_POOL.get_or_init(|| {
        let pool = block_on(init()).expect("初始化数据库失败");
        pool
    })
}
async fn init() -> anyhow::Result<Pool<Sqlite>> {
    // 创建SQLite文件
    let db_path = file_path().await?;
    info!("数据库文件创建成功,db路径:{}", db_path.as_str());
    // 创建链接池
    let pool = SqlitePool::connect(db_path.as_str()).await?;
    info!("数据库连接池初始化成功");
    // 初始化sql
    sql_init(&pool).await?;
    info!("数据库初始化成功");
    Ok(pool)
}
/**
 * 创建sqlLite文件
 */
async fn file_path() -> anyhow::Result<String> {
    // 获取用户目录
    let user_dirs = UserDirs::new().expect("获取用户目录失败");
    // 获取用户的配置目录
    let config_dir = user_dirs.home_dir().join(".s3wap");
    // 创建配置目录（如果不存在）
    fs::create_dir_all(&config_dir).await?;
    let db_path = Arc::new(config_dir.join(".s3wap.db"));
    // 创建数据库文件
    if !fs::try_exists(db_path.clone().as_path()).await? {
        info!("数据库文件不存在，创建数据库文件");
        File::create(db_path.clone().as_path()).await?;
    }
    // 数据路路径
    Ok(format!("sqlite://{}", db_path.as_path().to_str().unwrap()))
}
/**
 * 初始化sql
 */
async fn sql_init(pool: &Pool<Sqlite>) -> anyhow::Result<()> {
    let create_table_sql = r#"
        CREATE TABLE IF NOT EXISTS credentials (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            access_key_id TEXT NOT NULL,
            secret_access_key TEXT NOT NULL,
            region TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            force_path_style INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS s3_transfer_task (
            id TEXT PRIMARY KEY,
            credential_id TEXT NOT NULL, -- 凭证id
            bucket TEXT NOT NULL, -- 桶
            file_key TEXT, -- 文件s3key
            file_path TEXT, -- 本地路径
            file_size INTEGER,-- 文件大小
            status TEXT NOT NULL DEFAULT 'queued', -- 状态 queued running completed failed
            created_time TEXT NOT NULL, -- 创建时间
            done_time TEXT, -- 完成时间
            task_type TEXT NOT NULL, -- 任务类型 download upload
            error_msg TEXT
        );
        CREATE TABLE IF NOT EXISTS app_service_time (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL, -- 日期 yyyy-MM-dd
            minutes INTEGER NOT NULL -- 分钟数
        );
    "#;
    pool.execute(create_table_sql).await?;
    Ok(())
}
