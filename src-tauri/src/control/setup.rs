use crate::middleware::store;
use crate::middleware::app_context;
use log::info;
use tauri::async_runtime::block_on;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Theme,
};
use tauri::{App, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_updater::UpdaterExt;

pub fn init(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    app_context::set_app(app.handle().clone());
    block_on(async {
        store::init(app).await.unwrap();
    });
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        update(handle).await.unwrap();
    });
    // ! 系统推盘
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit_i])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            _ => {
                info!("menu item {:?} clicked", event.id)
            }
        })
        .build(app)?;
    //主题
    let mut app_theme = Theme::Light;
    if let Some(store) = store::APP_STORE.get() {
        if let Some(theme) = store.get("settings.appearance.theme") {
            if theme.eq("Dark") {
                app_theme = Theme::Dark;
            }
        }
    }

    // ! 窗口
    let _win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title("s3-wrap")
        .resizable(true)
        .inner_size(1100.0, 800.0)
        // .min_inner_size(1100.0, 800.0)
        .theme(Some(app_theme))
        .build()
        .expect("创建主窗口失败");
    Ok(())
}
async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;

        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    info!("downloaded {downloaded} from {content_length:?}");
                },
                || {
                    info!("download finished");
                },
            )
            .await?;

        info!("update installed");
        app.restart();
    }
    Ok(())
}
