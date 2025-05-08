import React from "react";

export type Provider = {
    id: string;
    name: string;
    type: string;
    apiKey: string;
    apiUrl: string;
    active: boolean;
    models: Model[];
}

export type Model = {
    id: string;
    modelId: string;
    name: string;
    providerId: string;
    // 模型类型  逗号(,)分隔
    accessTypes: string;
    active: boolean;
}
export type AccessTypes = "vision" | "web" | "text" | "thinking" | "tool";

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



export type ProviderTypeId = "deepseek" | "qwen" | "custom";

type ProviderType = {
    id: ProviderTypeId;
    name: string;
    logo: React.ReactNode;
    defaultApiUrl?: string;
}
export const PROVIDER_TYPES: ProviderType[] = [
    { id: "deepseek", name: "DeepSeek", logo: <img src="/icons/deepseek.svg" alt="DeepSeek" className="w-6 h-6" />, defaultApiUrl: "https://api.deepseek.com/" },
    { id: "qwen", name: "通义千问", logo: <img src="/icons/qwen.svg" alt="通义千问" className="w-6 h-6" />, defaultApiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/" },
    { id: "custom", name: "自定义提供商", logo: "🔧" },
]