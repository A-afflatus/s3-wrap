mod common;
mod control;
mod core;
mod middleware;
mod task;
use task::service_time;

use self::core::s3::credential;
use control::{cmd, setup};
use control::commands::{s3 as s3_commands, task as task_commands};
use middleware::sqlite;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    //初始化数据库
    sqlite::get_sql_lite_pool();
    //启动服务计时
    let _ = service_time::run();
    //初始化凭证
    credential::get_s3_pool();
    //启动ui
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            cmd::view_reload,
            cmd::view_url,
            cmd::view_go_forward,
            cmd::view_go_back,
            cmd::close_window,
            s3_commands::save_credential,
            s3_commands::get_buckets,
            s3_commands::list_objects,
            s3_commands::create_bucket,
            s3_commands::put_object,
            s3_commands::delete_objects,
            s3_commands::delete_bucket,
            s3_commands::get_object_url,
            s3_commands::get_bucket_info,
            s3_commands::put_bucket_cors,
            s3_commands::delete_bucket_cors,
            s3_commands::get_object_info,
            task_commands::create_download_task,
            task_commands::create_upload_task,
            task_commands::run_task,
            task_commands::cancel_task
        ])
        .setup(setup::init)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
