//创建文件目录
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import * as yup from "yup";
import {SubmitHandler, useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {invoke} from "@tauri-apps/api/core";
import {Result} from "@/lib/result.ts";
import {useBucket} from "@/hooks/useBucket.tsx";
import {useCredential} from "@/hooks/useCredential.tsx";
import { toast } from "sonner"

type CreateFolderReq = {
    id:string
    bucket: string,
    key: string
}

const schema = yup
    .object({
        id:yup.string().required(),
        key: yup.string()
            .matches(/^(?!.*\.\.)[^\/\\:*?"<>|]{1,254}$/, "1-254字符，合法的目录名，UTF-8 字符。不可包含/、\\、表情符、连续的点号(..)")
            .required(),
        bucket: yup.string().required()
    })
    .required()
export default function CreateFolder({basePath,onDone}: { basePath: string, onDone: () => void }) {
    const { current} = useCredential()
    const {currentBucket} = useBucket()

    const {register, handleSubmit,resetField, formState: {errors}} = useForm<CreateFolderReq>({
        resolver: yupResolver(schema),
        defaultValues: {
            id:current.id,
            bucket: currentBucket?.name,
        }
    })
    const onSubmit: SubmitHandler<CreateFolderReq> = (data) => {
        invoke("put_object", {
            ...data,
            key: `${basePath}${data.key}/`
        }).then(async (r) => {
            const result = new Result(r)
            if (result.isSuccess()) {
                resetField("key")
                onDone()
            } else {
                toast.error('创建文件目录失败',{
                    description: result.msg
                })
            }
        }).catch(async (e) => {
            console.log("创建文件目录失败", e);
            toast.error('创建文件目录失败',{
                description: e.message
            })
        })
    }
    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex w-full max-w-sm items-center space-x-2">
                <Input type="text"
                       alt="1-254字符，合法的目录名，UTF-8 字符。不可包含/、\、表情符、连续的点号(..)"
                       placeholder="1-254字符，合法的目录名，UTF-8 字符。不可包含/、\、表情符、连续的点号(..)" {...register("key")}/>
                <Button type="submit">创建</Button>
            </div>
            <p className="pt-2 text-xs text-red-500">{errors.key?.message}</p>
        </form>
    )
}