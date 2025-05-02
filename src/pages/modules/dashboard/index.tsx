import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {ArrowLeftRight, Database, Timer} from "lucide-react"
import UsageChart from "./UsageChat.tsx"
import {useDB} from "@/hooks/useDB.tsx";
import {useEffect, useState} from "react";
import {formatFileSize, formatMinuteDuration} from "@/lib/utils.ts";

export default function DashboardPage() {
    const {DB} = useDB();
    const [data, setData] = useState<{ credentialCount?: number, transferSize?: number, minutesCount?: number }>()

    useEffect(() => {
        DB?.select(`select count(1) as count
                    from credentials`)
            .then((rows: any) => {
                setData(obj => ({
                    ...obj,
                    credentialCount: rows[0].count
                }))
            })
        DB?.select(`select sum(file_size) as count
                    from s3_transfer_task
                    where status = 'completed'`)
            .then((rows: any) => {
                setData(obj => ({
                    ...obj,
                    transferSize: rows[0].count
                }))
            })
        DB?.select(`select sum(minutes) as count
                    from app_service_time`)
            .then((rows: any) => {
                setData(obj => ({
                    ...obj,
                    minutesCount: rows[0].count
                }))
            })
    }, [DB]);


    return (
        <div className="box-border p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">凭证数量</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.credentialCount ?? "*"}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">历史传输量</CardTitle>
                        <ArrowLeftRight className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold">{data?.transferSize ? formatFileSize(data.transferSize) : "*"}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">应用使用时长</CardTitle>
                        <Timer className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="text-2xl font-bold">{data?.minutesCount ? formatMinuteDuration(data.minutesCount) : "*"}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Usage Chart */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>最近7天应用使用时长（分钟）</CardTitle>
                </CardHeader>
                <CardContent>
                    <UsageChart/>
                </CardContent>
            </Card>
        </div>
    )
}
