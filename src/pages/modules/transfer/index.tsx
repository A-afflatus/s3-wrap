import {useEffect, useState} from "react"
import {Calendar, Check, Clock, File, Folder, MoreHorizontal, RefreshCw, Trash2, X,} from "lucide-react"

import {Button} from "@/components/ui/button"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import {Input} from "@/components/ui/input"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {useParams} from "react-router-dom";
import {formatFileSize} from "@/lib/utils.ts";
import {revealItemInDir} from "@tauri-apps/plugin-opener";
import {toast} from "sonner"
import {invoke} from "@tauri-apps/api/core";
import {useDB} from "@/hooks/useDB.tsx";

type TransferTask = {
    id: string
    credential_id: string
    bucket: string
    file_key: string
    file_path: string
    file_size: number
    status: string
    created_time: string
    done_time?: string
    task_type: string
    error_msg?: string
    name?: string
}

//region 展示样式

function getFileIcon(filename?: string) {
    const extension = filename?.split(".").pop()?.toLowerCase()

    switch (extension) {
        case "pdf":
            return <File className="h-4 w-4 text-red-500"/>
        case "jpg":
        case "png":
        case "gif":
            return <File className="h-4 w-4 text-blue-500"/>
        case "docx":
        case "doc":
            return <File className="h-4 w-4 text-indigo-500"/>
        case "xlsx":
        case "xls":
            return <File className="h-4 w-4 text-green-500"/>
        case "zip":
        case "rar":
            return <File className="h-4 w-4 text-yellow-500"/>
        case "mp4":
        case "mov":
            return <File className="h-4 w-4 text-purple-500"/>
        case "mp3":
        case "wav":
            return <File className="h-4 w-4 text-pink-500"/>
        default:
            return <File className="h-4 w-4"/>
    }
}

const renderStatusBadge = (status: string) => {
    switch (status) {
        case "completed":
            return (
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500"/>
                    <span className="text-xs font-medium">已完成</span>
                    <Check className="h-3 w-3 text-green-500"/>
                </div>
            )
        case "running":
            return (
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500"/>
                    <span className="text-xs font-medium">进行中</span>
                    <RefreshCw className="h-3 w-3 text-blue-500 animate-spin"/>
                </div>
            )
        case "failed":
            return (
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-red-500"/>
                    <span className="text-xs font-medium">失败</span>
                    <X className="h-3 w-3 text-red-500"/>
                </div>
            )
        case "queued":
            return (
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-gray-500"/>
                    <span className="text-xs font-medium">排队中</span>
                    <Clock className="h-3 w-3 text-gray-500"/>
                </div>
            )
        default:
            return null
    }
}

// endregion

