import SettingItem from "./SettingItem"
import {Separator} from "@/components/ui/separator"
import {ItemLabel, Setting} from "@/pages/modules/settings/type.ts";
import {useStore} from "@/hooks/useStore.tsx";
import {useEffect, useMemo, useState} from "react";

interface SettingsListProps {
    category: ItemLabel
    searchQuery: string
}

export default function SettingsList({category, searchQuery}: SettingsListProps) {
    const {store} = useStore();
    const [config, setConfig] = useState<{ [k: string]: any }>()

    useEffect(() => {
        (async () => {
            const entries = await store?.entries()
            setConfig(Object.fromEntries(entries ?? []))
        })();
    }, [store])

    const settingsData: Record<string, Setting[]> = useMemo(() => ({
        User: [
            {
                id: "settings.user.notifications",
                title: "开启通知",
                description: "接收有关更新和活动的通知。",
                type: "toggle",
                defaultValue: config?.["settings.user.notifications"],
            },
        ],
        Appearance: [
            {
                id: "settings.appearance.theme",
                title: "主题颜色",
                description: "指定应用程序中使用的颜色主题。",
                type: "select",
                options: ["Light", "Dark"],
                defaultValue: config?.["settings.appearance.theme"],
            }
        ],
        Security: [
            {
                id: "settings.security.hideDelete",
                title: "禁止删除",
                description: "禁止应用中的删除功能",
                type: "toggle",
                defaultValue: config?.["settings.security.hideDelete"],
            },
        ],
        Application: [
            {
                id: "settings.application.updateMode",
                title: "更新检测",
                description: "启动时检测更新",
                type: "toggle",
                defaultValue: config?.["settings.application.updateMode"],
            }
        ],
        Storage: [
            {
                id: "settings.storage.clearTransfer",
                title: "清理传输记录",
                description: "传输记录达到置顶数量时会清除旧的传输记录，清除数为“阈值的四分之一”",
                type: "number",
                defaultValue: config?.["settings.storage.clearTransfer"],
                options: {
                    min: 100,
                    max: 3000,
                },
            },
        ]
    }), [config])

    const currentSettings = settingsData[category.id as keyof typeof settingsData] || []

    const filteredSettings = searchQuery
        ? Object.values(settingsData)
            .flat()
            .filter(
                (setting) =>
                    setting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    setting.description.toLowerCase().includes(searchQuery.toLowerCase()),
            )
        : currentSettings

    if (filteredSettings.length === 0) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                没有找到 匹配 "{searchQuery}" 的配置
            </div>
        )
    }

    return config && <div className="space-y-2">
        <div>
            <h2 className="text-xl font-semibold">{searchQuery ? "搜索结果" : category.label}</h2>
            {searchQuery && <p className="text-sm text-muted-foreground">
                {`找到 ${filteredSettings.length} 个配置 匹配 "${searchQuery}"`}
            </p>}
        </div>
        <Separator/>
        <div className="space-y-4">
            {filteredSettings.map((setting) => (
                <SettingItem key={setting.id} setting={setting}/>
            ))}
        </div>
    </div>
}
