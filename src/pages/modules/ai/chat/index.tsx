import {ChatInput, ChatInputSubmit, ChatInputTextArea,} from "@/components/ui/chat-input";
import {ChatMessage, ChatMessageAvatar, ChatMessageContent,} from "@/components/ui/chat-message";
import {ChatMessageArea} from "@/components/ui/chat-message-area";
import {Brain, Eraser, Eye, FileSearch, Globe, Link, PlusIcon, ServerCog, Wrench} from "lucide-react";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {useEffect, useMemo, useRef, useState} from "react";
import {cn} from "@/lib/utils";
import {AI_KNOWLEDGE, AI_MCP, AI_MODEL} from "@/router/constant";
import {useNavigate} from "react-router-dom";
import {nanoid} from "nanoid";
import {AIMessage, HumanMessage, HumanMessageFields, MessageContentComplex} from "@langchain/core/messages";
import {MarkdownContent} from "@/components/ui/markdown-content.tsx";
import mitt from "mitt";
import {ChatMessageReasoningContent} from "@/components/my/ai/ChatMessageReasoningContent.tsx";
import {MyChatOpenAi} from "@/components/my/ai/MyChatOpenAi.ts"
import {Badge} from "@/components/ui/badge.tsx";
import FileSelectItem from "@/components/my/ai/FileSelectItem.tsx";
import {toast} from "sonner"
import * as pdfjsLib from 'pdfjs-dist';
import {writeFile} from "@tauri-apps/plugin-fs";
import {join, tempDir} from "@tauri-apps/api/path";


import {
    ACCEPT_AUDIO_TYPES,
    ACCEPT_IMAGE_TYPES,
    ACCEPT_VIDEO_TYPES,
    chatContext,
    chatMessage,
    clear,
    convertMessages,
    currentModel,
    deleteFile,
    initModels,
    models,
    repairMessages,
    setCurrentModel,
    setFiles,
    setMessages,
    toggleReasoning,
    toggleWebSearch
} from "@/redux/modules/ai/chat-context";

import {useAppDispatch, useAppSelector} from "@/redux/hook.ts";
import {ChatMessageType, MessageFileInfo} from "@/redux/modules/ai/type.ts";

pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs"


type ChatOption = 'model' | 'knowledge' | 'mcp';
const STOP_SIGNAL = "stop-stream"
const emitter = mitt()


