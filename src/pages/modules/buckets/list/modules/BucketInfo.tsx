import {useEffect, useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Calendar, FileText, Globe, Shield, Users} from "lucide-react"
import dayjs from "dayjs";
import {useCredential} from "@/hooks/useCredential.tsx";
import {invoke} from "@tauri-apps/api/core";
import {Result} from "@/lib/result.ts";
import {toast} from "sonner";
import AddCorsConfiguration from "@/pages/modules/buckets/list/modules/AddBucketCors.tsx";
import {BucketInfo} from "@/pages/modules/buckets/list/type";
import {MdDeleteForever} from "react-icons/md";
import {confirm} from "@tauri-apps/plugin-dialog";


interface BucketDetailsProps {
    bucket?: {
        name: string;
        createdAt: string;
    }
}

export default ({bucket}: BucketDetailsProps) => {
    const {current} = useCredential()
    const [bucketInfo, setBucketInfo] = useState<BucketInfo>()
    const [settingType, setSettingType] = useState<'addCors' | undefined>()
    const [flush, setFlush] = useState(false)

    useEffect(() => {
        invoke("get_bucket_info", {id: current.id, bucket: bucket?.name})
            .then(async r => {
                const result: Result<BucketInfo> = new Result(r);
                if (result.isSuccess()) {
                    setBucketInfo({
                        ...result.data,
                        name: bucket?.name!,
                        createdAt: dayjs(bucket?.createdAt).format("YYYY-MM-DD HH:mm:ss")
                    })

                } else {
                    toast.error("获取bucket信息失败", {description: result.msg, richColors: true});
                }
            })

    }, [bucket, current, setBucketInfo, flush]);

    const deleteCorsRule = async () => {
        if (bucket?.name && await confirm(`确认删除当前跨域配置吗？`, {
            title: '删除跨域配置',
            okLabel: '确认',
            cancelLabel: '取消',
            kind: 'warning'
        })) {
            invoke("delete_bucket_cors", {id: current.id, bucket: bucket.name})
                .then(async r => {
                    const result: Result<BucketInfo> = new Result(r);
                    if (result.isSuccess()) {
                        setFlush((f) => !f)
                    } else {
                        toast.error("删除bucket跨域配置失败", {description: result.msg, richColors: true});
                    }
                })
        }
    }

    return (
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="settings">设置</TabsTrigger>
                <TabsTrigger value="permissions">权限</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="h-4 w-4"/>
                                名称
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{bucket?.name}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="h-4 w-4"/>
                                位置
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{bucketInfo?.location}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Globe className="h-4 w-4"/>
                                区域
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{bucketInfo?.bucket_region}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Calendar className="h-4 w-4"/>
                                创建时间
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{bucketInfo?.createdAt}</p>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="settings">

                <Card className="mt-4">
                    {
                        settingType === 'addCors' ? <CardContent>
                                <AddCorsConfiguration bucketName={bucket?.name!}
                                                      currentCors={bucketInfo?.cors_rule ? bucketInfo.cors_rule[0] : undefined}
                                                      onCancel={() => setSettingType(undefined)}
                                                      onSuccess={() => {
                                                          setSettingType(undefined)
                                                          setFlush((f) => !f)
                                                      }}/>
                            </CardContent>
                            :
                            <>
                                <CardHeader>
                                    <CardTitle className="text-base">CORS 配置</CardTitle>
                                    <CardDescription>跨源资源共享设置</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="font-medium">状态</span>
                                            <div className="flex text-xl items-center cursor-pointer"
                                                 onClick={() => bucketInfo?.cors_rule && deleteCorsRule()}>
                                                <Badge variant={bucketInfo?.cors_rule ? "default" : "outline"}
                                                       className="flex gap-1">
                                                    {bucketInfo?.cors_rule && <MdDeleteForever/>}
                                                    {bucketInfo?.cors_rule ? "已启用" : "已禁用"}
                                                </Badge>
                                            </div>
                                        </div>
                                        {
                                            bucketInfo?.cors_rule?.map((rule, index) => {
                                                return (
                                                    <div key={index} className="grid  gap-y-1">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium">允许的源</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {rule?.allowed_origins?.map((origin, index) => (
                                                                    <Badge key={index} variant="outline">
                                                                        {origin}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium">允许的方法</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {rule?.allowed_methods.map((method, index) => (
                                                                    <Badge key={index} variant="outline">
                                                                        {method}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {
                                                            rule?.allowed_headers && rule?.allowed_headers?.length > 0 &&
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-medium">允许的标头</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {rule?.allowed_headers?.map((origin, index) => (
                                                                        <Badge key={index} variant="outline">
                                                                            {origin}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        }
                                                        {
                                                            rule?.expose_headers && rule?.expose_headers?.length > 0 &&
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-medium">暴露的标头</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {rule?.expose_headers?.map((origin, index) => (
                                                                        <Badge key={index} variant="outline">
                                                                            {origin}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        }
                                                        <hr/>
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                    <Button onClick={() => {
                                        setSettingType("addCors")
                                    }}>配置跨域规则</Button>
                                </CardFooter>
                            </>
                    }
                </Card>
            </TabsContent>

            <TabsContent value="permissions">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">访问控制</CardTitle>
                        <CardDescription>管理谁可以访问此存储桶</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {
                            bucketInfo?.acl?.map((item, index) => {
                                return (
                                    <div key={index}>
                                        <div className="space-y-4 py-2">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4"/>
                                                    <span className="font-medium">访问权限</span>
                                                </div>
                                                <Badge variant={"default"}>
                                                    {item[1]}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4"/>
                                                    <span className="font-medium">所有者</span>
                                                </div>
                                                <span className="text-sm">{item[0].display_name}</span>
                                            </div>
                                        </div>
                                        <hr/>
                                    </div>
                                )
                            })
                        }

                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}

