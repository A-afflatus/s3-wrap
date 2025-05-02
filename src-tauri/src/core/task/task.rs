use crate::common::utils;
use crate::core::s3::credential::{get_s3_pool, S3Credential};
use crate::middleware::app_context::get_app;
use crate::middleware::sqlite::get_sql_lite_pool;
use crate::middleware::store::APP_STORE;
use aws_sdk_s3::operation::create_multipart_upload::CreateMultipartUploadOutput;
use aws_sdk_s3::types::{CompletedMultipartUpload, CompletedPart};
use aws_smithy_types::byte_stream::{ByteStream, Length};
use aws_smithy_types::error::metadata::ProvideErrorMetadata;
use chrono::Local;
use log::{error, info, warn};
use sqlx::FromRow;
use tauri_plugin_notification::NotificationExt;
use std::collections::HashMap;
use tokio::io::AsyncWriteExt;
use tokio::sync::{broadcast, OnceCell};

//传输块大小
const CHUNK_SIZE: u64 = 1024 * 1024 * 5;
//最大块数
const MAX_CHUNKS: u64 = 10000;

static CHANNEL: OnceCell<(broadcast::Sender<TaskOrder>, broadcast::Receiver<TaskOrder>)> =
    OnceCell::const_new();
pub async fn get_task_order_channel(
) -> &'static (broadcast::Sender<TaskOrder>, broadcast::Receiver<TaskOrder>) {
    CHANNEL
        .get_or_init(|| async { broadcast::channel(1) })
        .await
}
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum TaskOrder {
    // 取消任务
    CANCEL(String),
    // 暂停任务：暂未实现
    STOP(String),
}

#[derive(Debug)]
pub enum TaskType {
    UPLOAD,
    DOWNLOAD,
}
impl TaskType {
    pub fn to_string(&self) -> String {
        match self {
            TaskType::UPLOAD => "upload".to_string(),
            TaskType::DOWNLOAD => "download".to_string(),
        }
    }
    pub fn from_string(s: &str) -> Option<TaskType> {
        match s {
            "upload" => Some(TaskType::UPLOAD),
            "download" => Some(TaskType::DOWNLOAD),
            _ => None,
        }
    }
    pub fn get_task_type_name(self) -> String {
        match self {
            TaskType::UPLOAD => "上传".to_string(),
            TaskType::DOWNLOAD => "下载".to_string(),
        }
    }
}

#[derive(Debug)]
pub enum TaskStatus {
    QUEUED,
    RUNNING,
    COMPLETED,
    FAILED,
}
impl TaskStatus {
    pub fn to_string(&self) -> String {
        match self {
            TaskStatus::QUEUED => "queued".to_string(),
            TaskStatus::RUNNING => "running".to_string(),
            TaskStatus::COMPLETED => "completed".to_string(),
            TaskStatus::FAILED => "failed".to_string(),
        }
    }
}

#[derive(Debug, FromRow)]
pub struct Task {
    pub id: String,
    pub credential_id: String,
    pub bucket: String,
    pub file_key: String,
    pub file_path: String,
    pub file_size: Option<i64>,
    pub status: String,
    pub created_time: String,
    pub done_time: Option<String>,
    pub task_type: String,
    pub error_msg: Option<String>,
}

