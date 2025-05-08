import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PROVIDER_TYPES, Provider } from "../type"
import { useDB } from "@/hooks/useDB"
import { nanoid } from "nanoid"

type AddProviderDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const defaultProvider: Provider = {
    id: "",
    name: "",
    type: "custom",
    apiKey: "",
    apiUrl: "",
    active: true,
    models: []
}

export function AddProviderDialog({ open, onOpenChange }: AddProviderDialogProps) {
    const { DB } = useDB()
    const [newProvider, setNewProvider] = useState<Provider>(defaultProvider)

    const handleChange = (field: string, value: string) => {
        setNewProvider({ ...newProvider, [field]: value })
        if (field === "type") {
            setNewProvider((prev) => ({ ...prev, apiUrl: PROVIDER_TYPES.find((type) => type.id === value)?.defaultApiUrl || "" }))
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setNewProvider(defaultProvider)
        await DB?.execute(`INSERT INTO ai_model_provider (id, name, type, api_key, api_url, active) VALUES ('${nanoid()}', '${newProvider.name}', '${newProvider.type}', '${newProvider.apiKey}', '${newProvider.apiUrl}', ${newProvider.active})`)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>添加AI模型提供商</DialogTitle>
                        <DialogDescription>配置新的AI模型提供商，并提供API密钥和端点。</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">提供商名称</Label>
                            <Input
                                id="name"
                                value={newProvider.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="请输入提供商名称"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>提供商类型</Label>
                            <RadioGroup
                                value={newProvider.type}
                                onValueChange={(value) => handleChange("type", value)}
                                className="grid grid-cols-2 gap-2"
                            >
                                {PROVIDER_TYPES.map((type) => (
                                    <div key={type.id} className="flex items-center space-x-2 rounded-md border p-2">
                                        <RadioGroupItem value={type.id} id={`type-${type.id}`}/>
                                        <Label htmlFor={`type-${type.id}`} className="flex items-center gap-2 cursor-pointer">
                                            <span className="text-xl">{type.logo}</span>
                                            {type.name}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <Input
                                id="apiKey"
                                value={newProvider.apiKey}
                                onChange={(e) => handleChange("apiKey", e.target.value)}
                                placeholder="sk-..."
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="apiUrl">API URL</Label>
                            <Input
                                id="apiUrl"
                                value={newProvider.apiUrl}
                                disabled={newProvider.type !== "custom"}
                                onChange={(e) => handleChange("apiUrl", e.target.value)}
                                placeholder="https://api.example.com/v1"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            取消
                        </Button>
                        <Button type="submit">添加</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
