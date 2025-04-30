import * as React from "react";
import {useEffect, useState} from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState
} from "@tanstack/react-table";
import {Button} from "@/components/ui/button.tsx";
import {ArrowUpDown, ChevronDown, Database, MoreHorizontal} from "lucide-react";
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
import {IoMdAdd} from "react-icons/io";
import {Input} from "@/components/ui/input.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Bucket, useBucket} from "@/hooks/useBucket.tsx";
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,} from "@/components/ui/breadcrumb.tsx";
import {useCredential} from "@/hooks/useCredential.tsx";
import CreateBucket from "@/pages/modules/buckets/list/modules/CreateBucket.tsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog.tsx";
import {invoke} from "@tauri-apps/api/core";
import {Result} from "@/lib/result.ts";
import {confirm} from "@tauri-apps/plugin-dialog";
import {toast} from "sonner"
import BucketInfo from "@/pages/modules/buckets/list/modules/BucketInfo.tsx";
import {useStore} from "@/hooks/useStore.tsx";


export const BUCKET_LIST_COLUMNS_NAME = {
    name: "名称",
    bucket_region: "地域",
    creation_date: "创建时间",
}

export default () => {
    //不可删除
    const {store} =useStore()
    const [hideDelete, setHideDelete] = useState<boolean>(false)
    useEffect(() => {
        const unListen = (async () => {
            setHideDelete((await store?.get("settings.security.hideDelete")) ?? false)
            return store?.onKeyChange("settings.security.hideDelete", hd => setHideDelete(hd as boolean))
        })();
        return () => {unListen.then(u => u?.())}
    }, [store]);

    const {current} = useCredential()
    const {toggleBucket, refresh, buckets} = useBucket()
    const [isOpen, setIsOpen] = useState(false)
    const [selectedBucket, setSelectedBucket] = useState<{ name: string, createdAt: string }>();

    const columns = React.useMemo<ColumnDef<Bucket>[]>(() => ([
        {
            accessorKey: "name",
            header: ({column}) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        名称
                        <ArrowUpDown/>
                    </Button>
                )
            },
            cell: ({row}) => <div className="box-border pl-4 cursor-pointer"
                                  onClick={() => toggleBucket(row.getValue("name"))}>{row.getValue("name")}</div>,
        },
        {
            accessorKey: "bucket_region",
            header: () => <div className="text-center text-nowrap">地域</div>,
            cell: ({row}) => (
                <div className="text-center">{row.getValue("bucket_region")}</div>
            ),
        },
        {
            accessorKey: "creation_date",
            header: () => <div className="text-center text-nowrap">创建时间</div>,
            cell: ({row}) => {
                const creation_date = row.getValue("creation_date")
                return <div
                    className=" text-center">{dayjs(creation_date as string).format("YYYY-MM-DD HH:mm:ss")}</div>
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({row}) => {
                const bucketName = row.getValue("name") as string;
                const handleDelete = async () => {
                    if (await confirm(`确定要删除Bucket "${bucketName}" 吗？`, {
                        title: '删除bucket',
                        okLabel: '确认',
                        cancelLabel: '取消',
                        kind: 'warning'
                    })) {
                        invoke("delete_bucket", {
                            id: current.id,
                            bucketName: bucketName,
                        }).then(async (r) => {
                            const result = new Result(r);
                            if (result.isSuccess()) {
                                toast.success("删除bucket成功", {richColors: true})
                                refresh();
                            } else {
                                toast.error("删除bucket失败", {description: result.msg});
                            }
                        }).catch(async (error) => {
                            console.error("删除Bucket失败:", error);
                            toast.error("删除bucket失败", {description: error.message});
                        })
                    }
                };

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
                            <DropdownMenuItem onClick={handleDelete}
                                              disabled={hideDelete}
                                              className="text-red-600 focus:text-red-600">删除</DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem onClick={() => {
                                setSelectedBucket({name: bucketName, createdAt: row.getValue("creation_date")})
                                setTimeout(() => {
                                    setIsOpen(true)
                                }, 50)
                            }}>
                                详情
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ]), [toggleBucket, current]);

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

    const table = useReactTable({
        data: buckets,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
    })
    return (
        <>
            {selectedBucket &&
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-scroll">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5"/>
                                <span>{selectedBucket?.name}</span>
                            </DialogTitle>
                            <DialogDescription>存储桶详细信息和配置</DialogDescription>
                        </DialogHeader>
                        <div className="min-h-[500px]">
                        <BucketInfo bucket={selectedBucket}/>
                        </div>
                    </DialogContent>
                </Dialog>
            }
            <div className="flex items-center">
                <Breadcrumb>
                    <BreadcrumbList className="gap-0">
                        <BreadcrumbItem>
                            <BreadcrumbLink className="cursor-pointer">
                                {current.name}
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="flex items-center py-4 gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="gap-0.5"><IoMdAdd/>Bucket</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>创建Bucket</DialogTitle>
                        </DialogHeader>
                        <CreateBucket/>
                    </DialogContent>
                </Dialog>

                <Input
                    placeholder="过滤名称..."
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("name")?.setFilterValue(event.target.value)
                    }
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
                                        {BUCKET_LIST_COLUMNS_NAME[column.id as keyof typeof BUCKET_LIST_COLUMNS_NAME]}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border">
                <Table>
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
                    <TableBody>
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
        </>
    )
}