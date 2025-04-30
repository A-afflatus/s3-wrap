import {SubmitHandler, useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {invoke} from "@tauri-apps/api/core";
import {Result} from "@/lib/result.ts";
import {toast} from "sonner";
import * as yup from "yup";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import * as React from "react";
import {useCredential} from "@/hooks/useCredential.tsx";
import {useBucket} from "@/hooks/useBucket.tsx";
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

const schema = yup
    .object({
        millis: yup.number().min(1, "最少1分钟").max(5259600, "最多5259600分钟(10年)").required("必填"),
    })
    .required()

export default function index({open,setOpen,getCurrentKey}:{open:boolean,setOpen:React.Dispatch<React.SetStateAction<boolean>>,getCurrentKey:()=>string}) {
    const {current} = useCredential()
    const {currentBucket} = useBucket()
    const {register, handleSubmit, formState: {errors}} = useForm<{millis:number}>({
        resolver: yupResolver(schema),
        defaultValues: {
            millis: 15
        }
    })
    const getObjUrl: SubmitHandler<{millis:number}> = ({millis}) => {
        invoke("get_object_url", {
            id: current.id,
            bucket: currentBucket?.name,
            key:getCurrentKey(),
            millis
        }).then(async (r) => {
            const result: Result<string> = new Result(r);
            if (result.isSuccess() && result.data) {
                console.log("对象url：",result.data)
                await writeText(result.data)
                toast.success("对象链接已复制到粘贴板")
                setOpen(false)
            } else {
                toast.error("获取对象url失败", {description: result.msg});
            }
        })
    };
    return  <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>设置链接有效期</DialogTitle>
                <DialogDescription/>
                <form className="grid items-center gap-1">
                    <Label htmlFor="endpoint" className="text-left">链接有效期，单位为分钟，默认为15分钟</Label>
                    <span className="pl-1 text-xs text-red-500">{errors.millis?.message}</span>
                    <Input placeholder="有效时间(分钟)" type="number" min={1} {...register("millis", {required: true})}/>
                    <Button type="submit" onClick={handleSubmit(getObjUrl)}>复制</Button>
                </form>
            </DialogHeader>
        </DialogContent>
    </Dialog>;
}