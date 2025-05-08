import {ReasoningStatus} from "@/components/my/ai/ChatMessageReasoningContent.tsx";

export type ProviderTypeId = "deepseek" | "qwen" | "custom";

export type ChatMessageType = {
    id: string;
    content: string;
    fileNames?: string[];
    reasoning?: {
        reasoning_times?: number;
        reasoning_status: ReasoningStatus;
        reasoning_content: string;
    };
    role: 'assistant' | 'user';
}
export type MessageFileInfo ={
    fileName: string;
    filePath: string;
    fileType: string;
    fileMimeType: string;
    fileSize: number;
}
export type ModelDetail = {
    id: string;
    modelId: string;
    name: string;
    // 模型类型 逗号(,)分隔
    accessTypes: string;
    active: boolean;
    providerId: string;
    providerName: string;
    providerType: ProviderTypeId;
    providerApiUrl: string;
    providerApiKey: string;
    providerActive: boolean;
}
export type ChatContextType = {
    knowledge?: string[];
    mcp?: string[];
    //联网搜索
    webSearch: boolean;
    //深度思考
    reasoning: boolean;
    //文件
    files?: MessageFileInfo[];
};