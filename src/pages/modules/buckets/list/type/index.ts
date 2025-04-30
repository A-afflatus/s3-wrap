export type BucketInfo = {
    name: string;
    //位置
    location?: string;
    //区域
    bucket_region?: string;
    //创建事件
    createdAt: string;
    //跨域配置
    cors_rule?: CorsRuleType[]
    //权限配置
    acl?: [Acl, string][]
}
export type CorsRuleType = {
    id?: string,
    //允许的标头
    allowed_headers?: string[],
    //允许的请求方式
    allowed_methods: string[],
    //允许的源
    allowed_origins: string[],
    //暴露的标头
    expose_headers?: string[],
    //浏览器缓存指定资源的印前检查响应的时间（以秒为单位）。
    max_age_seconds?: number,
}

export type Acl = {
    id?: string,
    display_name?: string,
    email_address?: string,
    uri?: string,
}



export type S3Object = {
    key: string
    last_modified: string
    e_tag: string
    size: number
}
export type S3CommonPrefix = {
    prefix: string
}
export type S3ObjectList = {
    contents: S3Object[]
    common_prefixes: S3CommonPrefix[]
    continuation_token?: string
    next_continuation_token?: string
}
export type S3File = {
    key: string //全路径
    last_modified?: string
    e_tag?: string
    size?: number
    name: string;
    type: "file" | "dir"
}
export type S3ObjectHeadInfo = {
    // 对象最后修改时间
    last_modified: string,
    // 对象内容长度（字节数）
    content_length: number,
    // ETag
    e_tag: string,
    // 版本ID
    version_id: string,
    // 内容类型（MIME类型）
    content_type: string,
    // 自定义元数据
    metadata: Record<string, string>,
    // 储存类型
    storage_class: string,
}
export type S3Tag = {
    key: string
    value: string
}
export type S3ObjectDetail = {
    //头信息
    head? :S3ObjectHeadInfo
    //标签集合
    tag_set?: S3Tag[]
    //对象url
    url?: string
    //权限
    acl?: [Acl, string][]
}