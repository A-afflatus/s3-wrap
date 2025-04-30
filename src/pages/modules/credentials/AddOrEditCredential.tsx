import {Label} from "@/components/ui/label"
import {Input} from "@/components/ui/input"
import {Button} from "@/components/ui/button"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Separator} from "@/components/ui/separator"
import {GrCircleQuestion} from "react-icons/gr";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip"
import {invoke} from '@tauri-apps/api/core'
import {nanoid} from "nanoid";
import {SubmitHandler, useForm} from "react-hook-form";
import {toast} from "sonner"
import {Result} from '@/lib/result'
import {type CredentialInfo} from "@/hooks/useCredential.tsx";
import * as yup from "yup";
import {yupResolver} from "@hookform/resolvers/yup";
import {message} from "@tauri-apps/plugin-dialog";

const schema = yup
    .object({
        id: yup.string().required("必填"),
        name: yup.string().min(2, "至少2个字符").max(32, "最多32个字符").required("必填"),
        region: yup.string().required("必填"),
        endpoint: yup.string().test("startsWith", "必须以http://或者https://开头", (value) => {
            return value?.startsWith("http://") || value?.startsWith("https://");
        }).required("必填"),
        access_key_id: yup.string().required("必填"),
        secret_access_key: yup.string().required("必填"),
        force_path_style: yup.boolean().required("必填")
    })
    .required()
export default ({credential}: { credential?: CredentialInfo }) => {
    console.log("credential", credential)
    const {register, setValue, handleSubmit, formState: {errors}} = useForm<CredentialInfo>({
        resolver: yupResolver(schema),
        defaultValues: credential ? credential : {
            id: nanoid(),
            force_path_style: false
        }
    })
    const submitCredential: SubmitHandler<CredentialInfo> = (data) => invoke("save_credential", {
        param: data
    }).then(async (r) => {
        const result = new Result(r)
        if (result.isSuccess()) {
            await message('保存凭证成功', {title: 's3-warp', kind: 'info', okLabel: '确认'});
            window.location.reload()
        } else {
            toast.error('保存凭证失败', {
                description: result.msg
            })
        }
    }).catch(async (e) => {
        console.log("保存凭证失败", e);
        toast.error('保存凭证失败', {
            description: e.message
        })
    })

    return (
        <form className="grid gap-4 py-4" onSubmit={handleSubmit(submitCredential)}>
            <div className="grid items-center gap-1">
                <Label className="text-left">类型</Label>
                <Select defaultValue="uesr" disabled>
                    <SelectTrigger className="w-full">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="uesr">用户</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Separator/>
            <div className="grid items-center gap-1">
                <Label htmlFor="name" className="text-left ">名称<span
                    className="pl-1 text-xs text-red-500">{errors.name?.message}</span></Label>
                <Input id="name" placeholder="名称"
                       className="" {...register("name", {required: true})} />
            </div>
            <div className="grid items-center gap-1">
                <Label htmlFor="region" className="text-left">Region<span
                    className="pl-1 text-xs text-red-500">{errors.region?.message}</span></Label>
                <Input id="region" placeholder="区域"
                       className="" {...register("region", {required: true})}/>
            </div>
            <div className="grid items-center gap-1">
                <Label htmlFor="endpoint" className="text-left">Endpoint<span
                    className="pl-1 text-xs text-red-500">{errors.endpoint?.message}</span></Label>
                <Input id="endpoint" type="url" placeholder="端点(需协议部分:http｜https)"
                       className="" {...register("endpoint", {required: true})}/>
            </div>
            <div className="grid items-center gap-1">
                <Label htmlFor="access_key_id" className="text-left">Access Key Id<span
                    className="pl-1 text-xs text-red-500">{errors.access_key_id?.message}</span></Label>
                <Input id="access_key_id" placeholder="访问密钥ID"
                       className="" {...register("access_key_id", {required: true})}/>
            </div>
            <div className="grid items-center gap-1">
                <Label htmlFor="secret_access_key" className="text-left">Secret Access Key<span
                    className="pl-1 text-xs text-red-500">{errors.secret_access_key?.message}</span></Label>
                <Input id="secret_access_key" placeholder="访问密钥"
                       className="" {...register("secret_access_key", {required: true})}/>
            </div>
            <div className="grid items-center gap-2">
                <Label className="flex gap-0.5 text-left">Link Style
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger><GrCircleQuestion/></TooltipTrigger>
                            <TooltipContent>
                                <span className="font-bold">链接样式</span><br/>
                                虚拟主机样式：https://<span
                                className="text-yellow-300">bucket-name</span>.s3.amazonaws.com/object-key<br/>
                                路径样式：https://s3.amazonaws.com/<span
                                className="text-yellow-300">bucket-name</span>/object-key
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <span className="pl-1 text-xs text-red-500">{errors.force_path_style?.message}</span>
                </Label>
                <Select defaultValue={(credential?.force_path_style ?? false) ? "true" : "false"} name="force_path_style" onValueChange={(value) => {
                    setValue("force_path_style", "true" === value)
                }}>
                    <SelectTrigger className="w-full">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="true">Virtual
                            Hosted-Style(虚拟主机样式)</SelectItem>
                        <SelectItem value="false">Path-Style(路径样式)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button className="w-full" type="submit" variant="default">提交</Button>
        </form>
    )
}
