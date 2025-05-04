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
import { useChat } from "@ai-sdk/react";
import { Box, Brain, Eraser, Eye, FileSearch, Globe, Link, PlusIcon, ServerCog, Wrench } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRef, useState, useEffect, useMemo } from "react";

type ChatOption = 'model' | 'knowledge' | 'mcp';

type ChatConfig = {
	model?: string;
	knowledge?: string[];
	mcp?: string[];
	//联网搜索
	internetSearch: boolean;
	//文件
	file?: File[];
};

export default function Chat() {
	const ref = useRef<HTMLDivElement>(null)
	const [option, setOption] = useState<ChatOption>();
	const [config, setConfig] = useState<ChatConfig>({
		model: 'deepseek-ai/DeepSeek-R1',
		knowledge: ['1'],
		mcp: ['1'],
		internetSearch: false,
		file: [new File(['test'], 'test.txt', { type: 'text/plain' })],
	});

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
					<div className="">
						<div className="flex justify-between items-center bg-gray-100 dark:bg-[#27272a] rounded-sm hover:bg-gray-200 dark:hover:bg-[#3f3f46] cursor-pointer">
							<div className="flex items-center box-border p-1 text-sm gap-1">
								deepseek-ai/DeepSeek-R1
							</div>
							{option === 'model' && (
								<div className="flex items-center gap-1 mr-2">
									{/* 视觉*/}
									<Eye className="w-3 h-3" color="#1cc17b" />
									{/* 联网*/}
									<Globe className="w-3 h-3" color="#3086ff" />
									{/* 推理*/}
									<Brain className="w-3 h-3" color="#7d89d4" />
									{/* 工具调用*/}
									<Wrench className="w-3 h-3" color="#ed8536" />
								</div>
							)}
						</div>
					</div>
					{/* 操作 */}
					<div className="flex items-center box-border py-1 text-sm gap-0.5 rounded-sm hover:bg-gray-200 dark:hover:bg-[#3f3f46] cursor-pointer"
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
	}, [option]);

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

	const { messages, input, handleInputChange, handleSubmit, status, stop } =
		useChat({
			api: "/api/ai/chat",
			initialMessages: [
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
				{
					id: "3",
					content:
						"Yes, please tell me more about breaking down work into tasks. How should I approach this?",
					role: "user",
				},
				{
					id: "4",
					content:
						"Breaking down work into tasks is crucial for project success. Here's a detailed approach:\n\n##### Work Breakdown Structure (WBS)\n1. **Start with major deliverables**\n   - Identify end goals\n   - List main project phases\n\n2. **Break into smaller components**\n   - Tasks should be:\n     - Specific\n     - Measurable\n     - Achievable\n     - Time-bound\n\n3. **Task Estimation**\n   ```\n   Task Example:\n   - Name: User Authentication Feature\n   - Duration: 3 days\n   - Dependencies: Database setup\n   - Priority: High\n   ```\n\n4. **Use the 8/80 Rule**\n   - Tasks shouldn't take less than 8 hours\n   - Or more than 80 hours\n   - If they do, break them down further",
					role: "assistant",
				},
				{
					id: "5",
					content:
						"That's really helpful! What tools would you recommend for tracking all these tasks?",
					role: "user",
				},
				{
					id: "6",
					content:
						"Here are some popular project management tools:\n\n##### Tips for Tool Selection\n- ✅ Consider team size\n- ✅ Integration needs\n- ✅ Learning curve\n- ✅ Budget constraints\n\nWould you like specific recommendations based on your team's needs?",
					role: "assistant",
				},
				{
					id: "7",
					content:
						"Yes, we're a small team of 5 developers. What would work best for us?",
					role: "user",
				},
				{
					id: "8",
					content:
						"For a team of 5 developers, I'd recommend:\n\n##### Primary Choice: Jira Software\n\n**Advantages:**\n- 🔧 Built for development teams\n- 📊 Great for agile workflows\n- 🔄 Git integration\n- 📱 Mobile apps\n\n##### Alternative: ClickUp\n\n**Benefits:**\n- 💰 Cost-effective\n- 🎨 More flexible\n- 🚀 Faster setup\n\n```\nRecommended Setup:\n- Sprint Length: 2 weeks\n- Board Structure:\n  - Backlog\n  - To Do\n  - In Progress\n  - Code Review\n  - Testing\n  - Done\n- Key Features:\n  - Story Points\n  - Time Tracking\n  - Sprint Reports\n```\n\nWould you like me to explain how to set up the recommended workflow in either of these tools?",
					role: "assistant",
				},
			],
			onFinish: (_message) => {
				//console.log("onFinish", message, completion);
			},
		});

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
											color={config.model ? '#7d89d4' : undefined}
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
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<ServerCog className="w-4 h-4" onClick={() => setOption('mcp')} color={config.mcp && config.mcp.length > 0 ? '#ed8536' : undefined} />
									</TooltipTrigger>
									<TooltipContent>MCP</TooltipContent>
								</Tooltip>
							</TooltipProvider>
							{/* 清楚上下文 */}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger>
										<Eraser className="w-4 h-4" />
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
