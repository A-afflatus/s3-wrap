import {Database, Lock, Palette, Settings2, User} from "lucide-react"
import { cn } from "@/lib/utils"
import {ItemLabel} from "@/pages/modules/settings/type.ts";
import {version} from "package.json";
interface SettingsSidebarProps {
    activeCategory: ItemLabel
    setActiveCategory: (category: ItemLabel) => void
}

export default function SettingsSidebar({ activeCategory, setActiveCategory }: SettingsSidebarProps) {
    const categories: ItemLabel[] = [
        { id: "User", icon: User, label: "用户" },
        { id: "Appearance", icon: Palette, label: "外观" },
        { id: "Security", icon: Lock, label: "安全" },
        { id: "Application", icon: Settings2, label: "应用" },
        { id: "Storage", icon: Database, label: "存储" }
    ]

    return (
        <div className="w-34 border-r">
            <div className="pt-3 pb-1 text-xs text-muted-foreground text-center">
                v{version}
            </div>
            <div className="pr-2">
                <div className="space-y-1">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategory(category)}
                            className={cn(
                                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition-all hover:bg-muted",
                                activeCategory.id === category.id ? "bg-muted" : "text-muted-foreground",
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <category.icon className="h-4 w-4" />
                                <span>{category.label}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

        </div>
    )
}
