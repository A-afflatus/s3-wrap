import {SubmitHandler, useForm} from "react-hook-form";
import {invoke} from "@tauri-apps/api/core";
import {Result} from "@/lib/result.ts";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {useCredential} from "@/hooks/useCredential.tsx";
import * as yup from "yup";
import {yupResolver} from "@hookform/resolvers/yup";
import { toast } from "sonner"
import {message} from "@tauri-apps/plugin-dialog";

type CreateBucketReq = {
    bucketName: string;
    acl?: 'authenticated-read' | 'private' | 'public-read' | 'public-read-write';
    objectLock?: boolean;
}
const schema = yup
    .object({
        bucketName: yup.string().min(3, "最少3个字符").max(63, "最多63个字符")
            .matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "只能包含小写字母、数字和连字符，且不能以连字符开头或结尾")
            .required(),
    })
    .required()
export default function CreateBucket() {
    const {current} = useCredential()
    const {register, setValue, handleSubmit, formState: {errors}} = useForm<CreateBucketReq>({
        resolver: yupResolver(schema),
        defaultValues: {
            acl: 'private',
            objectLock: false
        }
    })

    const onSubmit: SubmitHandler<CreateBucketReq> = (data) => {
        invoke("create_bucket", {
            id: current.id,
            ...data
        }).then(async (r) => {
            const result = new Result(r)
            if (result.isSuccess()) {
                await message('创建Bucket成功', {title: 's3-warp', kind: 'info', okLabel: '确认'});
                window.location.reload()
            } else {
                toast.error('创建Bucket失败',{
                    description: result.msg
                })
            }
        }).catch(async (e) => {
            console.log("创建Bucket失败", e);
            toast.error('创建Bucket失败',{
                description: e.message
            })
        })
    }
    return <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 py-4">
            <div className="grid items-center gap-1">
                <Label htmlFor="bucketName" className="text-left">名称
                    <span className="pl-1 text-xs text-red-500">{errors.bucketName?.message}</span></Label>
                <Input id="bucketName" placeholder="名称" className="" {...register("bucketName")} />

            </div>
            <div className="grid items-center gap-1">
                <Label className="flex gap-0.5 text-left">访问控制</Label>
                <Select defaultValue="private" name="acl" onValueChange={(value) => {
                    setValue("acl", value as any)
                }}>
                    <SelectTrigger className="w-full">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="private">私有</SelectItem>
                        <SelectItem value="authenticated-read">认证读</SelectItem>
                        <SelectItem value="public-read">共有读</SelectItem>
                        <SelectItem value="public-read-write">共有读写</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid items-center gap-1">
                <Label className="flex gap-0.5 text-left">对象锁</Label>
                <Select defaultValue="false" name="acl" onValueChange={(value) => {
                    setValue("objectLock", "true" === value)
                }}>
                    <SelectTrigger className="w-full">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="false">关闭</SelectItem>
                        <SelectItem value="true">开启</SelectItem>
                    </SelectContent>
                </Select>
            </div>

        </div>
        <Button className="w-full" type="submit" variant="default">提交</Button>
    </form>;
}