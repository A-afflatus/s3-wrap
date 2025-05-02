use std::sync::OnceLock;
use tauri::AppHandle;

static APP: OnceLock<AppHandle> = OnceLock::new();
/// 设置app
pub fn set_app(app: AppHandle) {
    APP.set(app).expect("Failed to set app");
}
/// 获取app
pub fn get_app() -> &'static AppHandle {
    APP.get().expect("App not initialized")
}
