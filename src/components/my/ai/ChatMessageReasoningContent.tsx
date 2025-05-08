
import {useCallback, useState} from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils.ts"

export type ReasoningStatus = "pending" | "done" | "stop";

type ChatMessageReasoningContentProps = {
    status: ReasoningStatus;
    context: string;
    thinkingTime?:number;
};
export function ChatMessageReasoningContent({ status, thinkingTime = 0, context }: ChatMessageReasoningContentProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const thinkingText = useCallback(()=>{
        switch (status) {
            case "done":
                return <span className="">已深度思考 (用时{thinkingTime}秒)</span>
            case "stop":
                return <span className="">思考已停止</span>
            default:
                return <span className="">正在深度思考...</span>
        }
    },[status,thinkingTime])
    return (
        <div className="w-full max-w-3xl">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-1 w-full"
            >
                {thinkingText()}
                {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </button>
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-400  rounded-md",
                    isExpanded ? "opacity-100" : "max-h-0 opacity-0",
                )}
            >
                {isExpanded && <div className="p-4 text-sm box-border whitespace-pre-wrap">{context}</div>}
            </div>
        </div>
    )
}
