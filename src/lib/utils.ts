import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export type ImageInfo = {
    width: number
    height: number
    type: string
    name: string
    size: number
    file: File
    dataUrl?: string
    lastModified: number
}

/**
 * 拼接类名
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * 转换文件大小
 */
export function formatFileSize(bytes: number): string {
    if (!bytes) {
        return ""
    }
    if (bytes === 0) return "0 bytes"
    const k = 1024
    const sizes = ["bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

/**
 * 转换分钟时长
 */
export function formatMinuteDuration(minutes: number): string {
    if (!minutes) {
        return ""
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
}

/**
 * 文件对象转dataUrl
 */
export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            resolve(e.target?.result as string)
        }
        reader.onerror = (e) => {
            reject(e)
        }
        reader.readAsDataURL(file)
    })
}

/**
 * 获取图片file 的属性
 */
export async function getImageFileInfo(file: File): Promise<ImageInfo> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = async () => {
            resolve({
                width: img.width,
                height: img.height,
                type: file.type,
                name: file.name,
                size: file.size,
                file: file,
                dataUrl: await fileToDataUrl(file),
                lastModified: file.lastModified,
            })
        }
        img.onerror = (e) => {
            reject(e)
        }
        img.src = URL.createObjectURL(file)
    })
}

/**
 * 文件转base64
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            resolve(e.target?.result as string)
        }
        reader.onerror = (e) => {
            reject(e)
        }
        reader.readAsDataURL(file)
    })
}