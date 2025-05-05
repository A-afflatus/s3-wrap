import { useEffect, useState } from "react"
import { PlusIcon, Trash2Icon, Edit2Icon, CheckIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AddProviderDialog } from "./moudles/AddProviderDialog"
import { Badge } from "@/components/ui/badge"
import { Model, Provider, PROVIDER_TYPES } from "./type"
import { confirm } from "@tauri-apps/plugin-dialog"
import { useNavigate } from "react-router-dom"
import { AI_MODEL } from "@/router/constant"
import { useDB } from "@/hooks/useDB"

export default function Providers() {
    const navigate = useNavigate()
    const { DB } = useDB()
    const [refresh, setRefresh] = useState(false)
    const [providers, setProviders] = useState<Provider[]>([])
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [currentProvider, setCurrentProvider] = useState<Provider>()

    useEffect(() => {
        DB?.select(`SELECT id, name, type, api_key as apiKey, api_url as apiUrl, active FROM ai_model_provider`)
        .then((res) => {
            const providers = res as Provider[]
            DB?.select(`SELECT id, model_id as modelId, name, provider_id as providerId, active FROM ai_model where provider_id in (${providers.map((row) => `'${row.id}'`).join(',')})`)
            .then((res1) => {
                const models = res1 as Model[]
                providers.forEach((provider) => {
                    const modelList = models.filter((model) => model.providerId === provider.id)
                    provider.models = modelList
                })
                setProviders(providers)
            })
        })
    }, [DB,setProviders,refresh])

    const handleDeleteProvider = async (id: string) => {
        if (await confirm(`确认删除当前提供商信息吗？`, {title: '删除提供商', okLabel: '确认', cancelLabel: '取消', kind: 'warning'})) {
            await DB?.execute(`DELETE FROM ai_model_provider WHERE id = '${id}'`)
            setRefresh(!refresh)
        }
    }

    const handleToggleActive = async (id: string) => {
        await DB?.execute(`UPDATE ai_model_provider SET active = ${!providers.find((provider) => provider.id === id)?.active} WHERE id = '${id}'`)
        setRefresh(!refresh)
    }

    const handleSubmitUpdateProvider = async (id: string, provider: Provider) => {
        await DB?.execute(`UPDATE ai_model_provider SET name = '${provider.name}', type = '${provider.type}', api_key = '${provider.apiKey}', api_url = '${provider.apiUrl}', active = ${provider.active} WHERE id = '${id}'`)
        setCurrentProvider(undefined)
        setRefresh(!refresh)
    }

    const handleSelectProvider = (id: string) => {
        navigate(`${AI_MODEL}/${id}`)
    }

    return (
        <div className="h-full overflow-y-auto box-border p-4 pt-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <AddProviderDialog
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                    setIsAddDialogOpen(open)
                    setRefresh(!refresh)
                }}
            />
            <div className="w-full h-full flex flex-col gap-4">
                <Button onClick={() => setIsAddDialogOpen(true)} className="w-full">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    添加模型提供商
                </Button>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {providers.map((provider) => {
                        const providerType = PROVIDER_TYPES.find((type) => type.id === provider.type)
                        const isEditing = currentProvider?.id === provider.id

                        return (
                            <Card key={provider.id} className={`${!provider.active ? "opacity-70" : ""}`}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-2xl">{providerType?.logo}</span>
                                            {isEditing ? (
                                                <Input
                                                    value={currentProvider?.name}
                                                    onChange={(e) => setCurrentProvider({...currentProvider, name: e.target.value})}
                                                    className="h-8 w-40"
                                                />
                                            ) : (
                                                <CardTitle>{provider.name}</CardTitle>
                                            )}
                                        </div>
                                        <Badge variant={provider.active ? "default" : "outline"}>
                                            {provider.active ? "开启" : "关闭"}
                                        </Badge>
                                    </div>
                                    <CardDescription>{providerType?.name}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="space-y-1">
                                            <Label>API Key</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={currentProvider?.apiKey}
                                                    onChange={(e) => setCurrentProvider({...currentProvider, apiKey: e.target.value})}
                                                    type="password"
                                                    className="font-mono text-sm"
                                                />
                                            ) : (
                                                <div className="font-mono text-sm truncate">{provider.apiKey}</div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <Label>API URL</Label>
                                            {isEditing ? (
                                                <Input
                                                    value={currentProvider?.apiUrl}
                                                    onChange={(e) => setCurrentProvider({...currentProvider, apiUrl: e.target.value})}
                                                    className="font-mono text-sm"
                                                />
                                            ) : (
                                                <div className="font-mono text-sm truncate">{provider.apiUrl}</div>
                                            )}
                                        </div>
                                        <div className="pt-2">
                                            <div className="text-sm text-muted-foreground">{provider.models.length} 个模型可用</div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={provider.active}
                                            onCheckedChange={async () => await handleToggleActive(provider.id)}
                                            id={`active-${provider.id}`}
                                        />
                                    </div>
                                    <div className="flex space-x-2">
                                        {isEditing ? (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => setCurrentProvider(undefined)}>
                                                    <XIcon className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" onClick={async () => await handleSubmitUpdateProvider(provider.id, currentProvider)}>
                                                    <CheckIcon className="h-4 w-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => handleSelectProvider(provider.id)}>
                                                    模型管理
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setCurrentProvider(provider)}>
                                                    <Edit2Icon className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteProvider(provider.id)}>
                                                    <Trash2Icon className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}
