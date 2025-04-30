import React, {useState} from "react"
import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {Textarea} from "@/components/ui/textarea"
import {Copy, FileCheck, FileIcon, FileImage} from "lucide-react"
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {fileToBase64, formatFileSize} from "@/lib/utils.ts";
import {writeText} from "@tauri-apps/plugin-clipboard-manager";
import {toast} from "sonner";

export function FileToBase64() {
    const [loading, setLoading] = useState(false)
    const [fileInfo, setFileInfo] = useState<File>()
    const [base64Str, setBase64Str] = useState<string>()

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setLoading(true)
            try {
                const file = e.target.files[0];
                setFileInfo(file)
                setBase64Str((await fileToBase64(file))?.split(",").pop())
            } finally {
                setLoading(false)
            }
        }
    }


    if (loading) {
        return (
            <div className="flex flex-col space-y-3">
                <Skeleton className="min-h-[500px] w-full rounded-xl"/>
            </div>
        )
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h3 className="text-lg font-medium">上传文件</h3>
                <Card className="border-dashed">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center space-y-4 py-12 cursor-pointer"
                             onClick={() => document.getElementById("file-upload")?.click()}>
                            {
                                fileInfo ? <>
                                        <div className="rounded-full bg-muted p-4">
                                            <FileCheck color="green" className="h-8 w-8 text-muted-foreground"/>
                                        </div>
                                        <div className="space-y-2 text-center">
                                            <h3 className="text-lg font-medium">文件已选择</h3>
                                        </div>
                                    </>
                                    :
                                    <>
                                        <div className="rounded-full bg-muted p-4">
                                            <FileImage className="h-8 w-8 text-muted-foreground"/>
                                        </div>
                                        <div className="space-y-2 text-center">
                                            <h3 className="text-lg font-medium">点击选择文件</h3>
                                        </div>
                                    </>
                            }

                            <label htmlFor="file-upload">
                                <input
                                    id="file-upload"
                                    multiple={false}
                                    type="file"
                                    className="sr-only"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {fileInfo && (
                    <div className="space-y-2">
                        <h3 className="text-lg font-medium">文件信息</h3>
                        <div className="grid gap-2">
                            <div className="flex items-center gap-2">
                                <FileIcon className="h-5 w-5 text-muted-foreground"/>
                                <span className="text-sm  overflow-hidden overflow-ellipsis break-all">{fileInfo.name}</span>
                            </div>
                            <div className="text-sm">类型: {fileInfo.type}</div>
                            <div className="text-sm">大小: {formatFileSize(fileInfo.size)}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Base64 结果<span className="text-sm text-gray-500">只展示前1000个字符</span></h3>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={async () => {
                                if(base64Str) {
                                    await writeText(base64Str)
                                    toast.success("已复制到粘贴板")
                                }
                            }}>
                                <Copy className="h-4 w-4 mr-2"/>
                                复制
                            </Button>
                        </div>
                    </div>
                    <Textarea
                        readOnly
                        className="min-h-[150px] font-mono text-xs"
                        placeholder="转换后的 Base64 将显示在这里..."
                        value={base64Str?base64Str.substring(0, 1000)+"...":""}
                    />
                </div>
            </div>
        </div>
    )
}
