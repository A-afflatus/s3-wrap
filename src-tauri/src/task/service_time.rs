use crate::middleware::sqlite::get_sql_lite_pool;
use log::{error, info};
use std::thread;
use tauri::async_runtime::block_on;

/// 创建一个线程，每一分钟修改一次app_service_time表的时间
pub fn run() -> thread::JoinHandle<()> {
    info!("启动app_service_time守护进程");
    thread::spawn(|| {
        loop {
            block_on(async {
                let pool = get_sql_lite_pool().clone();
                let now = chrono::Local::now().format("%Y-%m-%d").to_string();
                //查询当天的记录存不存在
                match sqlx::query(r#"select * from app_service_time where date = ? "#)
                    .bind(now.clone())
                    .fetch_optional(&pool)
                    .await
                {
                    //存在更新
                    Ok(opt) => {
                        match opt {
                            //存在更新
                            Some(_) => {
                                sqlx::query(r#"update app_service_time set minutes = minutes + 1 where date = ? "#)
                                            .bind(now.clone())
                                            .execute(&pool)
                                            .await.ok();
                            }
                            //不存在插入
                            None => {
                                sqlx::query(r#"insert into app_service_time (id,date,minutes) values (?,?,?)"#)
                                        .bind(uuid::Uuid::new_v4().to_string())
                                        .bind(now.clone())
                                        .bind(0)
                                        .execute(&pool)
                                        .await
                                        .ok();
                            }
                        }
                    }
                    Err(e) => {
                        error!("创建app_service_time记录失败{:#?}", e);
                    }
                }
            });
            thread::sleep(std::time::Duration::from_secs(60));
        }
    })
}
