import {CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis} from "recharts"
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart"
import dayjs from "dayjs";
import {useDB} from "@/hooks/useDB.tsx";
import {useCallback, useEffect, useState} from "react";

export default function UsageChart() {
    const defaultData = () => [
        {date: dayjs().add(-6, 'day').format("YYYY-MM-DD"), minutes: 0},
        {date: dayjs().add(-5, 'day').format("YYYY-MM-DD"), minutes: 0},
        {date: dayjs().add(-4, 'day').format("YYYY-MM-DD"), minutes: 0},
        {date: dayjs().add(-3, 'day').format("YYYY-MM-DD"), minutes: 0},
        {date: dayjs().add(-2, 'day').format("YYYY-MM-DD"), minutes: 0},
        {date: dayjs().add(-1, 'day').format("YYYY-MM-DD"), minutes: 0},
        {date: dayjs().format("YYYY-MM-DD"), minutes: 1},
    ]
    const [usageData, setUsageData] = useState(defaultData())
    const {DB} = useDB()
    const update = useCallback(() => {
        DB?.select(`select date, minutes
                    from app_service_time
                    where date >= ${dayjs().add(-6, 'day').format("YYYY-MM-DD")}`)
            .then((res) => {
                const list = res as any[]
                setUsageData(defaultData().map(d => {
                    const item = list.find(o => o.date === d.date)
                    return {
                        ...d,
                        minutes: item ? item.minutes : 0,
                    }
                }))
            })
    },[DB])
    useEffect(() => {
        update()
        const interval = setInterval(() => {
            update()
        }, 10 * 1000)
        return () => {
            clearInterval(interval)
        }
    }, [update]);
    return (
        <ChartContainer
            config={{
                minutes: {
                    label: "使用时长（分钟）",
                    color: "hsl(var(--chart-1))",
                },
            }}
            className="h-full"
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usageData} margin={{top: 10, right: 10, left: 10, bottom: 10}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={10}/>
                    <YAxis axisLine={false} tickLine={false} tickMargin={10}/>
                    <ChartTooltip content={<ChartTooltipContent/>}/>
                    <Line
                        type="monotone"
                        dataKey="minutes"
                        stroke="var(--color-minutes)"
                        strokeWidth={2}
                        dot={{r: 4}}
                        activeDot={{r: 6}}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}
