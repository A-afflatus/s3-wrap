import {useState} from "react"
import {Search} from "lucide-react"

import SettingsSidebar from "./modules/SettingsSidebar"
import SettingsList from "./modules/SettingsList"
import {Input} from "@/components/ui/input"
import {ItemLabel} from "@/pages/modules/settings/type.ts";

export default () => {
    const [activeCategory, setActiveCategory] = useState<ItemLabel>( { id: "User", label: "用户" })
    const [searchQuery, setSearchQuery] = useState("")

    return (
        <div className="min-h-[100vh] flex flex-1 rounded-xl bg-muted/50 md:min-h-min box-border">
            <SettingsSidebar activeCategory={activeCategory} setActiveCategory={setActiveCategory}/>
            <div className="flex-1 overflow-auto rounded-tr-xl">
                <div className="sticky top-0 z-10 border-b bg-muted/50 p-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
                        <Input
                            type="text"
                            placeholder="搜索设置"
                            className="pl-8 bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="p-4">
                    <SettingsList category={activeCategory} searchQuery={searchQuery}/>
                </div>
            </div>
        </div>
    )
}
