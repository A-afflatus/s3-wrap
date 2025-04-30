use serde::{Deserialize, Serialize};
use std::error::Error;

// region 对UI通信结构体 NetResult<T>
const NET_OK: i32 = 0;
const NET_ERR: i32 = 1;
const DEFAULT_MSG: &'static str = "ok";

#[derive(Serialize, Deserialize, Debug)]
pub struct NetResult<T> {
    pub code: i32,
    pub msg: String,
    pub data: Option<T>,
}

impl<T> NetResult<T> {
    fn new(code: i32, msg: String, data: Option<T>) -> Self {
        NetResult { code, msg, data }
    }
    pub fn ok(data: T) -> Self {
        NetResult::new(NET_OK, DEFAULT_MSG.to_string(), Some(data))
    }
    pub fn ok_empty() -> Self {
        NetResult::new(NET_OK, DEFAULT_MSG.to_string(), None)
    }
    pub fn err(msg: String) -> Self {
        NetResult::new(NET_ERR, msg, None)
    }
}
// region 转换
impl<T> From<Option<T>> for NetResult<T> {
    fn from(opt: Option<T>) -> Self {
        match opt {
            Some(data) => NetResult::ok(data),
            None => NetResult::ok_empty(),
        }
    }
}
impl<T> From<Box<dyn Error>> for NetResult<T> {
    fn from(err: Box<dyn Error>) -> Self {
        NetResult::err(err.to_string())
    }
}

impl<T> From<Result<T, Box<dyn Error>>> for NetResult<T> {
    fn from(result: Result<T, Box<dyn Error>>) -> Self {
        match result {
            Ok(data) => NetResult::ok(data),
            Err(err) => NetResult::err(err.to_string()),
        }
    }
}
// endregion

// endregion
