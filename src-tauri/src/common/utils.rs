use infer::Infer;
/// 获取文件类型
pub fn get_file_type(path: String) -> String {
    // 读取文件内容并上传
    if let Ok(mime) = Infer::new().get_from_path(&path) {
        if let Some(file_type) = mime.map(|x| x.mime_type()) {
            return file_type.to_string();
        }
    }
    mime_guess::from_path(&path)
        .first_or_octet_stream()
        .to_string()
}
