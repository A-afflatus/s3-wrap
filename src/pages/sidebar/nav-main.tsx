import {ArrowRightLeft, BicepsFlexed, Bot, ChevronRight, Gauge, Settings2, Trash, Wrench} from "lucide-react"
import {
    AI_ASSISTANT,
    BUCKETS,
    DASHBOARD,
    NOT_DEV,
    SETTINGS,
    TOOLS,
    TOOLS_BASE64,
    TOOLS_CONVERT,
    TRANSFER_LIST,
} from '@/router/constant'

import {Collapsible, CollapsibleContent, CollapsibleTrigger,} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from "@/components/ui/sidebar"
import {useLocation, useNavigate} from "react-router-dom"
import {useEffect, useState} from "react";
import {cn} from "@/lib/utils.ts";
import {useDB} from "@/hooks/useDB.tsx";




const TransferTip = ({type}: { type: 'download' | 'upload' }) => {
    const [count, setCount] = useState(0);
    const {DB} = useDB()
    const flushCount = () => {
        DB?.select("select count(1) as count from s3_transfer_task where task_type = $1 and status = 'running'", [type])
            .then((rows: any) => {
                setCount(rows[0].count)
            })
            .catch((e) => {
                console.log("查询传输中数量失败", e)
            })
    }
    useEffect(() => {
        flushCount()
        const interval = setInterval(() => {
            flushCount()
        }, 1000);
        return () => {
            clearInterval(interval)
        }
    }, []);

    return count === 0 ? <></> :
        <div className="h-full flex items-center justify-center">
            <div
                className="flex items-center justify-center h-4 w-4 text-xs font-medium rounded-full bg-primary/10 text-primary">
                {count > 9 ? '9+' : count}
            </div>
        </div>

}

// 左侧菜单
const navMain = [
    {
        title: `仪表盘`,
        url: DASHBOARD,
        icon: Gauge,
        isActive: true,
        items: [],
    },
    {
        title: "桶",
        url: BUCKETS,
        icon: Trash,
        items: [],
    },
    {
        title: "功能",
        url: NOT_DEV,
        icon: BicepsFlexed,
        items: [
            {
                title: "事件订阅",
                url: NOT_DEV,
            },
        ],
    },
    {
        title: "工具",
        url: TOOLS,
        icon: Wrench,
        items: [
            {
                title: "图片转换",
                url: TOOLS_CONVERT,
            },
            {
                title: "Base64转码",
                url: TOOLS_BASE64,
            },
        ],
    },
    {
        title: "传输",
        url: TRANSFER_LIST,
        icon: ArrowRightLeft,
        items: [
            {
                title: "上传",
                url: TRANSFER_LIST + "/upload",
                addition: <TransferTip type='upload'/>
            },
            {
                title: "下载",
                url: TRANSFER_LIST + "/download",
                addition: <TransferTip type='download'/>
            },
        ],
    },
    {
        title: "AI",
        url: AI_ASSISTANT,
        icon: Bot,
        items: [
            {
                title: "Chat",
                url: AI_ASSISTANT,
            },
            {
                title: "内容生成",
                url: NOT_DEV,
            },
            {
                title: "语音合成",
                url: NOT_DEV,
            },
        ],
    },
    {
        title: "设置",
        url: SETTINGS,
        icon: Settings2,
    },
]

export function NavMain() {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const {open, openMobile} = useSidebar()
    return (
        <SidebarGroup>
            <SidebarMenu>
                {navMain.map((item) => {
                    const showItem = item.items && item.items.length > 0

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            defaultOpen={item.isActive}
                            className="group/collapsible"
                            onClick={() => (!open && !openMobile || !showItem) && navigate(item.url)}
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild
                                                    className={item.url !== NOT_DEV && pathname.startsWith(item.url) ? "bg-gray-100 dark:bg-[#27272a]" : undefined}>
                                    <SidebarMenuButton tooltip={item.title}>
                                        {item.icon && <item.icon/>}
                                        <span>{item.title}</span>
                                        {showItem ? <ChevronRight
                                            className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"/> : <></>}
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                {showItem ?
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {item.items?.map((subItem: any) => (
                                                <SidebarMenuSubItem key={subItem.title}>
                                                    <SidebarMenuSubButton asChild
                                                                          className={item.url !== NOT_DEV && pathname.startsWith(subItem.url) ? cn("!text-blue-700", "!font-bold") : undefined}
                                                    >
                                                        {/*内容垂直居中*/}
                                                        <div
                                                            className="flex items-center justify-between cursor-pointer"
                                                            onClick={() => navigate(subItem.url)}>
                                                            <a><span className="text-xs">{subItem.title}</span></a>
                                                            {subItem.addition}
                                                        </div>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent> : <></>
                                }
                            </SidebarMenuItem>
                        </Collapsible>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}
