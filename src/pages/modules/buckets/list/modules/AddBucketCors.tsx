import {useState} from "react"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import * as z from "zod"
import {Button} from "@/components/ui/button.tsx"
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form.tsx"
import {Input} from "@/components/ui/input.tsx"
import {Checkbox} from "@/components/ui/checkbox.tsx"
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card.tsx"
import {Badge} from "@/components/ui/badge.tsx"
import {Separator} from "@/components/ui/separator.tsx"
import {AlertCircle, Info, Plus, Save, X} from "lucide-react"
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx"
import {toast} from "sonner"
import {invoke} from "@tauri-apps/api/core";
import {useCredential} from "@/hooks/useCredential.tsx";
import {Result} from "@/lib/result.ts";
import {CorsRuleType} from "@/pages/modules/buckets/list/type";

const corsFormSchema = z.object({
    allowedOrigins: z.array(z.string().url({message: "请输入有效的URL"}).or(z.string().regex(/^\*/))).min(1, {
        message: "至少需要一个允许的源",
    }),
    allowedMethods: z.array(z.string()).min(1, {
        message: "至少需要选择一个HTTP方法",
    }),
    allowedHeaders: z.array(z.string()).optional(),
    exposeHeaders: z.array(z.string()).optional(),
    maxAgeSeconds: z.number().int().min(0).max(86400).optional(),
})

type CorsFormValues = z.infer<typeof corsFormSchema>

const httpMethods = [
    {id: "GET", label: "GET"},
    {id: "POST", label: "POST"},
    {id: "PUT", label: "PUT"},
    {id: "DELETE", label: "DELETE"},
    {id: "HEAD", label: "HEAD"},
]

