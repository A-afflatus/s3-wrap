import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Switch} from "@/components/ui/switch"
import {NumberOptions, SelectOptions, Setting, StringOptions} from "@/pages/modules/settings/type.ts";
import {useStore} from "@/hooks/useStore.tsx";
import {useCallback} from "react";

interface SettingItemProps {
    setting: Setting
}

export default function SettingItem({setting}: SettingItemProps) {
    const {store} = useStore()
    const setValue = useCallback(async (k:string,v:any)=>await store?.set(k, v),[store])
    return (
        <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between">
                <div>
                    <Label htmlFor={setting.id} className="text-base">
                        {setting.title}
                    </Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                    {setting.type === "toggle" &&
                        <Switch id={setting.id}
                                onCheckedChange={async (checked) => await setValue(setting.id, checked) }
                                defaultChecked={setting.defaultValue as boolean}/>}
                    {setting.type === "text" && (
                        <Input id={setting.id}
                               onChange={async (e) => await setValue(setting.id, e.target.value)}
                               placeholder={(setting.options as StringOptions).placeholder}
                               minLength={(setting.options as StringOptions)?.minLength}
                               maxLength={(setting.options as StringOptions)?.maxLength}
                               pattern={(setting.options as StringOptions)?.pattern}
                               defaultValue={setting.defaultValue as string}
                               className="w-[250px]"/>
                    )}
                    {setting.type === "number" && (
                        <Input id={setting.id} type="number"
                               onChange={async (e) => {
                                   let value = Number(e.target.value)
                                   const min= (setting.options as NumberOptions)?.min
                                   const max= (setting.options as NumberOptions)?.max
                                   if (min){
                                       value = Math.max(min,value)
                                   }
                                   if (max){
                                       value = Math.min(max,value)
                                   }
                                   await setValue(setting.id, value)
                                   e.target.value = String(value)
                               }}

                               defaultValue={setting.defaultValue as number}
                               className="w-[100px]"/>
                    )}
                    {setting.type === "select" && setting.options && (
                        <Select defaultValue={setting.defaultValue as string}
                                onValueChange={async (value) => await setValue(setting.id, value)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select"/>
                            </SelectTrigger>
                            <SelectContent>
                                {(setting.options as SelectOptions).map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>
        </div>
    )
}