impl Task {
    pub fn new(
        credential_id: String,
        bucket: String,
        file_key: String,
        file_path: String,
        file_size: i64,
        task_type: TaskType,
    ) -> Self {
        Task {
            id: uuid::Uuid::new_v4().simple().to_string(),
            credential_id,
            bucket,
            file_key,
            file_path,
            file_size: Some(file_size),
            status: TaskStatus::QUEUED.to_string(),
            created_time: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            done_time: None,
            task_type: task_type.to_string(),
            error_msg: None,
        }
    }
    pub async fn from_id(id: String) -> anyhow::Result<Option<Self>> {
        let pool = get_sql_lite_pool();
        let mut conn = pool.acquire().await?;
        let task  = sqlx::query_as::<_, Task>(
            r#"SELECT id, credential_id, bucket, file_key, file_path, file_size, status, created_time, done_time, task_type, error_msg FROM s3_transfer_task WHERE id = ?"# )
            .bind(&id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(task)
    }
    pub async fn save(&self) -> anyhow::Result<()> {
        let pool = get_sql_lite_pool();
        let mut conn = pool.acquire().await?;
        sqlx::query(r#"INSERT INTO s3_transfer_task (id, credential_id, bucket, file_key, file_path, file_size, status, created_time, done_time, task_type, error_msg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#)
            .bind(&self.id)
            .bind(&self.credential_id)
            .bind(&self.bucket)
            .bind(&self.file_key)
            .bind(&self.file_path)
            .bind(&self.file_size)
            .bind(&self.status)
            .bind(&self.created_time)
            .bind(&self.done_time)
            .bind(&self.task_type)
            .bind(&self.error_msg)
            .execute(&mut *conn)
           .await?;
        //删除旧数据
        if let Some(clear_transfer) = APP_STORE
            .get()
            .unwrap()
            .get("settings.storage.clearTransfer")
        {
            let clear_value = clear_transfer.as_i64().unwrap();
            let result = sqlx::query(r#"delete from s3_transfer_task where id in (select id from s3_transfer_task where task_type = ? order by id limit ?) and (select count(1) from s3_transfer_task where task_type = ?) >= ?"#)
                .bind(&self.task_type)
                .bind(clear_value/4)
                .bind(&self.task_type)
                .bind(clear_value)
                .execute(&mut *conn)
                .await?;
            if result.rows_affected() > 0 {
                info!("触发旧数据清除-删除旧数据:{}条", result.rows_affected());
            }
        }
        Ok(())
    }

    pub async fn run_task(&self) -> anyhow::Result<()> {
        // 任务状态
        if !TaskStatus::QUEUED.to_string().eq(&self.status) {
            warn!("任务状态非队列中不处理:{}", &self.id);
            return Ok(());
        }
        let task_type = TaskType::from_string(&self.task_type);
        if task_type.is_none() {
            warn!("任务类型错误:{}", &self.id);
            return Ok(());
        }
        let pool = get_sql_lite_pool();
        let mut conn = pool.acquire().await?;
        let s3map = get_s3_pool().read().await;
        // 获取凭证
        let credential = s3map.get(&self.credential_id);

        if credential.is_none() {
            warn!("凭证不存在:{}", &self.id);
            sqlx::query(r#"UPDATE s3_transfer_task SET status = ?, error_msg = ? WHERE id = ?"#)
                .bind(TaskStatus::FAILED.to_string())
                .bind("凭证不存在".to_string())
                .bind(&self.id)
                .execute(&mut *conn)
                .await?;
            return Ok(());
        }
        let credential = credential.unwrap();
        //校验bucket存不存在
        if credential
            .client
            .head_bucket()
            .bucket(&self.bucket)
            .send()
            .await
            .is_err()
        {
            warn!("bucket不存在:{}", &self.id);
            sqlx::query(r#"UPDATE s3_transfer_task SET status = ?, error_msg = ? WHERE id = ?"#)
                .bind(TaskStatus::FAILED.to_string())
                .bind("bucket不存在".to_string())
                .bind(&self.id)
                .execute(&mut *conn)
                .await?;
            return Ok(());
        }
        //改成running
        sqlx::query(r#"UPDATE s3_transfer_task SET status = ? WHERE id = ?"#)
            .bind(TaskStatus::RUNNING.to_string())
            .bind(&self.id)
            .execute(&mut *conn)
            .await?;
        let result = match task_type.unwrap() {
            TaskType::UPLOAD => self.upload_file(credential).await,
            TaskType::DOWNLOAD => self.download_file(credential).await,
        };
        match result {
            Ok(_) => {
                info!("任务完成:{}", &self.id);
                sqlx::query(
                    r#"UPDATE s3_transfer_task SET status = ?, done_time = ? WHERE id = ?"#,
                )
                .bind(TaskStatus::COMPLETED.to_string())
                .bind(Local::now().format("%Y-%m-%d %H:%M:%S").to_string())
                .bind(&self.id)
                .execute(&mut *conn)
                .await?;
                get_app().clone()
                    .notification()
                    .builder()
                    .title("传输任务已完成")
                    .body(format!("文件“{}”已{}成功", &self.file_key, TaskType::from_string(&self.task_type).unwrap().get_task_type_name()))
                    .show()
                    .unwrap();
            }
            Err(e) => {
                error!("任务失败:{},{:#?}", &self.id, e);
                sqlx::query(
                    r#"UPDATE s3_transfer_task SET status = ?, error_msg = ? WHERE id = ?"#,
                )
                .bind(TaskStatus::FAILED.to_string())
                .bind(e.to_string())
                .bind(&self.id)
                .execute(&mut *conn)
                .await?;
                get_app().clone()
                    .notification()
                    .builder()
                    .title("传输任务失败")
                    .body(format!("文件“{}”{}失败", &self.file_key, TaskType::from_string(&self.task_type).unwrap().get_task_type_name()))
                    .show()
                    .unwrap();
            }
        }
        Ok(())
    }
    /**
     * 上传文件
     */
    pub async fn upload_file(&self, credential: &S3Credential) -> anyhow::Result<()> {
        //查询file_path存不存在
        let file_exist = tokio::fs::try_exists(&self.file_path).await?;
        if !file_exist {
            warn!("文件不存在:{}", &self.id);
            return Err(anyhow::anyhow!("文件不存在"));
        }
        let mut metadata: HashMap<String, String> = HashMap::new();
        metadata.insert(
            "S3Warp-Content-Type".to_string(),
            utils::get_file_type(self.file_path.clone()),
        );

        let file_size = tokio::fs::metadata(&self.file_path).await?.len();

        let mut chunk_count = (file_size / CHUNK_SIZE) + 1;
        let mut size_of_last_chunk = file_size % CHUNK_SIZE;
        if size_of_last_chunk == 0 {
            size_of_last_chunk = CHUNK_SIZE;
            chunk_count -= 1;
        }
        if file_size == 0 {
            warn!("错误的文件大小:{}", &self.id);
            return Err(anyhow::anyhow!("错误的文件大小"));
        }
        if chunk_count > MAX_CHUNKS {
            warn!("暂不支持上传入参大的文件:{}", &self.id);
            return Err(anyhow::anyhow!("暂不支持上传入参大的文件",));
        }
        // 小于4个块 也就是20mb直接上传
        if chunk_count < 5 {
            info!("文件不大，直接上传文件:{}", &self.id);
            return match credential
                .client
                .put_object()
                .bucket(&self.bucket)
                .key(&self.file_key)
                .set_metadata(Some(metadata))
                .body(ByteStream::from_path(&self.file_path).await?)
                .send()
                .await
            {
                Ok(_) => Ok(()),
                Err(e) => Err(anyhow::anyhow!(e.to_string())),
            };
        }
        // 开始分段上传
        info!("执行分段上传文件:{}", &self.id);
        let mut upload_parts: Vec<CompletedPart> = Vec::new();

        let multipart_upload_res: CreateMultipartUploadOutput = credential
            .client
            .create_multipart_upload()
            .bucket(&self.bucket)
            .set_metadata(Some(metadata))
            .key(&self.file_key)
            .send()
            .await?;

        let upload_id = multipart_upload_res.upload_id().expect("创建分段上传失败");

        //监听任务命令
        let (tx, _rx) = get_task_order_channel().await;
        let mut rx2 = tx.subscribe();

        for chunk_index in 0..chunk_count {
            if let Ok(TaskOrder::CANCEL(id)) = rx2.try_recv() {
                if id == self.id {
                    info!("用户取消上传:{}", &self.id);
                    //从管道获取 取消下载指令
                    credential
                        .client
                        .abort_multipart_upload()
                        .bucket(&self.bucket)
                        .key(&self.file_key)
                        .upload_id(upload_id)
                        .send()
                        .await
                        .ok();
                    return Err(anyhow::anyhow!("用户取消"));
                }
            }
            let this_chunk = if chunk_count - 1 == chunk_index {
                size_of_last_chunk
            } else {
                CHUNK_SIZE
            };
            let stream = ByteStream::read_from()
                .path(&self.file_path)
                .offset(chunk_index * CHUNK_SIZE)
                .length(Length::Exact(this_chunk))
                .build()
                .await?;

            // 块索引需要从 0 开始，但部件号从 1 开始。
            let part_number = (chunk_index as i32) + 1;
            let upload_part_res = credential
                .client
                .upload_part()
                .key(&self.file_key)
                .bucket(&self.bucket)
                .upload_id(upload_id)
                .body(stream)
                .part_number(part_number)
                .send()
                .await?;

            upload_parts.push(
                CompletedPart::builder()
                    .e_tag(upload_part_res.e_tag.unwrap_or_default())
                    .part_number(part_number)
                    .build(),
            );
        }

        // 完成分段上传
        let completed_multipart_upload: CompletedMultipartUpload =
            CompletedMultipartUpload::builder()
                .set_parts(Some(upload_parts))
                .build();

        credential
            .client
            .complete_multipart_upload()
            .bucket(&self.bucket)
            .key(&self.file_key)
            .multipart_upload(completed_multipart_upload)
            .upload_id(upload_id)
            .send()
            .await?;
        Ok(())
    }
    /**
     * 下载文件
     */
    pub async fn download_file(&self, credential: &S3Credential) -> anyhow::Result<()> {
        //去掉文件名获取文件所在目录
        let file_path = self.file_path.split('/').collect::<Vec<_>>();
        //抛弃最后一个元素
        let file_path = file_path[0..file_path.len() - 1].join("/");
        //文件目录存不存在
        if !tokio::fs::try_exists(file_path.clone()).await? {
            tokio::fs::create_dir_all(file_path).await?;
        }
        let mut file = tokio::fs::File::create_new(&self.file_path)
            .await
            .map_err(|err| anyhow::anyhow!(format!("创建目标文件失败: {err:?}")))?;
        match credential
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(&self.file_key)
            .send()
            .await
        {
            Ok(res) => {
                let file_size: u64 = res.content_length.unwrap_or_default() as u64;
                //按文件大小分块
                let mut chunk_count = (file_size / CHUNK_SIZE) + 1;
                let mut size_of_last_chunk = file_size % CHUNK_SIZE;
                if size_of_last_chunk == 0 {
                    size_of_last_chunk = CHUNK_SIZE;
                    chunk_count -= 1;
                }
                //监听任务命令
                let (tx, _) = get_task_order_channel().await;
                let mut rx2 = tx.subscribe();
                for chunk_index in 0..chunk_count {
                    if let Ok(TaskOrder::CANCEL(id)) = rx2.try_recv() {
                        if id == self.id {
                            return Err(anyhow::anyhow!("用户取消"));
                        }
                    }
                    let this_chunk = if chunk_count - 1 == chunk_index {
                        size_of_last_chunk
                    } else {
                        CHUNK_SIZE
                    };
                    let mut object = credential
                        .client
                        .get_object()
                        .bucket(&self.bucket)
                        .key(&self.file_key)
                        .range(format!(
                            "bytes={}-{}",
                            chunk_index * CHUNK_SIZE,
                            chunk_index * CHUNK_SIZE + this_chunk - 1
                        ))
                        .send()
                        .await?;
                    let mut this_bytes = Vec::with_capacity(this_chunk as usize);
                    while let Some(bytes) = object
                        .body
                        .try_next()
                        .await
                        .map_err(|err| anyhow::anyhow!(format!("下载对象失败: {err:?}")))?
                    {
                        this_bytes.extend_from_slice(&bytes);
                    }
                    //
                    file.write_all(&this_bytes)
                        .await
                        .map_err(|err| anyhow::anyhow!(format!("写入文件失败: {err:?}")))?;
                }
                Ok(())
            }
            Err(e) => {
                if let Some(code) = e.code() {
                    if code == "NotFound" {
                        warn!("对象不存在:{}", &self.id);
                        return Err(anyhow::anyhow!("对象不存在"));
                    }
                }
                Err(anyhow::anyhow!("查询key对应的对象信息失败"))
            }
        }
    }
}
