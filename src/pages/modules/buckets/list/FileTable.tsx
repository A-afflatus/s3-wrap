import * as React from "react";
import {useCallback, useEffect, useRef, useState} from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable
} from "@tanstack/react-table";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {
    MdDeleteOutline,
    MdDownload,
    MdFolder, MdInfoOutline,
    MdOutlineContentCopy,
    MdOutlineCreateNewFolder,
    MdOutlineInsertDriveFile,
    MdOutlineInsertLink,
    MdOutlineRefresh,
    MdOutlineSimCardDownload,
    MdUploadFile
} from "react-icons/md";
import dayjs from "dayjs";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {ChevronDown, Database, MoreHorizontal} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {useCredential} from "@/hooks/useCredential.tsx";
import {useBucket} from "@/hooks/useBucket.tsx";
import {Result} from "@/lib/result.ts";
import {confirm, open} from "@tauri-apps/plugin-dialog";
import {size} from "@tauri-apps/plugin-fs";

import {toast} from "sonner"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb.tsx";
import {debounce} from "lodash";
import {formatFileSize} from "@/lib/utils";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import CreateFolder from "@/pages/modules/buckets/list/modules/CraeteFolder.tsx";
import {invoke} from "@tauri-apps/api/core";
import GetObjectUrl from "./modules/GetObjectUrl";
import {writeText} from '@tauri-apps/plugin-clipboard-manager';
import {useNavigate} from "react-router-dom";
import {TRANSFER_LIST} from "@/router/constant";
import {S3File, S3ObjectList} from "@/pages/modules/buckets/list/type";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import ObjectInfo from "@/pages/modules/buckets/list/modules/ObjectInfo.tsx";
import {useStore} from "@/hooks/useStore.tsx";

type SearchListObjectsReq = {
    id?: string;
    bucket?: string;
    maxKeys?: number;
    prefix?: string;
    continuationToken?: string;
}

const getFiles = (req: S3ObjectList): S3File[] => {
    const list: S3File[] = []
    req.common_prefixes.forEach((item) => {
        const path = item.prefix.split("/")
        path.pop()
        list.push({
            key: item.prefix,
            name: path.pop()!,
            type: "dir"
        })
    })
    req.contents.forEach((item) => {
        if (item.key.endsWith("/")) {
            return
        }
        list.push({
            key: item.key,
            last_modified: item.last_modified,
            e_tag: item.e_tag,
            size: item.size,
            name: item.key.split("/").pop()!,
            type: "file"
        })
    })
    return list;

}

const BUCKET_FILE_LIST_COLUMNS_NAME = {
    name: "名称",
    size: "大小",
    last_modified: "修改时间",
}
const getPath = (filePath: string[]): string => {
    return filePath.length === 0 ? "" : filePath.join("/") + "/"
}


