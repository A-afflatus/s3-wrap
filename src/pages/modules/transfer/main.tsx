import { Download, Upload, } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useDB } from "@/hooks/useDB.tsx";
import { useEffect, useState } from "react";
import { formatFileSize } from "@/lib/utils.ts";
import { useNavigate } from "react-router-dom";
import { TRANSFER_LIST } from "@/router/constant.ts";
import dayjs from "dayjs";

type StatisticsType = {
    uploadCount: number
    downloadCount: number
    uploadSize: number
    downloadSize: number
}
type TrendType = {
    date: string
    upload: number
    download: number
}

export default function CloudStorageStats() {
    const defaultTrend = [
        { date: dayjs().add(-6, 'day').format("YYYY-MM-DD"), upload: 0, download: 0 },
        { date: dayjs().add(-5, 'day').format("YYYY-MM-DD"), upload: 0, download: 0 },
        { date: dayjs().add(-4, 'day').format("YYYY-MM-DD"), upload: 0, download: 0 },
        { date: dayjs().add(-3, 'day').format("YYYY-MM-DD"), upload: 0, download: 0 },
        { date: dayjs().add(-2, 'day').format("YYYY-MM-DD"), upload: 0, download: 0 },
        { date: dayjs().add(-1, 'day').format("YYYY-MM-DD"), upload: 0, download: 0 },
        { date: dayjs().format("YYYY-MM-DD"), upload: 0, download: 0 },
    ]
    const navigate = useNavigate();
    const { DB } = useDB()
    const [statistics, setStatistics] = useState<StatisticsType>({
        uploadCount: 0,
        downloadCount: 0,
        uploadSize: 0,
        downloadSize: 0,
    })
    const [timesTrend, setTimesTrend] = useState<TrendType[]>(defaultTrend)
    const [sizeTrend, setSizeTrend] = useState<TrendType[]>(defaultTrend)

    useEffect(() => {
        //  查询上传
        DB?.select("select count(*) as upload_count, sum(file_size) as upload_size from s3_transfer_task where task_type = 'upload'")
            .then((rows: any) => {
                setStatistics(s => ({
                    ...s,
                    uploadCount: rows[0].upload_count,
                    uploadSize: rows[0].upload_size,
                }))
            })
        // 查询下载
        DB?.select("select count(*) as download_count, sum(file_size) as download_size from s3_transfer_task where task_type = 'download'")
            .then((rows: any) => {
                setStatistics(s => ({
                    ...s,
                    downloadCount: rows[0].download_count,
                    downloadSize: rows[0].download_size,
                }))
            })
        const minDate = dayjs().add(-6, 'day').format("YYYY-MM-DD")
        // 查询上传和下载次数趋势
        DB?.select(`select date(created_time) as date, task_type as taskType, count(*) as times, sum(file_size) as size
                    from s3_transfer_task
                    where date(created_time) >= $1
                    group by task_type, date(created_time)`, [minDate])
            .then((rows: any) => {
                const trends = rows as any[]
                setTimesTrend(list => {
                    return list.map(r => {
                        const u = trends.find(o => o.taskType === 'upload' && r.date === o.date)
                        const d = trends.find(o => o.taskType === 'download' && r.date === o.date)
                        return {
                            ...r,
                            upload: u ? u.times : 0,
                            download: d ? d.times : 0,
                        };
                    })
                })
            })
        // 查询上传和下载容量趋势
        DB?.select(`select date(created_time) as date, task_type as taskType, sum(file_size) as fileSize, sum(file_size) as size
                    from s3_transfer_task
                    where date(created_time) >= $1
                    group by task_type, date(created_time)`, [minDate])
            .then((rows: any) => {
                const trends = rows as any[]
                setSizeTrend(list => {
                    return list.map(r => {
                        const u = trends.find(o => o.taskType === 'upload' && r.date === o.date)
                        const d = trends.find(o => o.taskType === 'download' && r.date === o.date)
                        return {
                            ...r,
                            upload: u ? u.fileSize : 0,
                            download: d ? d.fileSize : 0,
                        };
                    })
                })
            })
    }, []);

    return (
        <main className="space-y-4 box-border p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(TRANSFER_LIST + "/upload")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">总上传文件</CardTitle>
                        <Upload className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.uploadCount.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(TRANSFER_LIST + "/download")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">总下载文件</CardTitle>
                        <Download className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.downloadCount.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(TRANSFER_LIST + "/upload")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">上传总容量</CardTitle>
                        <Upload className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatFileSize(statistics.uploadSize)}</div>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(TRANSFER_LIST + "/download")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">下载总容量</CardTitle>
                        <Download className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatFileSize(statistics.downloadSize)}</div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>上传/下载次数趋势</CardTitle>
                        <CardDescription>过去7天的上传和下载次数趋势</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer
                            config={{
                                uploads: {
                                    label: "上传",
                                    color: "hsl(var(--chart-1))",
                                },
                                downloads: {
                                    label: "下载",
                                    color: "hsl(var(--chart-2))",
                                },
                            }}
                            className="aspect-[4/3]"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={timesTrend.map((r) => ({
                                        ...r,
                                        date: r.date.substring(5, 10),
                                    }))}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="upload"
                                        stroke="var(--color-uploads)"
                                        fill="var(--color-uploads)"
                                        fillOpacity={0.2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="download"
                                        stroke="var(--color-downloads)"
                                        fill="var(--color-downloads)"
                                        fillOpacity={0.2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>上传/下载容量趋势(MB)</CardTitle>
                        <CardDescription>过去7天的上传和下载容量趋势</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer
                            config={{
                                uploads: {
                                    label: "上传",
                                    color: "hsl(var(--chart-1))",
                                },
                                downloads: {
                                    label: "下载",
                                    color: "hsl(var(--chart-2))",
                                },
                            }}
                            className="aspect-[4/3]"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={sizeTrend.map((r) => ({
                                        ...r,
                                        upload: (r.upload / 1024 / 1024).toFixed(2),
                                        download: (r.download / 1024 / 1024).toFixed(2),
                                        date: r.date.substring(5, 10),
                                    }))}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="upload"
                                        stroke="var(--color-uploads)"
                                        fill="var(--color-uploads)"
                                        fillOpacity={0.2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="download"
                                        stroke="var(--color-downloads)"
                                        fill="var(--color-downloads)"
                                        fillOpacity={0.2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
