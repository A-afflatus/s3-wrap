import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileToBase64 } from "./ToBase64.tsx"
import { Base64ToFile } from "./ToFile.tsx"

export default function ConversionPage() {
    return (
        <div className="container mx-auto px-4">
            <Tabs defaultValue="file-to-base64" className="max-w-3xl mx-auto">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="file-to-base64">文件转 Base64</TabsTrigger>
                    <TabsTrigger value="base64-to-file">Base64 转文件</TabsTrigger>
                </TabsList>

                <TabsContent value="file-to-base64" >
                    <FileToBase64 />
                </TabsContent>

                <TabsContent value="base64-to-file">
                    <Base64ToFile />
                </TabsContent>
            </Tabs>
        </div>
    )
}