use crate::common::cnet::NetResult;
use crate::core::task::task::{get_task_order_channel, Task, TaskOrder, TaskType};
use directories::UserDirs;
use lazy_static::lazy_static;
use log::info;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::async_runtime::block_on;
use tauri::command;


lazy_static! {
     //初始化下载目录变量
    pub static ref DOWNLOAD_DIR: String = {
        let user_dirs = UserDirs::new().unwrap();
        let download_dir = user_dirs.download_dir().unwrap();
        let path = Path::new(download_dir);
        let path_str = path.to_str().unwrap();
        path_str.to_string()
    };
}
/**
* 执行任务
*/
#[command]
pub fn run_task(id: String) -> NetResult<()> {
    block_on(async move {
        tokio::spawn(async move {
            match Task::from_id(id.clone()).await {
                Ok(Some(task)) => {
                    if let Err(e) = task.run_task().await {
                        log::error!("任务执行失败: {:#?}", e);
                    }
                }
                Ok(None) => {
                    log::warn!("未找到任务: {}", id);
                }
                Err(e) => {
                    log::error!("获取任务失败: {:#?}", e);
                }
            }
        });
        NetResult::ok_empty()
    })
}
/**
* 取消任务
*/
#[command]
pub fn cancel_task(id: String) -> NetResult<()> {
    info!("取消任务: {}", id);
    block_on(async move {
        let (tx, _) = get_task_order_channel().await;
        tx.send(TaskOrder::CANCEL(id)).ok();
        NetResult::ok_empty()
    })
}
/**
* 创建对象下载任务
*/
#[command]
pub fn create_upload_task(
    id: String,
    bucket: String,
    base_path: String,
    file_list: Vec<String>,
) -> NetResult<()> {
    block_on(async move {
        //插入下载任务表
        for file_path in file_list.iter() {
            let path = base_path.clone();
            let file_name = file_path.split("/").last().unwrap();
            //计算文件大小
            let file_size = match std::fs::metadata(file_path) {
                Ok(metadata) => metadata.len(),
                Err(_) => 0,
            };
            let task = Task::new(
                id.clone(),
                bucket.clone(),
                String::from(path + file_name),
                file_path.to_string(),
                file_size as i64,
                TaskType::UPLOAD,
            );
            if let Ok(_) = task.save().await {
                let _ = tokio::spawn(async move { task.run_task().await });
            }
        }
        info!("插入下载任务表成功");
        //发送执行消息
        NetResult::ok_empty()
    })
}
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UploadKey {
    pub key: String,
    pub size: i64,
}
/**
* 创建对象上传任务
*/
#[command]
pub fn create_download_task(id: String, bucket: String, keys: Vec<UploadKey>) -> NetResult<()> {
    block_on(async move {
        //插入下载任务表
        for obj in keys.iter() {
            let key = obj.key.clone();
            let file_name = key.split("/").last().unwrap();
            let mut file_path = PathBuf::from(DOWNLOAD_DIR.clone()).join(file_name);
            //看file_path是否存在文件，如果存在，在名称前面添加一个uuid
            if file_path.exists() {
                file_path = PathBuf::from(DOWNLOAD_DIR.clone()).join(format!(
                    "{}-{}",
                    uuid::Uuid::new_v4().simple(),
                    file_name
                ));
            }
            let task = Task::new(
                id.clone(),
                bucket.clone(),
                key.clone(),
                file_path.to_str().unwrap().to_string(),
                obj.size,
                TaskType::DOWNLOAD,
            );
            if let Ok(_) = task.save().await {
                let _ = tokio::spawn(async move { task.run_task().await });
            }
        }
        info!("插入下载任务表成功");
        //发送执行消息
        NetResult::ok_empty()
    })
}
