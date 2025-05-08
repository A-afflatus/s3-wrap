import { useEffect, useState } from "react"
import {ArrowLeftIcon, Brain, Eye, PlusIcon, Trash2Icon, Wrench, PencilIcon, Globe} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Model, Provider } from "./type"
import { useNavigate, useParams } from "react-router-dom"
import { AI_MODEL } from "@/router/constant"
import { useDB } from "@/hooks/useDB"
import { nanoid } from "nanoid"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export default function ProviderModels() {
  const navigate = useNavigate()
  const { DB } = useDB()
  const { id } = useParams()
  const [refresh, setRefresh] = useState(false)
  const [provider, setProvider] = useState<Provider>()
  const [newModelName, setNewModelName] = useState("")
  const [newModelId, setNewModelId] = useState("")
  const [newModelSupport, setNewModelSupport] = useState<string[]>(['text'])
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [editModelName, setEditModelName] = useState("")
  const [editModelId, setEditModelId] = useState("")
  const [editModelSupport, setEditModelSupport] = useState<string[]>([])

  useEffect(() => {
    DB?.select(`SELECT id, name, type, api_key as apiKey, api_url as apiUrl, active FROM ai_model_provider WHERE id = '${id}' limit 1`)
      .then((res) => {
        const providers = res as Provider[]
        if (providers.length > 0) {
          const provider = providers[0]
          DB?.select(`SELECT id, model_id as modelId, name, provider_id as providerId, active, access_types as accessTypes FROM ai_model WHERE provider_id = '${provider.id}'`)
            .then((res) => {
              const models = res as Model[]
              setProvider({ ...provider, models })
            })
        }
      })
  }, [DB, id, setProvider, refresh])

  const handleAddModel = async () => {
    if (provider && newModelId && newModelName) {
      await DB?.execute(`INSERT INTO ai_model (id, model_id, name, provider_id, active, access_types) VALUES ('${nanoid()}', '${newModelId}', '${newModelName}','${provider.id}', ${true}, '${newModelSupport.join(',')}')`)
      setNewModelId("")
      setNewModelName("")
      setNewModelSupport(['text'])
      setRefresh(!refresh)
    }
  }

  const handleDeleteModel = async (id: string) => {
    await DB?.execute(`DELETE FROM ai_model WHERE id = '${id}'`)
    setRefresh(!refresh)
  }

  const handleToggleModel = async (id: string) => {
    await DB?.execute(`UPDATE ai_model SET active = ${!provider?.models.find((model) => model.id === id)?.active} WHERE id = '${id}'`)
    setRefresh(!refresh)
  }

  const handleChangeModelSupport = (type: string, checked: boolean) => {
    if (checked) {
      setNewModelSupport([...newModelSupport, type])
    } else {
      setNewModelSupport(newModelSupport.filter((t) => t !== type))
    }
  }

  const handleEditModel = async () => {
    if (editingModel && editModelId && editModelName) {
      await DB?.execute(`UPDATE ai_model SET model_id = '${editModelId}', name = '${editModelName}', access_types = '${editModelSupport.join(',')}' WHERE id = '${editingModel.id}'`)
      setEditingModel(null)
      setEditModelId("")
      setEditModelName("")
      setEditModelSupport([])
      setRefresh(!refresh)
    }
  }

  const openEditDialog = (model: Model) => {
    setEditingModel(model)
    setEditModelId(model.modelId)
    setEditModelName(model.name)
    setEditModelSupport(model.accessTypes.split(',').filter(type => type.trim() !== ''))
  }

  const handleChangeEditModelSupport = (type: string, checked: boolean) => {
    if (checked) {
      setEditModelSupport([...editModelSupport, type])
    } else {
      setEditModelSupport(editModelSupport.filter((t) => t !== type))
    }
  }

  return (
    <div className="h-full overflow-y-auto box-border p-4 pt-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" onClick={() => navigate(AI_MODEL)} className="mr-2">
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-lg font-medium">{provider?.name} 模型列表</h3>
          <p className="text-sm text-muted-foreground">配置和管理可用的模型</p>
        </div>
      </div>
      <div className="p-4 box-border gap-4 grid grid-cols-1">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">可用的模型</h3>
            <p className="text-sm text-muted-foreground">该提供商可以使用的模型</p>
          </div>
        </div>

        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">模型ID</th>
                <th className="p-3 text-left font-medium">名称</th>
                <th className="p-3 text-left font-medium">模型能力</th>
                <th className="p-3 text-left font-medium">状态</th>
                <th className="p-3 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {provider?.models.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-muted-foreground">
                    没有可用的模型。添加一个模型。
                  </td>
                </tr>
              ) : (
                provider?.models.map((model) => (
                  <tr key={model.id} className="border-b">
                    <td className="p-3 font-mono text-sm">{model.modelId}</td>
                    <td className="p-3">{model.name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {
                          model.accessTypes.split(',')
                            .sort((a, b) => a.localeCompare(b))
                            .filter((type) => type.trim() !== '')
                            .filter((type) => type.trim() !== 'text')
                            .map((type) => {
                              switch (type.trim()) {
                                case 'vision':
                                  return <Eye key={`model-${model.id}-${type}`} className="w-4 h-4" color="#1cc17b" />
                                case 'web':
                                  return <Globe key={`model-${model.id}-${type}`} className="w-4 h-4" color="#3086ff" />
                                case 'thinking':
                                  return <Brain key={`model-${model.id}-${type}`} className="w-4 h-4" color="#7d89d4" />
                                case 'tool':
                                  return <Wrench key={`model-${model.id}-${type}`} className="w-4 h-4" color="#ed8536" />
                              }
                            })
                        }
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant={model.active ? "default" : "outline"}>
                        {model.active ? "可用" : "禁用"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={model.active}
                          onCheckedChange={() => handleToggleModel(model.id)}
                          id={`model-active-${model.id}`}
                        />
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(model)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteModel(model.id)}>
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">手动添加模型</h3>
            <p className="text-sm text-muted-foreground">手动添加一个模型，并配置模型ID和显示名称</p>
          </div>

          <div className="gap-4 grid grid-cols-2">
            <div className="grid gap-2 col-span-1">
              <Label htmlFor="model-id">模型ID</Label>
              <Input
                id="model-id"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                placeholder="e.g., gpt-4o"
              />
            </div>
            <div className="grid gap-2 col-span-1">
              <Label htmlFor="model-name">显示名称</Label>
              <Input
                id="model-name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="e.g., GPT-4o"
              />
            </div>
            {/* 支持，多选 */}
            <div className="grid gap-2 col-span-2">
              <Label htmlFor="model-support">模型能力</Label>
              <div className="flex items-center gap-4">
                <div>
                  <Checkbox id="model-support-vision" value="vision"
                    checked={newModelSupport.includes('vision')}
                    onCheckedChange={(checked: boolean) => handleChangeModelSupport('vision', checked)} />
                  视觉
                </div>
                <div>
                  <Checkbox id="model-support-web" value="web"
                    checked={newModelSupport.includes('web')}
                    onCheckedChange={(checked: boolean) => handleChangeModelSupport('web', checked)} />
                  联网
                </div>
                <div>
                  <Checkbox id="model-support-thinking" value="thinking"
                    checked={newModelSupport.includes('thinking')}
                    onCheckedChange={(checked: boolean) => handleChangeModelSupport('thinking', checked)} />
                  推理
                </div>
                <div>
                  <Checkbox id="model-support-tool" value="tool"
                    checked={newModelSupport.includes('tool')}
                    onCheckedChange={(checked: boolean) => handleChangeModelSupport('tool', checked)} />
                  工具
                </div>
              </div>
            </div>
            <Button onClick={handleAddModel} disabled={!newModelId || !newModelName} className="col-span-2">
              <PlusIcon className="mr-2 h-4 w-4" />
              添加模型
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={editingModel !== null} onOpenChange={(open) => !open && setEditingModel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑模型</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-model-id">模型ID</Label>
              <Input
                id="edit-model-id"
                value={editModelId}
                onChange={(e) => setEditModelId(e.target.value)}
                placeholder="e.g., gpt-4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-model-name">显示名称</Label>
              <Input
                id="edit-model-name"
                value={editModelName}
                onChange={(e) => setEditModelName(e.target.value)}
                placeholder="e.g., GPT-4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-model-support">模型能力</Label>
              <div className="flex items-center gap-4">
                <div>
                  <Checkbox id="edit-model-support-vision" value="vision"
                    checked={editModelSupport.includes('vision')}
                    onCheckedChange={(checked: boolean) => handleChangeEditModelSupport('vision', checked)} />
                  视觉
                </div>
                <div>
                  <Checkbox id="edit-model-support-web" value="web"
                    checked={editModelSupport.includes('web')}
                    onCheckedChange={(checked: boolean) => handleChangeEditModelSupport('web', checked)} />
                  联网
                </div>
                <div>
                  <Checkbox id="edit-model-support-thinking" value="thinking"
                    checked={editModelSupport.includes('thinking')}
                    onCheckedChange={(checked: boolean) => handleChangeEditModelSupport('thinking', checked)} />
                  推理
                </div>
                <div>
                  <Checkbox id="edit-model-support-tool" value="tool"
                    checked={editModelSupport.includes('tool')}
                    onCheckedChange={(checked: boolean) => handleChangeEditModelSupport('tool', checked)} />
                  工具
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingModel(null)}>取消</Button>
            <Button onClick={handleEditModel} disabled={!editModelId || !editModelName}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