export default function Chat() {
    const messages = useAppSelector(chatMessage)
    const config = useAppSelector(chatContext)
    const selectedModel = useAppSelector(currentModel)
    const modelList = useAppSelector(models)
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    useEffect(() => {
        dispatch(initModels())
    }, [dispatch]);
    const ref = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState<boolean>(false);
    const [input, setInput] = useState<string>()
    const [option, setOption] = useState<ChatOption>();

    const chat = useMemo(() => {
        if (!selectedModel) {
            return null
        }
        return new MyChatOpenAi({
            model: selectedModel.modelId,
            apiKey: selectedModel.providerApiKey,
            openAIApiKey: selectedModel.providerApiKey,
            configuration: {
                apiKey: selectedModel.providerApiKey,
                baseURL: selectedModel.providerApiUrl,
            },
            modelKwargs: {
                "enable_thinking": config.reasoning,
                "enable_search": config.webSearch,
                "search_options": {
                    "forced_search": config.webSearch
                }
            },
            streaming: true,
            useResponsesApi: false
        })
    }, [selectedModel, config]);


    //切换配置
    const handleOptionChange = useMemo(() => {
        if (!option) return null;
        return (
            <div
                className={`w-full box-border px-3`}
                ref={ref}
            >
                <div className="border-t border-r border-l rounded-t-sm box-border p-2 pb-1">
                    {/* 条目 */}
                    <div className="space-y-0.5">
                        {
                            option === 'model' &&
                            modelList.map((model) => {
                                    return (
                                        <div
                                            key={model.id}
                                            className={cn("flex justify-between items-center rounded-sm hover:bg-gray-200 dark:hover:bg-[#3f3f46] cursor-pointer", model.id === selectedModel?.id && "bg-gray-100 dark:bg-[#27272a]")}
                                            onClick={() => {
                                                localStorage.setItem("current_chat_model", model.id)
                                                dispatch(setCurrentModel(model))
                                            }}>
                                            <div className="flex items-center box-border p-1 text-sm gap-1">
                                                {`${model.name} | ${model.providerName}`}
                                            </div>
                                            <div className="flex items-center gap-1 mr-2">
                                                {/* 视觉*/}
                                                {model.accessTypes.includes('vision') &&
                                                    <Eye className="w-3 h-3" color="#1cc17b"/>}
                                                {/* 联网*/}
                                                {model.accessTypes.includes('web') &&
                                                    <Globe className="w-3 h-3" color="#3086ff"/>}
                                                {/* 推理*/}
                                                {model.accessTypes.includes('thinking') &&
                                                    <Brain className="w-3 h-3" color="#7d89d4"/>}
                                                {/* 工具调用*/}
                                                {model.accessTypes.includes('tool') &&
                                                    <Wrench className="w-3 h-3" color="#ed8536"/>}
                                            </div>
                                        </div>
                                    )
                                }
                            )
                        }
                        {/*todo 获取对应配置的列表*/}
                    </div>
                    {/* 操作 */}
                    <div
                        className="flex items-center box-border py-1 text-sm gap-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-[#3f3f46] cursor-pointer"
                        onClick={() => {
                            if (option === 'model') {
                                navigate(AI_MODEL)
                            }
                            if (option === 'knowledge') {
                                navigate(AI_KNOWLEDGE)
                            }
                            if (option === 'mcp') {
                                navigate(AI_MCP)
                            }
                        }}
                    >
                        <PlusIcon className="w-4 h-4"/>
                        {option === 'model' ? '添加模型...' : option === 'knowledge' ? '添加知识库...' : '添加MCP服务...'}
                    </div>
                    {/* 描述 */}
                    <div className="flex justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                            {option === 'model' ? '选择模型' : option === 'knowledge' ? '选择知识库' : '挂载MCP服务'}
                        </div>

                    </div>
                </div>
            </div>
        )
    }, [option, selectedModel, modelList, dispatch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOption(undefined);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            emitter.emit(STOP_SIGNAL)
            document.removeEventListener('mousedown', handleClickOutside);
            emitter.off(STOP_SIGNAL)
        };
    }, []);

    const call = async (input: string, oldMessages: ChatMessageType[], inputFils?: MessageFileInfo[]) => {
        if (!chat) {
            return;
        }
        const startDate = new Date()

        const nowMessages: HumanMessageFields = await convertMessages(inputFils)
        const content = nowMessages.content as MessageContentComplex[]
        content.push({"type": "text", "text": input})

        const eventStream = chat.streamEvents([...(oldMessages.map((message) => message.role === "user" ? new HumanMessage(message.content) : new AIMessage(message.content))), new HumanMessage(nowMessages)], {version: "v2",});
        emitter.on(STOP_SIGNAL, () => {
            eventStream.return().then()
            setTimeout(() => {
                dispatch(setMessages(events => {
                    const m = events[events.length - 1]
                    if (!m || !m.reasoning || m.reasoning.reasoning_status !== 'pending') {
                        return events;
                    }
                    events.pop()
                    events.push({
                        ...m,
                        reasoning: {
                            ...m.reasoning,
                            reasoning_status: 'stop',
                            reasoning_times: (new Date().getTime() - startDate.getTime()) / 1000,
                        }
                    })
                    return events;
                }))
            }, 500)
        })
        for await (const event of eventStream) {
            if (event.event === "on_chat_model_end") {
                break;
            }
            if (event.event === "on_chat_model_start") {
                dispatch(setMessages(events => {
                    const m = events.pop()
                    if (!m) {
                        return events;
                    }
                    m.content = "";
                    return [...events, m];
                }))
                continue;
            }
            const words = event.data.chunk.content as string;
            const reasoning = event.data.chunk?.additional_kwargs?.reasoning_content as (string | undefined)
            dispatch(setMessages(events => {
                const m = events.pop()
                if (!m) {
                    return events;
                }
                m.content = m.content += words;
                if (reasoning) {
                    if (m.reasoning) {
                        m.reasoning.reasoning_content = m.reasoning.reasoning_content.concat(reasoning);
                    } else {
                        m.reasoning = {
                            reasoning_content: reasoning,
                            reasoning_status: "pending",
                        };
                    }
                } else if (m.reasoning && m.reasoning.reasoning_status === "pending") {
                    m.reasoning.reasoning_status = "done";
                    m.reasoning.reasoning_times = (new Date().getTime() - startDate.getTime()) / 1000;
                }
                return [...events, m];
            }))
        }
        emitter.off(STOP_SIGNAL)
    }

    /// 提交消息
    const handleSubmitMessage = () => {
        if (loading) {
            return
        }
        if (!input) {
            return;
        }
        setLoading(true)
        const oldMessage = repairMessages(messages);

        const inputFils = config.files;
        dispatch(setFiles([]))

        dispatch(setMessages(events => {
            //去除连续的用户或助手消息，去掉旧的
            const userMessage: ChatMessageType = {
                id: nanoid(),
                content: input,
                fileNames: inputFils?.map(file => file.fileName),
                role: "user",
            }
            const assistantMessage: ChatMessageType = {
                id: nanoid(),
                content: "思考中...",
                role: "assistant",
            }
            return [...events, userMessage, assistantMessage];
        }))
        call(input, oldMessage, inputFils)
            .catch(e => {
                dispatch(setMessages(events => {
                    const m = events.pop()
                    if (!m) {
                        return events;
                    }
                    m.content = e.message;
                    return [...events, m];
                }))
            })
            .finally(() => {
                setLoading(false)
            })
        setInput("");
    };
    /// 文件上传
    const handleFileUpload = async (files?: FileList | File[] | null) => {
        try {
            if (files && files.length > 0) {
                if (files.length > 20) {
                    toast.warning("文件最多只能上传20个")
                    return
                }
                const canVision = selectedModel?.accessTypes.includes("vision")
                const fileList: (MessageFileInfo & { file?: File })[] = []
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileType = file.name.split(".").pop()?.toLowerCase() || ''
                    const fileSize = file.size;
                    const isImage = ACCEPT_IMAGE_TYPES.includes(fileType)
                    const isAudio = ACCEPT_AUDIO_TYPES.includes(fileType)
                    const isVideo = ACCEPT_VIDEO_TYPES.includes(fileType)
                    if (!canVision && (isAudio || isVideo || isImage)) {
                        toast.warning(`非视觉模型不支持上传图片、视频、音频`)
                        return
                    }
                    if ((isAudio || isVideo) && files.length > 1) {
                        toast.warning(`视频、音频只支持单个上传`)
                        return
                    }
                    if (isVideo) {
                        if (fileSize > 50 * 1024 * 1024) {
                            toast.warning(`视频大小不能超过50mb`)
                            return
                        }
                    } else {
                        if (fileSize > 10 * 1024 * 1024) {
                            toast.warning(`单个非视频文件的大小不能超过10mb`)
                            return
                        }
                    }
                    fileList.push({
                        fileName: file.name,
                        file: file,
                        fileMimeType: file.type,
                        filePath: "",
                        fileType: fileType,
                        fileSize: fileSize,
                    })
                }
                for (let file of fileList) {
                    const filePath = await join(await tempDir(), nanoid() + file.fileName);
                    await writeFile(filePath, new Uint8Array(await file.file!.arrayBuffer()))
                    file.filePath = filePath
                    file.file = undefined
                }
                if (fileList.length > 0) {
                    dispatch(setFiles(fileList))
                }
            }
        } finally {
            //清除图片
            const fileUpload = document.getElementById("ai-chat-file-upload");
            if (fileUpload) {
                (fileUpload as HTMLInputElement).value = "";
            }
        }
    }
    /// 剪切板复制
    const handlePaste = async (event: ClipboardEvent) => {
        // 1. 文件/图片粘贴
        if (event.clipboardData?.files && event.clipboardData.files.length > 0) {
          event.preventDefault()
            await handleFileUpload(event.clipboardData.files)
          return
        }
        // 2. 文本粘贴
        const clipboardText = event.clipboardData?.getData('text')
        if (clipboardText && clipboardText.length > 1500) {
          event.preventDefault()
          const f = new File([clipboardText], "temp-"+nanoid(6)+".txt", {
            type: 'text/plain', // 根据实际文件类型设置
            lastModified: Date.now()
          })
          await handleFileUpload([f])
          toast.info("文本过长,转为文件上传")
          return
        }
      }

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto box-border p-4 pt-0">
            <ChatMessageArea scrollButtonAlignment="center" className="py-4">
                <div className="w-full space-y-4 box-border pl-1 pr-4">
                    {messages.map((message, index) => {
                        if (message.role !== "user") {
                            return (
                                <ChatMessage key={message.id} id={message.id}>
                                    <ChatMessageAvatar/>
                                    <div className="select-text">
                                        {
                                            message.reasoning && (
                                                <ChatMessageReasoningContent context={message.reasoning.reasoning_content}
                                                                             status={message.reasoning.reasoning_status}
                                                                             thinkingTime={message.reasoning.reasoning_times}/>
                                            )
                                        }
                                        <MarkdownContent id={"s3-wrap-markdown-content" + index}
                                                         content={message.content}/>
                                    </div>
                                </ChatMessage>
                            );
                        }
                        return (
                            <ChatMessage
                                key={message.id}
                                id={message.id}
                                variant="bubble"
                                type="outgoing"
                            >
                                <div className="space-y-1">
                                    <div className="flex justify-end">
                                        <ChatMessageContent content={message.content}/>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="flex flex-wrap justify-end gap-1 max-w-1/2">
                                            {message.fileNames?.map((fileName) => <FileSelectItem key={fileName}
                                                                                                  fileName={fileName}/>)}
                                        </div>
                                    </div>
                                </div>
                            </ChatMessage>
                        );
                    })}
                </div>
            </ChatMessageArea>
            <div className="w-full">
                {handleOptionChange}
                <ChatInput
                    value={input}
                    className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    onChange={(str) => setInput(str.target.value)}
                    onSubmit={handleSubmitMessage}
                    loading={loading}
                    onStop={() => emitter.emit(STOP_SIGNAL)}
                >
                    {/* 选择模型 */}
                    <div className="w-full space-y-1">
                        <Badge variant="secondary" className="cursor-pointer"
                               onClick={() => setOption('model')}>{selectedModel ? `${selectedModel.name} | ${selectedModel.providerName} ` : '选择模型'}</Badge>
                        {
                            config.files && config.files.length > 0 && (
                                <div className="flex flex-wrap">
                                    {config.files.map((file, index) => <FileSelectItem key={index} fileName={file.fileName}
                                                                                       onDelete={() =>
                                                                                           dispatch(deleteFile(file.fileName))}/>)
                                    }
                                </div>
                            )
                        }
                    </div>
                    <ChatInputTextArea placeholder="请输入问题，shift+enter换行" onPaste={e=>handlePaste(e.nativeEvent)}/>
                    <div className="flex w-full gap-2 justify-between">
                        <div className="flex gap-2 box-border p-2">
                            {/* 联网搜索 */}
                            {
                                selectedModel?.accessTypes.includes('web') && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Globe className="w-4 h-4" color={config.webSearch ? '#3086ff' : undefined}
                                                       onClick={() => dispatch(toggleWebSearch())}/>
                                            </TooltipTrigger>
                                            <TooltipContent>联网搜索</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )
                            }
                            {/* 深度思考 */}
                            {
                                selectedModel?.accessTypes.includes('thinking') && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Brain className="w-4 h-4" color={config.reasoning ? '#7d89d4' : undefined}
                                                       onClick={() => dispatch(toggleReasoning())}/>
                                            </TooltipTrigger>
                                            <TooltipContent>深度思考</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )
                            }
                            {/* 选择文件 */}
                            <input
                                id="ai-chat-file-upload"
                                multiple={true}
                                type="file"
                                className="sr-only hidden"
                                onChange={e=>handleFileUpload(e.target.files)}
                            />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Link className="w-4 h-4"
                                              color={config.files && config.files.length > 0 ? '#ed8536' : undefined}
                                              onClick={() => document.getElementById("ai-chat-file-upload")?.click()}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>选择文件</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {/* 知识库 */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <FileSearch className="w-4 h-4" onClick={() => setOption('knowledge')}
                                                    color={config.knowledge && config.knowledge.length > 0 ? '#00b96b' : undefined}/>
                                    </TooltipTrigger>
                                    <TooltipContent>知识库</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {/* mcp */}
                            {selectedModel?.accessTypes.includes('tool') && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <ServerCog className="w-4 h-4" onClick={() => setOption('mcp')}
                                                       color={config.mcp && config.mcp.length > 0 ? '#ed8536' : undefined}/>
                                        </TooltipTrigger>
                                        <TooltipContent>MCP</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {/* 清楚上下文 */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Eraser className="w-4 h-4"
                                                onClick={() => dispatch(clear())}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>清除上下文</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <ChatInputSubmit/>
                    </div>
                </ChatInput>
            </div>
        </div>
    );
}
