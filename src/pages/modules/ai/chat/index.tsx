import {
	ChatInput,
	ChatInputSubmit,
	ChatInputTextArea,
} from "@/components/ui/chat-input";
import {
	ChatMessage,
	ChatMessageAvatar,
	ChatMessageContent,
} from "@/components/ui/chat-message";
import { ChatMessageArea } from "@/components/ui/chat-message-area";
import { Message, useChat } from "@ai-sdk/react";
import { Box, Brain, Eraser, Eye, FileSearch, Globe, Link, PlusIcon, ServerCog, Wrench } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useDB } from "@/hooks/useDB";
import { ModelDetail } from "../model/type";
import { cn } from "@/lib/utils";
import { AI_MODEL } from "@/router/constant";
import { useNavigate } from "react-router-dom";

type ChatOption = 'model' | 'knowledge' | 'mcp';

type ChatConfig = {
	knowledge?: string[];
	mcp?: string[];
	//联网搜索
	internetSearch: boolean;
	//文件
	file?: File[];
};
const defaultMessages: Message[] = [
	{
		id: "1",
		content:
			"Hi! I need help organizing my project management workflow. Can you guide me through some best practices?",
		role: "user",
	},
	{
		id: "2",
		content:
			"I'd be happy to help you with project management best practices! Here's a structured approach:\n\n#### 1. Project Initiation\n- Define clear project objectives\n- Identify key stakeholders\n- Set measurable goals\n- Create project charter\n\n#### 2. Planning Phase\n- Break down work into tasks\n- Set priorities\n- Create timeline\n- Assign responsibilities\n\nWould you like me to elaborate on any of these points?",
		role: "assistant",
	},

]

export default function Chat() {
	const { DB } = useDB()
	const navigate = useNavigate()
	const ref = useRef<HTMLDivElement>(null)
	const [option, setOption] = useState<ChatOption>();
	const [config, setConfig] = useState<ChatConfig>({
		knowledge: [],
		mcp: [],
		internetSearch: false,
		file: [],
	});
	//模型列表
	const [modelList, setModelList] = useState<ModelDetail[]>([])
	//选择的模型
	const [selectedModel, setSelectedModel] = useState<ModelDetail>()

	useEffect(() => {
		DB?.select(`SELECT m.id, m.model_id as modelId, m.name as name, m.access_types as accessTypes, m.active, 
			p.id as providerId, p.name as providerName, p.type as providerType, p.api_url as providerApiUrl, p.api_key as providerApiKey, p.active as providerActive
			FROM ai_model m
			left join ai_model_provider p on m.provider_id = p.id`)
			.then((res) => {
				const models = res as ModelDetail[]
				if (models.length > 0) {
					setModelList(models)
					setSelectedModel(models[0])
				}
			})
	}, [DB])


	//切换配置
	const handleOptionChange = useMemo(() => {
		if (!option) return null;
		// todo 获取对应配置的列表
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
									<div className={cn("flex justify-between items-center rounded-sm hover:bg-gray-200 dark:hover:bg-[#3f3f46] cursor-pointer", model.id === selectedModel?.id && "bg-gray-100 dark:bg-[#27272a]")}
										onClick={() => setSelectedModel(model)}>
										<div className="flex items-center box-border p-1 text-sm gap-1">
											{`${model.name} | ${model.providerName}`}
										</div>
										<div className="flex items-center gap-1 mr-2">
											{/* 视觉*/}
											{model.accessTypes.includes('vision') && <Eye className="w-3 h-3" color="#1cc17b" />}
											{/* 推理*/}
											{model.accessTypes.includes('thinking') && <Brain className="w-3 h-3" color="#7d89d4" />}
											{/* 工具调用*/}
											{model.accessTypes.includes('tool') && <Wrench className="w-3 h-3" color="#ed8536" />}
										</div>
									</div>
								)
							}
							)
						}
					</div>
					{/* 操作 */}
					<div className="flex items-center box-border py-1 text-sm gap-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-[#3f3f46] cursor-pointer"
						onClick={() => {
							if (option === 'model') {
								navigate(AI_MODEL)
							}
						}}
					>
						<PlusIcon className="w-4 h-4" />
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
	}, [option, selectedModel, modelList]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setOption(undefined);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const { messages, input, handleInputChange, handleSubmit, status, stop,setMessages } =
		useChat({
			api: "https://api.deepseek.com",
			headers: {
				'Authorization': `Bearer ${selectedModel?.providerApiKey}`
			},
			initialMessages: [],
			onFinish: (_message) => {

				console.log("onFinish", _message);
			},
		})

	const handleSubmitMessage = () => {
		if (status === "submitted" || status === "streaming") {
			return;
		}
		handleSubmit();
	};

	return (
		<div className="flex-1 flex flex-col h-full overflow-y-auto box-border p-4 pt-0">
			<ChatMessageArea scrollButtonAlignment="center">
				<div className=" w-full py-4 space-y-4">
					{messages.map((message) => {
						if (message.role !== "user") {
							return (
								<ChatMessage key={message.id} id={message.id}>
									<ChatMessageAvatar />
									<ChatMessageContent content={message.content} />
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
								<ChatMessageContent content={message.content} />
							</ChatMessage>
						);
					})}
				</div>
			</ChatMessageArea>
			<div className="w-full">
				{/* 自下而上出现 */}
				{handleOptionChange}
				<ChatInput
					value={input}
					className="[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
					onChange={handleInputChange}
					onSubmit={handleSubmitMessage}
					loading={status === "submitted" || status === "streaming"}
					onStop={stop}
				>
					<ChatInputTextArea placeholder="Type a message..." />
					<div className="flex w-full gap-2 justify-between">
						<div className="flex gap-2 box-border p-2">
							{/* 新会话 */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<PlusIcon className="w-4 h-4" />
									</TooltipTrigger>
									<TooltipContent>新会话</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							{/* 选择模型 */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Box
											className="w-4 h-4 cursor-pointer"
											color={selectedModel ? '#7d89d4' : undefined}
											onClick={() => setOption('model')}
										/>
									</TooltipTrigger>
									<TooltipContent>选择模型</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							{/* 联网搜索 */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<Globe className="w-4 h-4" color={config.internetSearch ? '#3086ff' : undefined} onClick={() => setConfig({ ...config, internetSearch: !config.internetSearch })} />
									</TooltipTrigger>
									<TooltipContent>联网搜索</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							{/* 选择文件 */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<Link className="w-4 h-4" color={config.file && config.file.length > 0 ? '#ed8536' : undefined} />
									</TooltipTrigger>
									<TooltipContent>选择文件</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							{/* 知识库 */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<FileSearch className="w-4 h-4" onClick={() => setOption('knowledge')} color={config.knowledge && config.knowledge.length > 0 ? '#00b96b' : undefined} />
									</TooltipTrigger>
									<TooltipContent>知识库</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							{/* mcp */}
							{selectedModel?.accessTypes.includes('tool') && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger>
											<ServerCog className="w-4 h-4" onClick={() => setOption('mcp')} color={config.mcp && config.mcp.length > 0 ? '#ed8536' : undefined} />
										</TooltipTrigger>
										<TooltipContent>MCP</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
							{/* 清楚上下文 */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<Eraser className="w-4 h-4" onClick={() =>setMessages([])} />
									</TooltipTrigger>
									<TooltipContent>清除上下文</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<ChatInputSubmit />
					</div>
				</ChatInput>
			</div>
		</div>
	);
}
