import {useState} from "react"
import {Button} from "@/components/ui/button"
import {Textarea} from "@/components/ui/textarea"
import {save} from "@tauri-apps/plugin-dialog";
import {BaseDirectory, writeFile} from "@tauri-apps/plugin-fs";
import {Skeleton} from "@/components/ui/skeleton.tsx";

export function Base64ToFile() {
    const [loading, setLoading] = useState(false)
    const [baseStr, setBaseStr] = useState<string>()

    const downloadFile = async () => {
        if (!baseStr) {
            return
        }
        const path = await save({
            title: "下载转换后的文件",
            defaultPath: BaseDirectory.Download.toString(),
            canCreateDirectories: true,
        })
        if (path) {
            setLoading(true)
            try {
                const binaryString = atob(baseStr);
                const uint8Array = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    uint8Array[i] = binaryString.charCodeAt(i);
                }
                await writeFile(path, uint8Array)
                alert("转换成功")
                setBaseStr(undefined)
            } catch (e) {
                alert("转换失败,输入有效的base64字符串")
            }finally {
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
        <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium">输入 Base64</h3>
                    <Textarea
                        placeholder="在此粘贴 Base64 编码内容..."
                        className="min-h-[200px] font-mono text-xs"
                        onChange={(e) => setBaseStr(e.target.value)}
                        value={baseStr}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={downloadFile}>转换</Button>
                </div>
            </div>
        </div>
    )
}
