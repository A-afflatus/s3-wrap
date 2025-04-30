import React, {useEffect, useState} from "react"
import {Separator} from "@/components/ui/separator"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Calendar, FileType, HardDrive, Lock, Tag} from "lucide-react"
import {formatFileSize} from "@/lib/utils"
import dayjs from "dayjs";
import {S3ObjectDetail} from "@/pages/modules/buckets/list/type";
import {invoke} from "@tauri-apps/api/core";
import {useCredential} from "@/hooks/useCredential.tsx";
import {useBucket} from "@/hooks/useBucket.tsx";
import {Result} from "@/lib/result.ts";
import {toast} from "sonner";

export default function ObjectInfo({getKey}: { getKey: () => string }) {
    const [activeTab, setActiveTab] = useState("overview")
    const {current} = useCredential()
    const {currentBucket} = useBucket()

    const [objectDetail, setObjectDetail] = useState<S3ObjectDetail>()

    useEffect(() => {
        invoke("get_object_info", {
            id: current.id,
            bucket: currentBucket?.name,
            key: getKey()
        }).then((r) => {
            const result: Result<S3ObjectDetail> = new Result(r);
            if (result.isSuccess()) {
                setObjectDetail(result.data)
            } else {
                toast.error("查询对象信息失败", {description: result.msg});
            }
        })
    }, [getKey]);

    const preview = () => {
        const type = objectDetail?.head?.metadata["s3warp-content-type"]
        if (type && type.startsWith("video/")) {
            return <video src={objectDetail?.url}
                          controls
                          className="w-full h-full object-cover rounded-2xl box-border border"
                          onError={
                              (e) => {
                                  e.currentTarget.onerror = null; // 防止默认图片也出错时无限循环
                                  e.currentTarget.style.width = "50%";
                                  e.currentTarget.style.height = "50%";
                              }
                          }

            />
        }
        return <img src={objectDetail?.url}
                    alt="预览内容"
                    className="max-w-full max-h-full object-cover rounded-2xl box-border border"
                    loading="lazy"
                    onError={e => {
                        e.currentTarget.src = "imageFail.png"; // 替换为默认图片
                        e.currentTarget.onerror = null; // 防止默认图片也出错时无限循环
                        e.currentTarget.style.maxWidth = "30%";
                        e.currentTarget.style.maxHeight = "30%";
                    }}
        />

    }

    return (
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="permissions">权限</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    <div className="text-muted-foreground">完整路径(Key)</div>
                    <div className="truncate font-medium max-w-[300px]" title={getKey()}>{getKey()}</div>
                    <div className="text-muted-foreground flex items-center gap-1">
                        <HardDrive className="h-3.5 w-3.5"/>
                        <span>大小</span>
                    </div>
                    <div
                        className="font-medium">{objectDetail?.head?.content_length ? formatFileSize(objectDetail?.head?.content_length) : "未知"}</div>

                    {objectDetail?.head?.last_modified && (
                        <>
                            <div className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5"/>
                                <span>最后修改</span>
                            </div>
                            <div
                                className="font-medium">{dayjs(objectDetail?.head?.last_modified).format("YYYY-MM-DD HH:mm:ss")}</div>
                        </>
                    )}

                    {objectDetail?.head?.content_type && (
                        <>
                            <div className="text-muted-foreground flex items-center gap-1">
                                <FileType className="h-3.5 w-3.5"/>
                                <span>内容类型</span>
                            </div>
                            <div className="font-medium">{objectDetail?.head?.content_type}</div>
                        </>
                    )}

                    {objectDetail?.head?.storage_class && (
                        <>
                            <div className="text-muted-foreground flex items-center gap-1">
                                <HardDrive className="h-3.5 w-3.5"/>
                                <span>存储类型</span>
                            </div>
                            <div className="font-medium">{objectDetail?.head?.storage_class}</div>
                        </>
                    )}

                    {objectDetail?.head?.e_tag && (
                        <>
                            <div className="text-muted-foreground flex items-center gap-1">
                                <Tag className="h-3.5 w-3.5"/>
                                <span>ETag</span>
                            </div>
                            <div className="font-medium truncate">{objectDetail?.head?.e_tag}</div>
                        </>
                    )}

                    {objectDetail?.head?.version_id && (
                        <>
                            <div className="text-muted-foreground">版本 ID</div>
                            <div className="font-medium truncate">{objectDetail?.head?.version_id}</div>
                        </>
                    )}
                </div>
                {
                    preview()
                }
                {objectDetail?.head?.metadata && Object.keys(objectDetail?.head?.metadata).length > 0 && (
                    <>
                        <Separator/>
                        <div>
                            <h4 className="text-sm font-medium mb-2">用户元数据</h4>
                            <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                                {Object.entries(objectDetail?.head?.metadata).map(([key, value]) => (
                                    <React.Fragment key={key}>
                                        <div className="text-muted-foreground">{key}</div>
                                        <div className="font-medium truncate">{value}</div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 mt-4">
                <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                    {
                        objectDetail?.acl?.map((item, index) => {
                            return (
                                <div className="grid grid-cols-[120px_1fr] gap-2 text-sm" key={index}>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                        <Lock className="h-3.5 w-3.5"/>
                                        <span>访问控制</span>
                                    </div>
                                    <div className="font-medium">{item[1]}</div>

                                    {item[0].display_name && (
                                        <>
                                            <div className="text-muted-foreground">所有者</div>
                                            <div className="font-medium">{item[0].display_name}</div>
                                        </>
                                    )}
                                </div>
                            )
                        })
                    }
                </div>
            </TabsContent>
        </Tabs>
    )
}
