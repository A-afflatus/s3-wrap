use directories::UserDirs;
use log::{error, info};
use std::collections::HashMap;
use std::error::Error;
use std::str::from_utf8;
use std::sync::{Arc, OnceLock};
use tauri::Wry;
use tauri_plugin_os::platform;
use tauri_plugin_store::{Store, StoreExt};
use tokio::fs;
use tokio::fs::File;

pub static SETTINGS_JSON: &[u8] = include_bytes!("../../config/settings.json");
pub static APP_STORE: OnceLock<Arc<Store<Wry>>> = OnceLock::new();
pub async fn init(app: &mut tauri::App) -> Result<(), Box<dyn Error>> {
    info!("开始初始化应用 store");
    // 解析 JSON 字符串为 HashMap
    let settings_map: HashMap<String, serde_json::Value> =
        serde_json::from_str(from_utf8(SETTINGS_JSON)?)?;

    if let Ok(path) = file_path().await {
        if let Ok(store) = app.store(path) {
            store.set("os_platform", platform());
            for (k, v) in settings_map {
                if !store.has(k.clone()) {
                    store.set(k, v);
                }
            }
            if let Ok(_) = APP_STORE.set(store) {
                info!("初始化应用 store 成功");
                return Ok(());
            }
        }
    }
    error!("初始化应用 store 失败");
    Err("初始化应用 store 失败".into())
}

/**
 * 创建sqlLite文件
 */
async fn file_path() -> anyhow::Result<String> {
    let user_dirs = UserDirs::new().expect("获取用户目录失败");
    let config_dir = user_dirs.home_dir().join(".s3wap");
    fs::create_dir_all(&config_dir).await?;
    let store_path = Arc::new(config_dir.join(".s3wap.json"));
    if !fs::try_exists(store_path.clone().as_path()).await? {
        info!("应用store文件不存在，创建store文件");
        File::create(store_path.clone().as_path()).await?;
    }
    Ok(store_path.as_path().to_str().unwrap().to_string())
}
