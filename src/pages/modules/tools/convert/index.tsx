import React, {useState} from "react"
import {ArrowRight, Download, FileImage, Upload} from "lucide-react"

import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Slider} from "@/components/ui/slider"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {formatFileSize, getImageFileInfo, ImageInfo} from "@/lib/utils.ts";
import {compress, EImageType, filetoDataURL} from "image-conversion";
import {BaseDirectory, writeFile} from "@tauri-apps/plugin-fs";
import {save} from "@tauri-apps/plugin-dialog";
import {Input} from "@/components/ui/input.tsx";

type ConvertedFileType = {
    dataUrl: string;
    type: string;
    width: number;
    height: number;
    size: number;
}
type ConvertConf = {
    width?: number;
    height?: number;
    type: string;
    quality: number;
}
const ACCEPT_TYPE = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/jpg"]

export default function ImageConversionUI() {
    const [tab, setTab] = useState<"original" | "converted">("original")
    const [currentImage, setCurrentImage] = useState<ImageInfo>()
    const [convertedFile, setConvertedFile] = useState<ConvertedFileType>()
    const [conf, setConf] = useState<ConvertConf>({
        type: "jpeg",
        quality: 0.8,
    })

    //切换图片
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!ACCEPT_TYPE.includes(file.type)){
                alert("不支持的文件类型")
                return
            }
            const image = await getImageFileInfo(file)
            setCurrentImage(image)
            setConf(c => {
                return {
                    ...c,
                    width: image.width,
                    height: image.height,
                }
            })
            setConvertedFile(undefined)
        }
    }
    //转换
    const handleConvert = async () => {
        const convertedFile = await compress(currentImage!.file, {
            //质量
            quality: conf.quality,
            width: conf.width,
            height: conf.height,
            type: EImageType[conf.type.toUpperCase() as keyof typeof EImageType]
        })
        //转dataURl
        const convertedFileDataUrl = await filetoDataURL(convertedFile);
        setConvertedFile({
            dataUrl: convertedFileDataUrl,
            type: conf.type,
            width: conf.width ?? currentImage!.width,
            height: conf.height ?? currentImage!.height,
            size: convertedFile.size,
        })
        setTab("converted")
    }
    //把dataUrl下载到用户下载目录中
    const downloadConvertedImage = async () => {
        const path = await save({
            title: "下载转换后的图片",
            filters: [{
                name: "图片",
                extensions: [convertedFile!.type]
            }],
            defaultPath: BaseDirectory.Download.toString(),
            canCreateDirectories: true,
        })
        if (path) {
            // 1. 移除 dataURL 前缀（如 "data:image/png;base64,"）
            const base64String = convertedFile!.dataUrl!.split(',')[1];

            // 2. 解码 base64 字符串为二进制字符串
            const binaryString = atob(base64String);

            // 3. 将二进制字符串转换为 Uint8Array
            const uint8Array = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
            }
            await writeFile(path, uint8Array)
            alert("下载成功")
            setCurrentImage(undefined)
            setConvertedFile(undefined)
            setTab("original")
        }
    }

    return (
        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
            <div className="space-y-6">
                {/* Upload Area */}
                <Card className="border-dashed" hidden={!!currentImage}>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center space-y-4 py-12">
                            <div className="rounded-full bg-muted p-4">
                                <FileImage className="h-8 w-8 text-muted-foreground"/>
                            </div>
                            <div className="space-y-2 text-center">
                                <h3 className="text-lg font-medium">点击选择图片</h3>
                                <p className="text-sm text-muted-foreground">支持 JPG, PNG, WEBP, GIF 格式</p>
                            </div>
                            <label htmlFor="image-upload">
                                <div className="cursor-pointer">
                                    <Button onClick={() => document.getElementById("image-upload")?.click()}>
                                        <Upload className="mr-2 h-4 w-4"/>
                                        选择文件
                                    </Button>
                                </div>
                                <input
                                    id="image-upload"
                                    multiple={false}
                                    type="file"
                                    accept="image/png, image/jpeg, image/gif, image/webp, image/jpg"
                                    className="sr-only"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        </div>
                    </CardContent>
                </Card>
                <Tabs defaultValue="original" hidden={!currentImage} value={tab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="original" onClick={() => setTab("original")}>原始图片</TabsTrigger>
                        <TabsTrigger value="converted" onClick={() => setTab("converted")} disabled={!convertedFile}>
                            转换后
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="original" className="mt-4">
                        <Card>
                            <CardContent className="p-6">
                                <div
                                    className="aspect-video bg-muted rounded-md flex flex-1 items-center justify-center cursor-pointer"
                                    onClick={() => document.getElementById("image-upload")?.click()}
                                >
                                    <img
                                        src={currentImage?.dataUrl ?? ""}
                                        alt="Original image preview"
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                                <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                                    <span className="break-all max-w-3/4">{currentImage?.name}</span>
                                    <span>{currentImage && `${formatFileSize(currentImage.size)} • ${currentImage.width}*${currentImage.height} • ${currentImage.type}`}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="converted" className="mt-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                                    <img
                                        src={convertedFile?.dataUrl ?? ""}
                                        alt="Converted image preview"
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                                <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                                    <span className="break-all max-w-3/4">转换后的图片</span>
                                    <span>{convertedFile && `${formatFileSize(convertedFile.size)} • ${convertedFile.width}*${convertedFile.height} • ${convertedFile.type}`}</span>
                                </div>
                                {convertedFile && (
                                    <Button className="mt-4 w-full" variant="default"
                                            onClick={async () => downloadConvertedImage()}>
                                        <Download className="mr-2 h-4 w-4"/>
                                        下载转换后的图片
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Action Button */}
                {currentImage && !convertedFile && (
                    <Button className="w-full" size="lg" onClick={handleConvert}>
                        开始转换
                        <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                )}
            </div>

            {/* Settings Panel */}
            <div>
                <Card>
                    <CardContent className="p-6">
                        <h3 className="text-lg font-medium mb-4">转换设置</h3>

                        <div className="space-y-6">
                            {/* Format Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="format">输出格式</Label>
                                <Select defaultValue={conf.type}
                                        onValueChange={(value) => setConf(c => ({...c, type: value}))}>
                                    <SelectTrigger id="format">
                                        <SelectValue placeholder="选择格式"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="jpeg">JPEG</SelectItem>
                                        <SelectItem value="png">PNG</SelectItem>
                                        <SelectItem value="gif">GIF</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Quality Setting */}
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>质量</Label>
                                    <span className="text-sm text-muted-foreground">{conf.quality * 100}%</span>
                                </div>
                                <Slider defaultValue={[80]} max={100} step={1} onValueChange={(value) => setConf(c => ({
                                    ...c,
                                    quality: Math.round((value[0] / 100 + Number.EPSILON) * 100) / 100
                                }))
                                }/>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>低质量</span>
                                    <span>高质量</span>
                                </div>
                            </div>

                            {/* Resize Options */}
                            <div className="space-y-2">
                                <Label>调整大小</Label>
                                <div className="flex justify-between text-xs gap-3 text-muted-foreground">
                                    <Input type="text" placeholder="宽度" pattern="[0-9]*" value={conf.width}
                                           onChange={(e) => setConf(c => ({...c, width: Number(e.target.value)}))}/>
                                    <div className="text-center items-center justify-center flex">*</div>
                                    <Input type="text" placeholder="高度" pattern="[0-9]*" value={conf.height}
                                           onChange={(e) => setConf(c => ({...c, height: Number(e.target.value)}))}/>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
