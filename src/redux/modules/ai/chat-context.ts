import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {AI_CHAT} from '@/redux/constant.ts';
import {RootState} from "@/redux/store.ts";
import {connect} from "@/hooks/useDB";
import {ChatContextType, ChatMessageType, MessageFileInfo, ModelDetail} from "@/redux/modules/ai/type.ts";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import {readFile, readTextFile} from "@tauri-apps/plugin-fs";
import {uint8ArrayToDataURL} from "@/lib/utils.ts";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs"

export const ACCEPT_IMAGE_TYPES = ['bmp', 'icns', 'ico', 'jfif', 'jpe', 'jpeg', 'jpg', 'png', 'tif', 'tiff', 'webp']
export const ACCEPT_VIDEO_TYPES = ['mp4', 'avi', 'mkv', 'wmv', 'mov', 'flv']
export const ACCEPT_AUDIO_TYPES = ['amr', 'wav', '3gp', '3gpp', 'aac', 'mp3']
export const ACCEPT_DOC_TYPES = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf']

const initContext = {
    knowledge: [],
    mcp: [],
    webSearch: false,
    reasoning: false,
    files: [],
}

interface ChatContextState {
    models: ModelDetail[];
    currentModel?: ModelDetail;
    context: ChatContextType;
    messages: ChatMessageType[]
}

const initialState: ChatContextState = {
    models: [],
    context: initContext,
    messages: []
}

export const initModels = createAsyncThunk(AI_CHAT + "/models", async () => {
    return await (await connect())
        .select(`SELECT m.id,
                        m.model_id     as modelId,
                        m.name         as name,
                        m.access_types as accessTypes,
                        m.active,
                        p.id           as providerId,
                        p.name         as providerName,
                        p.type         as providerType,
                        p.api_url      as providerApiUrl,
                        p.api_key      as providerApiKey,
                        p.active       as providerActive
                 FROM ai_model m
                          left join ai_model_provider p on m.provider_id = p.id
                 WHERE m.active = 1
                   and p.active = 1`)
})
const chatContextStateSlice = createSlice({
    name: AI_CHAT,
    initialState,
    extraReducers: (builder) => {
        builder.addCase(initModels.fulfilled, (state, action) => {
            const modelList = action.payload as unknown as ModelDetail[]
            state.models = modelList
            if (modelList.length > 0 && !state.currentModel) {
                state.currentModel = modelList[0]
            }
        })
    },
    reducers: {
        setCurrentModel: (state, action: PayloadAction<ModelDetail>) => {
            state.currentModel = action.payload
            state.context = initContext
        },
        toggleWebSearch: (state) => {
            state.context.webSearch = !state.context.webSearch
        },
        toggleReasoning: (state) => {
            state.context.reasoning = !state.context.reasoning
        },
        setFiles: (state, action: PayloadAction<MessageFileInfo[]>) => {
            state.context.files = action.payload
        },
        deleteFile: (state, action: PayloadAction<string>) => {
            state.context.files = state.context.files?.filter(file => file.fileName !== action.payload)
        },
        setMessages: (state, action: PayloadAction<(msgList: ChatMessageType[]) => ChatMessageType[]>) => {
            state.messages = action.payload(state.messages)
        },
        clear: (state) => {
            state.messages = []
        },
    },
})

export const {
    setCurrentModel,
    toggleWebSearch,
    toggleReasoning,
    setFiles,
    deleteFile,
    setMessages,
    clear,
} = chatContextStateSlice.actions
/// 模型列表
export const models = (state: RootState) => state.AI_CHAT.models
/// 当前模型
export const currentModel = (state: RootState) => state.AI_CHAT.currentModel
/// chat配置
export const chatContext = (state: RootState) => state.AI_CHAT.context
/// chat消息
export const chatMessage = (state: RootState) => state.AI_CHAT.messages
export default chatContextStateSlice.reducer

/// 消息修复
export const repairMessages = (oldMessage: ChatMessageType[]) => {
    const newEvents: ChatMessageType[] = []
    for (let i = 0; i < oldMessage.length; i++) {
        if (i < oldMessage.length - 2) {
            const now = oldMessage[i];
            const next = oldMessage[i + 1];
            if (now.role === next.role) {
                continue
            }
        }
        if (i === oldMessage.length - 1 && oldMessage[i].role === "user") {
            continue
        }
        newEvents.push(oldMessage[i])
    }
    return newEvents;
}
/// 消息转换
export const convertMessages = async (files?: MessageFileInfo[]) => {
    if (!files) {
        return {
            content: []
        }
    }
    const list: any[] = []

    for (let file of files) {
        const fileType = file.fileType
        if (!fileType) {
            list.push({
                type: 'text',
                text: file.fileName
            })
        }
        const isDoc = ACCEPT_DOC_TYPES.includes(fileType)
        const isImage = ACCEPT_IMAGE_TYPES.includes(fileType)
        const isAudio = ACCEPT_AUDIO_TYPES.includes(fileType)
        const isVideo = ACCEPT_VIDEO_TYPES.includes(fileType)
        if (isDoc) {
            if (fileType === 'docx') {
                const {value} = await mammoth.extractRawText({arrayBuffer: (await readFile(file.filePath)).buffer})
                if (value) {
                    list.push({
                        type: 'text',
                        text: `参考：文件名称:${file.fileName},文件内容:${value}`
                    })
                }
                continue;
            }
            if (fileType === 'xls' || fileType === 'xlsx') {
                const arrayBuffer = (await readFile(file.filePath)).buffer
                const workbook = XLSX.read(arrayBuffer);
                workbook.SheetNames.map((sheetName, index) => {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_csv(sheet);
                    list.push({
                        type: 'text',
                        text: `参考：文件名称:${file.fileName},第${index + 1}sheet:${sheetName},sheet内容:${jsonData}`
                    })
                })
                continue;
            }
            if (fileType === 'pdf') {
                const arrayBuffer = (await readFile(file.filePath)).buffer
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                for (let i = 0; i < pdf.numPages; i++) {
                    const page = await pdf.getPage(i + 1);
                    const textContent = await page.getTextContent();
                    const text = textContent.items.map(item => (item as any).str ?? '').join();
                    list.push({
                        type: 'text',
                        text: `参考：文件名称:${file.fileName},第${i + 1}页,内容:${text}`
                    })
                }
                continue;
            }
            list.push({
                type: 'text',
                text: `参考文件：${file.fileName}`
            })
            continue;
        }
        if (isImage) {
            const bytes = await readFile(file.filePath)
            const dataUrl = uint8ArrayToDataURL(bytes, file.fileMimeType)
            list.push({
                type: 'image_url',
                image_url: {
                    url: dataUrl
                }
            })
            continue;
        }
        if (isAudio) {
            const bytes = await readFile(file.filePath)
            const dataUrl = uint8ArrayToDataURL(bytes, file.fileMimeType)
            list.push({
                type: 'input_audio',
                input_audio: {
                    data: dataUrl,
                    format: fileType
                }
            })
            continue;
        }
        if (isVideo) {
            const bytes = await readFile(file.filePath)
            const dataUrl = uint8ArrayToDataURL(bytes, file.fileMimeType)
            list.push({
                type: 'video_url',
                video_url: {
                    url: dataUrl
                }
            })
            continue;
        }
        const text = await readTextFile(file.filePath)
        list.push({
            type: 'text',
            text: `参考：文件名称:${file.fileName},文件内容:${text.split(" ").join()}`
        })
    }
    return {
        content: list
    }
}