const commonHeaders = [
    {id: "Authorization", label: "Authorization"},
    {id: "Content-Type", label: "Content-Type"},
    {id: "Content-Length", label: "Content-Length"},
    {id: "Accept", label: "Accept"},
    {id: "Origin", label: "Origin"},
    {id: "X-Requested-With", label: "X-Requested-With"},
    {id: "Access-Control-Request-Method", label: "Access-Control-Request-Method"},
    {id: "Access-Control-Request-Headers", label: "Access-Control-Request-Headers"},
]
type Props = {
    bucketName: string
    onCancel?: () => void
    onSuccess?: () => void
    currentCors?: CorsRuleType
}
export default function AddCorsConfiguration({bucketName,currentCors, onCancel = () => {}, onSuccess = () => {}}: Props) {
    const {current} = useCredential()
    const [newOrigin, setNewOrigin] = useState("")
    const [newHeader, setNewHeader] = useState("")
    const [newExposeHeader, setNewExposeHeader] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<CorsFormValues>({
        resolver: zodResolver(corsFormSchema),
        defaultValues: {
            allowedOrigins: currentCors?.allowed_origins ?? [],
            allowedMethods: currentCors?.allowed_methods ?? ["GET"],
            allowedHeaders: currentCors?.allowed_headers ?? [],
            exposeHeaders: currentCors?.expose_headers ?? [],
            maxAgeSeconds: currentCors?.max_age_seconds ?? undefined,
        },
    })

    const allowedOrigins = form.watch("allowedOrigins")
    const allowedHeaders = form.watch("allowedHeaders") || []
    const exposeHeaders = form.watch("exposeHeaders") || []

    const addOrigin = () => {
        if (!newOrigin) return

        try {
            if ("*" === newOrigin) {
                form.setValue("allowedOrigins", ["*"])
                setNewOrigin("")
                return
            }
            // Basic URL validation
            new URL(newOrigin)

            if (!allowedOrigins.includes(newOrigin)) {
                form.setValue("allowedOrigins", [...allowedOrigins, newOrigin])
                setNewOrigin("")
            }
        } catch (e) {
            toast.warning("无效的URL", {
                description: "请输入有效的URL，包括http://或https://或*",
            })
        }
    }

    const removeOrigin = (origin: string) => {
        form.setValue(
            "allowedOrigins",
            allowedOrigins.filter((o) => o !== origin),
        )
    }

    const addHeader = () => {
        if (!newHeader) return
        if (!allowedHeaders.includes(newHeader)) {
            form.setValue("allowedHeaders", [...allowedHeaders, newHeader])
            setNewHeader("")
        }
    }

    const removeHeader = (header: string) => {
        form.setValue(
            "allowedHeaders",
            allowedHeaders.filter((h) => h !== header),
        )
    }

    const addExposeHeader = () => {
        if (!newExposeHeader) return
        if (!exposeHeaders.includes(newExposeHeader)) {
            form.setValue("exposeHeaders", [...exposeHeaders, newExposeHeader])
            setNewExposeHeader("")
        }
    }

    const removeExposeHeader = (header: string) => {
        form.setValue(
            "exposeHeaders",
            exposeHeaders.filter((h) => h !== header),
        )
    }

    const onSubmit = async (data: CorsFormValues) => {
        setIsSubmitting(true)
        console.log("提交跨域配置:", data)
        invoke("put_bucket_cors", {
            id: current.id,
            bucket: bucketName,
            corsRule: {
                allowed_origins: data.allowedOrigins,
                allowed_methods: data.allowedMethods,
                allowed_headers: data.allowedHeaders,
                expose_headers: data.exposeHeaders,
                max_age_seconds: data.maxAgeSeconds,
            }
        }).then(async (r) => {
            const result: Result<void> = new Result(r);
            if (result.isSuccess()) {
                toast.success("CORS配置已保存", {
                    description: `已成功为存储桶 ${bucketName} 更新CORS配置`,
                })
                onSuccess()
            } else {
                toast.error("添加跨域配置失败", {description: result.msg});
            }
        }).finally(() => setIsSubmitting(false))

    }

    return (
        <div className="container py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">CORS 配置</h1>
                <p className="text-muted-foreground">
                    为存储桶 <span className="font-bold text-black">{bucketName}</span> 配置跨源资源共享 (CORS) 规则
                </p>
            </div>

            <Alert className="mb-6">
                <AlertCircle className="h-4 w-4"/>
                <AlertTitle>什么是 CORS?</AlertTitle>
                <AlertDescription>
                    跨源资源共享 (CORS)
                    定义了浏览器如何与不同源的资源进行交互。配置CORS规则可以允许您的网站或应用程序从浏览器安全地访问此存储桶中的资源。
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>添加 CORS 规则</CardTitle>
                    <CardDescription>指定哪些网站可以访问此存储桶中的对象，以及允许的HTTP方法和头信息</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="allowedOrigins"
                                render={() => (
                                    <FormItem className="space-y-3" >
                                        <FormLabel ><span className="text-red-600 text-sm">* </span>允许的源 (Origins)</FormLabel>
                                        <FormDescription>
                                            指定允许访问此存储桶的网站域名。使用 * 允许所有源（不推荐用于生产环境）
                                        </FormDescription>

                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="https://example.com"
                                                value={newOrigin}
                                                onChange={(e) => setNewOrigin(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOrigin())}
                                            />
                                            <Button type="button" onClick={addOrigin} size="sm">
                                                <Plus className="h-4 w-4 mr-1"/> 添加
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {allowedOrigins.length === 0 &&
                                                <p className="text-sm text-muted-foreground">未添加任何源</p>}

                                            {allowedOrigins.map((origin) => (
                                                <Badge key={origin} variant="secondary"
                                                       className="flex items-center gap-1">
                                                    {origin}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeOrigin(origin)}
                                                        className="ml-1 rounded-full hover:bg-muted"
                                                    >
                                                        <X className="h-3 w-3"/>
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <Separator/>

                            <FormField
                                control={form.control}
                                name="allowedMethods"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-4">
                                            <FormLabel><span className="text-red-600 text-sm">* </span>允许的 HTTP 方法</FormLabel>
                                            <FormDescription>选择允许的HTTP请求方法</FormDescription>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {httpMethods.map((method) => (
                                                <FormField
                                                    key={method.id}
                                                    control={form.control}
                                                    name="allowedMethods"
                                                    render={({field}) => {
                                                        return (
                                                            <FormItem key={method.id}
                                                                      className="flex flex-row items-start space-x-3 space-y-0">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(method.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...field.value, method.id])
                                                                                : field.onChange(field.value?.filter((value) => value !== method.id))
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel
                                                                    className="font-normal">{method.label}</FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <Separator/>

                            <FormField
                                control={form.control}
                                name="allowedHeaders"
                                render={() => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>允许的头信息 (Headers)</FormLabel>
                                        <FormDescription>指定允许的请求头。使用 * 允许所有头信息</FormDescription>

                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Content-Type"
                                                value={newHeader}
                                                onChange={(e) => setNewHeader(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHeader())}
                                            />
                                            <Button type="button" onClick={addHeader} size="sm">
                                                <Plus className="h-4 w-4 mr-1"/> 添加
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">常用头信息:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {commonHeaders.map((header) => (
                                                    <Badge
                                                        key={header.id}
                                                        variant="outline"
                                                        className="cursor-pointer hover:bg-secondary"
                                                        onClick={() => {
                                                            if (!allowedHeaders.includes(header.id)) {
                                                                form.setValue("allowedHeaders", [...allowedHeaders, header.id])
                                                            }
                                                        }}
                                                    >
                                                        {header.label}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {allowedHeaders.length === 0 &&
                                                <p className="text-sm text-muted-foreground">未添加任何头信息</p>}

                                            {allowedHeaders.map((header) => (
                                                <Badge key={header} variant="secondary"
                                                       className="flex items-center gap-1">
                                                    {header}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeHeader(header)}
                                                        className="ml-1 rounded-full hover:bg-muted"
                                                    >
                                                        <X className="h-3 w-3"/>
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <Separator/>

                            <FormField
                                control={form.control}
                                name="exposeHeaders"
                                render={() => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>暴露的头信息 (Expose Headers)</FormLabel>
                                        <FormDescription>指定浏览器可以访问的响应头</FormDescription>

                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="ETag"
                                                value={newExposeHeader}
                                                onChange={(e) => setNewExposeHeader(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault() , addExposeHeader())}
                                            />
                                            <Button type="button" onClick={addExposeHeader} size="sm">
                                                <Plus className="h-4 w-4 mr-1"/> 添加
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {exposeHeaders.length === 0 && (
                                                <p className="text-sm text-muted-foreground">未添加任何暴露头信息</p>
                                            )}

                                            {exposeHeaders.map((header) => (
                                                <Badge key={header} variant="secondary"
                                                       className="flex items-center gap-1">
                                                    {header}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExposeHeader(header)}
                                                        className="ml-1 rounded-full hover:bg-muted"
                                                    >
                                                        <X className="h-3 w-3"/>
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <Separator/>

                            <FormField
                                control={form.control}
                                name="maxAgeSeconds"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>最大缓存时间 (秒)</FormLabel>
                                        <FormDescription>浏览器可以缓存预检请求结果的时间（秒）</FormDescription>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="86400"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={onCancel}>取消</Button>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>正在保存...</>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4"/>
                                保存配置
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            <div className="mt-6">
                <Alert>
                    <Info className="h-4 w-4"/>
                    <AlertTitle>CORS 配置提示</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>在生产环境中，应该限制允许的源，而不是使用通配符 (*)</li>
                            <li>只允许必要的HTTP方法，减少潜在的安全风险</li>
                            <li>配置CORS后，可能需要几分钟才能生效</li>
                            <li>如果您使用的是AWS S3，请确保您的IAM用户具有更新CORS配置的权限</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    )
}