export default function Index() {
    const {type} = useParams()
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("all")
    const [downloads, setDownloads] = useState<TransferTask[]>([])
    const {DB} = useDB()
    const flush = () => {
        DB?.select("select * from s3_transfer_task where task_type = $1 order by created_time desc limit 1000", [type])
            .then((rows) => {
                setDownloads((rows as TransferTask[]).map((r) => ({
                    ...r,
                    name: r.file_key?.split("/").pop(),
                })))
            })
    }
    useEffect(() => {
        flush()
        const interval = setInterval(() => flush(), 1500)
        return () => clearInterval(interval)
    }, [type]);


    const filteredDownloads = downloads
        .filter((download) => {
            const matchesSearch =
                download.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                download.bucket?.toLowerCase().includes(searchQuery.toLowerCase())

            if (activeTab === "all") return matchesSearch
            if (activeTab === "active") return matchesSearch && ["running", "queued"].includes(download.status)
            if (activeTab === "completed") return matchesSearch && download.status === "completed"
            if (activeTab === "failed") return matchesSearch && download.status === "failed"

            return matchesSearch
        })


    // region 分页
    const totalPages = Math.ceil(filteredDownloads.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedDownloads = filteredDownloads.slice(startIndex, startIndex + itemsPerPage)

    const handleItemsPerPageChange = (value: string) => {
        setItemsPerPage(Number.parseInt(value))
        setCurrentPage(1)
    }

    // Generate pagination items
    const renderPaginationItems = () => {
        const items = []

        // Always show first page
        items.push(
            <PaginationItem key="first">
                <PaginationLink onClick={() => setCurrentPage(1)} isActive={currentPage === 1}>
                    1
                </PaginationLink>
            </PaginationItem>,
        )

        // Show ellipsis if needed
        if (currentPage > 3) {
            items.push(
                <PaginationItem key="ellipsis-1">
                    <span className="flex h-9 w-9 items-center justify-center">...</span>
                </PaginationItem>,
            )
        }

        // Show current page and surrounding pages
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            if (i === 1 || i === totalPages) continue // Skip first and last page as they're always shown
            items.push(
                <PaginationItem key={i}>
                    <PaginationLink onClick={() => setCurrentPage(i)} isActive={currentPage === i}>
                        {i}
                    </PaginationLink>
                </PaginationItem>,
            )
        }

        // Show ellipsis if needed
        if (currentPage < totalPages - 2) {
            items.push(
                <PaginationItem key="ellipsis-2">
                    <span className="flex h-9 w-9 items-center justify-center">...</span>
                </PaginationItem>,
            )
        }

        // Always show last page if there's more than one page
        if (totalPages > 1) {
            items.push(
                <PaginationItem key="last">
                    <PaginationLink onClick={() => setCurrentPage(totalPages)} isActive={currentPage === totalPages}>
                        {totalPages}
                    </PaginationLink>
                </PaginationItem>,
            )
        }

        return items
    }
    //endregion

    // region 操作
    const renderActionMenu = (download: TransferTask) => {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4"/>
                        <span className="sr-only">打开菜单</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {download.status === "completed" && (
                        <DropdownMenuItem className="cursor-pointer"
                                          onClick={() => {
                                              const filePath = download.file_path.split("/");
                                              filePath.pop()
                                              const filePathStr = filePath.join("/")
                                              revealItemInDir(download.file_path)
                                                  .catch(reason => {
                                                      toast.warning("打开文件位置失败", {
                                                          description: <div className="whitespace-pre-wrap">
                                                              <pre>{filePathStr}</pre>
                                                              <p>{reason}</p></div>,
                                                          duration: 3000,
                                                          position: "top-right"
                                                      })
                                                  })

                                          }}>
                            <Folder className="mr-2 h-4 w-4"/>
                            <span>打开位置</span>
                        </DropdownMenuItem>
                    )}

                    {download.status === "failed" && (
                        <DropdownMenuItem className="cursor-pointer"
                                          onClick={async () => {
                                              await DB?.execute("update s3_transfer_task set status = 'queued' where id = $1", [download.id])
                                              await invoke("run_task",{id: download.id})
                                              flush()
                                          }}>
                            <RefreshCw className="mr-2 h-4 w-4"/>
                            <span>重试</span>
                        </DropdownMenuItem>
                    )}

                    {["running", "queued"].includes(download.status) && (
                        <DropdownMenuItem
                            className="cursor-pointer text-destructive"
                            onClick={async () => {
                                await invoke("cancel_task", {id: download.id})
                                flush()
                            }}
                        >
                            <X className="mr-2 h-4 w-4"/>
                            <span>取消</span>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                        className="cursor-pointer text-destructive"
                        onClick={async () => {
                            await DB?.execute("DELETE FROM s3_transfer_task WHERE id = ?", [download.id])
                            flush()
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4"/>
                        <span>从列表中移除</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }
    // endregion
    return (
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min box-border p-4">
            <div className="w-full">
                <div className="flex flex-col gap-4">
                    <Tabs defaultValue="all" className="table-fixed" value={activeTab} onValueChange={v=>{
                        setActiveTab(v)
                        setCurrentPage(1)
                    }}>
                        <div
                            className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <TabsList>
                                <TabsTrigger value="all">全部</TabsTrigger>
                                <TabsTrigger value="active">进行中</TabsTrigger>
                                <TabsTrigger value="completed">已完成</TabsTrigger>
                                <TabsTrigger value="failed">失败</TabsTrigger>
                            </TabsList>

                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                <Input
                                    placeholder="搜索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full sm:w-[250px]"
                                />

                                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue placeholder="10"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <TabsContent value="all" className="m-0 mt-4">
                            <div className="rounded-md border">
                                <Table className="table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead >文件</TableHead>
                                            <TableHead className="w-1/6">大小</TableHead>
                                            <TableHead className="w-1/6">状态</TableHead>
                                            <TableHead className="w-[60px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedDownloads.length > 0 ? (
                                            paginatedDownloads.map((download) => (
                                                <TableRow key={download.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                                                                {getFileIcon(download.name)}
                                                            </div>
                                                            <div className="flex flex-col max-w-3/4 whitespace-nowrap">
                                                                <span className="font-medium overflow-hidden overflow-ellipsis">{download.name}</span>
                                                                <span
                                                                    className="text-xs text-muted-foreground overflow-hidden overflow-ellipsis">{download.bucket}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatFileSize(download.file_size)}</TableCell>
                                                    <TableCell>{renderStatusBadge(download.status)}</TableCell>
                                                    <TableCell>{renderActionMenu(download)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    没有找到传输项。
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="active" className="m-0 mt-4">
                            {/* Same table structure as "all" tab but with filtered data */}
                            <div className="rounded-md border">
                                <Table className="table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>文件</TableHead>
                                            <TableHead className="w-1/6">大小</TableHead>
                                            <TableHead className="w-1/6">状态</TableHead>
                                            <TableHead className="w-[60px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedDownloads.length > 0 ? (
                                            paginatedDownloads.map((download) => (
                                                <TableRow key={download.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                                                                {getFileIcon(download.name)}
                                                            </div>
                                                            <div className="flex flex-col max-w-3/4 whitespace-nowrap">
                                                                <span className="font-medium overflow-hidden overflow-ellipsis">{download.name}</span>
                                                                <span
                                                                    className="text-xs text-muted-foreground overflow-hidden overflow-ellipsis">{download.bucket}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatFileSize(download.file_size)}</TableCell>
                                                    <TableCell>{renderStatusBadge(download.status)}</TableCell>
                                                    <TableCell>{renderActionMenu(download)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    没有找到进行中传输项。
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="completed" className="m-0 mt-4">
                            {/* Same table structure but for completed downloads */}
                            <div className="rounded-md border">
                                <Table className="table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>文件</TableHead>
                                            <TableHead className="w-1/6">大小</TableHead>
                                            <TableHead className="w-1/6">状态</TableHead>
                                            <TableHead className="w-1/4">完成日期</TableHead>
                                            <TableHead className="w-[60px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedDownloads.length > 0 ? (
                                            paginatedDownloads.map((download) => (
                                                <TableRow key={download.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                                                                {getFileIcon(download.name)}
                                                            </div>
                                                            <div className="flex flex-col max-w-3/4 whitespace-nowrap">
                                                                <span className="font-medium overflow-hidden overflow-ellipsis">{download.name}</span>
                                                                <span
                                                                    className="text-xs text-muted-foreground overflow-hidden overflow-ellipsis">{download.bucket}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatFileSize(download.file_size)}</TableCell>
                                                    <TableCell>{renderStatusBadge(download.status)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar
                                                                className="h-3.5 w-3.5 text-muted-foreground"/>
                                                            <span
                                                                className="text-xs">{download.done_time}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{renderActionMenu(download)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    没有找到已完成传输项。
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="failed" className="m-0 mt-4">
                            {/* Same table structure but for failed downloads */}
                            <div className="rounded-md border">
                                <Table className="table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>文件</TableHead>
                                            <TableHead className="w-1/6">大小</TableHead>
                                            <TableHead className="w-1/6">状态</TableHead>
                                            <TableHead className="w-1/4">错误</TableHead>
                                            <TableHead className="w-[60px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedDownloads.length > 0 ? (
                                            paginatedDownloads.map((download) => (
                                                <TableRow key={download.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                                                                {getFileIcon(download.name)}
                                                            </div>
                                                            <div className="flex flex-col max-w-3/4 whitespace-nowrap">
                                                                <span className="font-medium overflow-hidden overflow-ellipsis">{download.name}</span>
                                                                <span
                                                                    className="text-xs text-muted-foreground overflow-hidden overflow-ellipsis">{download.bucket}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatFileSize(download.file_size)}</TableCell>
                                                    <TableCell>{renderStatusBadge(download.status)}</TableCell>
                                                    <TableCell>
                                                            <span
                                                                className="text-xs text-red-500">{download.error_msg}</span>
                                                    </TableCell>
                                                    <TableCell>{renderActionMenu(download)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    没有找到失败传输项。
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground text-nowrap">
                            共 <strong>{filteredDownloads.length}</strong> 条
                        </div>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>

                                {renderPaginationItems()}

                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            </div>
        </div>
    )
}