export default () => {
    const [hideDelete, setHideDelete] = useState<boolean>(false)
    const {store} = useStore()
    useEffect(() => {
        const unListen = (async () => {
            setHideDelete((await store?.get("settings.security.hideDelete")) ?? false)
            return store?.onKeyChange("settings.security.hideDelete", hd => setHideDelete(hd as boolean))
        })();
        return () => {unListen.then(u => u?.())}
    }, [store]);
    const navigate = useNavigate()
    const {current} = useCredential()
    const {currentBucket, toggleBucket} = useBucket()
    const searchRef = useRef(null);
    const [rowSelection, setRowSelection] = React.useState({})
    const [objLinkOpen, setObjLinkOpen] = React.useState(false)
    const [currentKey, setCurrentKey] = React.useState<string>()
    const [reFlushDisabled, setReFlushDisabled] = React.useState(false)
    const [filePath, setFilePath] = React.useState<string[]>([])
    const [objDetailOpen, setObjDetailOpen] = React.useState(false)
    const [data, setData] = React.useState<S3File[]>([])
    const [s3ObjectList, setS3ObjectList] = React.useState<S3ObjectList>({contents: [], common_prefixes: []})
    const searchObjects = useCallback((req: SearchListObjectsReq) => {
        invoke("list_objects", {
            maxKeys: 10,
            id: current.id,
            bucket: currentBucket?.name,
            ...req
        }).then(async (r) => {
            const result: Result<S3ObjectList> = new Result(r);
            if (result.isSuccess()) {
                setS3ObjectList(result.data!)
                const list = req.prefix?.split("/") ?? []
                list?.pop()
                setFilePath(list)
            } else {
                toast.error("查询对象列表失败", {description: result.msg});
            }
        })
    }, []);
    const searchPath = useCallback(debounce((path: string) => searchObjects({prefix: path}), 300), [searchObjects])
    const columns = React.useMemo<ColumnDef<S3File>[]>(() => ([
        {
            id: "select",
            header: ({table}) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({row}) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: () => <div className="">名称</div>,
            cell: ({row}) => {
                const rowData = row.original
                const isDir = rowData.type === "dir";
                return <div
                    className="box-border cursor-pointer flex gap-0.5 items-center"
                    onClick={() => {
                        if (isDir) {
                            searchObjects({prefix: rowData.key})
                        }
                    }}
                >
                    {isDir ? <MdFolder className="scale-125"/> : <MdOutlineInsertDriveFile className="scale-125"/>}
                    <div className="w-[300px] whitespace-nowrap overflow-hidden overflow-ellipsis"
                         onClick={() => { rowData.type === "file" && (setCurrentKey(rowData.key),setObjDetailOpen(true)) }}
                         title={row.getValue("name")}>
                        {row.getValue("name")}
                    </div>
                </div>
            },
        },
        {
            accessorKey: "size",
            header: () => <div className="text-center text-nowrap">大小</div>,
            cell: ({row}) => (
                <div className="text-center">{formatFileSize(row.getValue("size"))}</div>
            ),
        },
        {
            accessorKey: "last_modified",
            header: () => <div className="text-center text-nowrap">修改时间</div>,
            cell: ({row}) => {
                const creation_date = row.getValue("last_modified")
                return <div
                    className="text-center">{dayjs(creation_date as string).format("YYYY-MM-DD HH:mm:ss")}</div>
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({row}) => {
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem onClick={async () => {
                                await writeText(row.original.key)
                                toast.success("已复制到粘贴板")
                            }}>
                                <MdOutlineContentCopy/>
                                复制Key
                            </DropdownMenuItem>
                            {
                                row.original.type === 'file' &&
                                <>
                                    <DropdownMenuItem onClick={() => {
                                        setCurrentKey(row.original.key)
                                        setTimeout(() => setObjLinkOpen(true), 50)
                                    }}>
                                        <MdOutlineInsertLink/>
                                        获取链接
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => downloadFiles([row.original])}>
                                        <MdDownload/>
                                        下载
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-500 focus:text-red-500 hover:text-red-500"
                                                      disabled={hideDelete}
                                                      onClick={() => deleteObjects([row.original.key])}>
                                        <MdDeleteOutline/>
                                        删除
                                    </DropdownMenuItem>
                                </>
                            }
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem onClick={()=>{
                                setCurrentKey(row.original.key)
                                setTimeout(() => setObjDetailOpen(true), 50)
                            }}>
                                <MdInfoOutline/>
                                查看属性
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]), [hideDelete])
    const createFolderRef = React.useRef(null)
    const refresh = () => {
        const searchStr = (searchRef.current as any)?.value ?? "";
        searchObjects({prefix: getPath(filePath) + searchStr})
    }

    const downloadFiles = async (files: S3File[]) => {
        files = files.filter((file) => file.type !== "dir")
        if (files.length === 0) {
            toast.warning("至少选择一个文件(文件目录不支持下载)")
            return
        }
        invoke("create_download_task", {
            id: current.id,
            bucket: currentBucket?.name,
            keys: files.map(f => ({
                key: f.key,
                size: f.size
            }))
        }).then(async (r) => {
            const result = new Result(r)
            if (result.isSuccess()) {
                toast.success('后台下载中...', {
                    duration: 3000,
                    action: {
                        label: "前往查看",
                        onClick: () => navigate(TRANSFER_LIST+'/download'),
                    },
                })
                refresh()
            } else {
                toast.error('下载文件失败', {
                    description: result.msg
                })
            }
        }).catch(async (e) => {
            console.log("下载文件失败", e);
            toast.error('下载文件失败', {
                description: e.message
            })
        })


    }
    const deleteObjects = async (keys: string[]) => {
        if (await confirm(`此操作不可恢复，确认删除吗\n(无法删除非空目录)`, {
            title: '删除对象',
            okLabel: '确认',
            cancelLabel: '取消',
            kind: 'warning'
        })) {
            console.log("选中的列表", keys)
            invoke("delete_objects", {
                id: current.id,
                bucket: currentBucket?.name,
                keys
            }).then(async (r) => {
                const result = new Result(r);
                if (result.isSuccess()) {
                    setRowSelection({})
                    refresh()
                } else {
                    toast.error("删除对象失败", {description: result.msg});
                }
            })
        }
    }

    React.useEffect(() => {
        searchObjects({})
    }, [])
    React.useEffect(() => {
        setData(getFiles(s3ObjectList))
    }, [s3ObjectList])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            rowSelection,
        },
    })
    const selected = Object.keys(rowSelection).length > 0

    const uploadFiles = async () => {
        const selectedFiles = await open({
            title: "选择需要上传的文件",
            multiple: true,
            directory: false,
            filters: [],
        });
        if (!selectedFiles) {
            return
        }
        if (selectedFiles.length === 1 && (await size(selectedFiles[0])) < 1024 * 1024 * 5) {
            //同步上传
            invoke("put_object", {
                id: current.id,
                bucket: currentBucket?.name,
                key: `${getPath(filePath)}${selectedFiles[0].split("/").pop()}`,
                filePath: selectedFiles[0]
            }).then(async (r) => {
                const result = new Result(r)
                if (result.isSuccess()) {
                    toast.success('上传文件成功')
                    refresh()
                } else {
                    toast.error('上传文件失败', {
                        description: result.msg
                    })
                }
            }).catch(async (e) => {
                console.log("上传文件失败", e);
                toast.error('上传文件失败', {
                    description: e.message
                })
            })
        } else {
            //上传任务
            invoke("create_upload_task", {
                id: current.id,
                bucket: currentBucket?.name,
                basePath: getPath(filePath),
                fileList: selectedFiles
            }).then(async (r) => {
                const result = new Result(r)
                if (result.isSuccess()) {
                    toast.success('后台上传中...', {
                        duration: 3000,
                        action: {
                            label: "前往查看",
                            onClick: () => navigate(TRANSFER_LIST+'/upload'),
                        },
                    })
                    refresh()
                } else {
                    toast.error('上传文件失败', {
                        description: result.msg
                    })
                }
            }).catch(async (e) => {
                console.log("上传文件失败", e);
                toast.error('上传文件失败', {
                    description: e.message
                })
            })
        }
    };

    return (
        <>
            {currentKey &&
                <Dialog open={objDetailOpen} onOpenChange={setObjDetailOpen}>
                    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-scroll">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5"/>
                                <span className="truncate max-w-[300px]" title={currentKey}>{currentKey}</span>
                            </DialogTitle>
                            <DialogDescription>对象详细信息和配置</DialogDescription>
                        </DialogHeader>
                        <div className="min-h-[350px]">
                            <ObjectInfo getKey={()=>currentKey??""}/>
                        </div>
                    </DialogContent>
                </Dialog>
            }
            <GetObjectUrl open={objLinkOpen} setOpen={setObjLinkOpen} getCurrentKey={() => currentKey??""}/>
            <div className="flex items-center">
                <Breadcrumb>
                    <BreadcrumbList className="gap-0">
                        <BreadcrumbItem>
                            <BreadcrumbLink className="cursor-pointer" onClick={() => toggleBucket()}>
                                {current.name}
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        {
                            currentBucket ? <>
                                <BreadcrumbSeparator/>
                                <BreadcrumbItem>
                                    <BreadcrumbLink className="cursor-pointer" onClick={() => searchObjects({})}>
                                        {currentBucket.name}
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                            </> : <></>
                        }
                        {
                            filePath.map((item, index) =>
                                <>
                                    <BreadcrumbSeparator/>
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className={"cursor-pointer"}
                                                        onClick={() => searchObjects({prefix: filePath.slice(0, index + 1).join("/") + "/"})}>{item}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </>
                            )
                        }
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="flex items-center py-4 gap-2">
                <div className="flex gap-1">
                    {/*刷新页面*/}
                    <Button className="p-3" variant="outline" disabled={reFlushDisabled}
                            onClick={() => {
                                setReFlushDisabled(true)
                                setTimeout(() => {
                                    setReFlushDisabled(false)
                                }, 500)
                                refresh()
                            }
                            }
                    ><MdOutlineRefresh
                        className="scale-125"/></Button>
                    {/*上传文件*/}
                    <Button className="p-3" variant="outline" onClick={() => uploadFiles()}>
                        <MdUploadFile className="scale-125"/>
                    </Button>
                    {/*创建目录*/}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button className="p-3" variant="outline">
                                <MdOutlineCreateNewFolder className="scale-125"/>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent ref={createFolderRef}>
                            <CreateFolder
                                basePath={getPath(filePath)}
                                onDone={() => {
                                    (createFolderRef.current as any).hidden = true
                                    refresh()
                                }}/>
                        </PopoverContent>
                    </Popover>
                    {/*下载*/}
                    <Button className="p-3" variant="outline" disabled={!selected}
                            onClick={() => downloadFiles(Object.keys(rowSelection).map(i => data[i as unknown as number]))}>
                        <MdOutlineSimCardDownload className="scale-125"/>
                    </Button>
                    {/*删除*/}
                    <Button className="p-3" variant="destructive" disabled={!selected || hideDelete}
                            onClick={() => deleteObjects(Object.keys(rowSelection).map(i => data[i as unknown as number].key))}>
                        <MdDeleteOutline className="scale-125"/>
                    </Button>
                </div>
                {/*搜索对象*/}
                <Input
                    placeholder="过滤名称..."
                    ref={searchRef}
                    onKeyDown={(e) => e.key === '/' && e.preventDefault()}
                    onChange={(event) => searchPath(getPath(filePath) + event.target.value)}
                    className="max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            列 <ChevronDown/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(value)
                                        }
                                    >
                                        {BUCKET_FILE_LIST_COLUMNS_NAME[column.id as keyof typeof BUCKET_FILE_LIST_COLUMNS_NAME]}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border">
                <Table className="">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody className="overflow-y-scroll">
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    无结果
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    本页对象数：{table.getFilteredRowModel().rows.length}
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchObjects({prefix:  filePath.join("/") === "" ? "" : filePath.join("/") + "/"})}
                        disabled={!s3ObjectList.continuation_token}
                    >
                        首页
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchObjects({
                            prefix: filePath.join("/") === "" ? "" : filePath.join("/") + "/",
                            continuationToken: s3ObjectList.next_continuation_token
                        })}
                        disabled={!s3ObjectList.next_continuation_token}
                    >
                        下一页
                    </Button>
                </div>
            </div>
        </>
    )
}