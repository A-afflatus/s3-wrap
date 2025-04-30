import React from "react";
import {Result} from "@/lib/result.ts";
import {invoke} from "@tauri-apps/api/core";
import {CredentialContext,useCredential} from "./useCredential.tsx";
import {toast} from "sonner";


export type Bucket = {
    name: string
    bucket_region: string
    creation_date: string
}
const allBuckets = async (id: string): Promise<Result<Bucket[]>> => {
    return new Result(await invoke("get_buckets", {id}))
}


type BucketContext = {
    currentBucket?: Bucket
    buckets: Bucket[]
    toggleBucket: (name?: string) => void
    refresh: () => void
}

const BucketContext = React.createContext<BucketContext | null>(null)

function useBucket() {
    const context = React.useContext(BucketContext)
    if (!React.useContext(CredentialContext) || !context) {
        throw new Error("useBucket must be used within a CredentialProvider and BucketProvider.")
    }
    return context
}
const BucketProvider = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & {}>(
    ({ className, style, children, ...props }, ref) => {
        const {current} = useCredential();
        const [buckets, setBuckets] = React.useState<Bucket[]>([])
        const [currentBucket, setCurrentBucket] = React.useState<Bucket>()
        const [flag,steFlag] = React.useState(false)
        React.useEffect(() => {
            setCurrentBucket(undefined)
            if (current && !current.isTourist) {
                allBuckets(current.id).then(async (result) => {
                    if (result.isSuccess()) {
                        setBuckets(result.data??[])
                    }else {
                        console.log("获取bucket失败",result.msg)
                        toast.error("获取bucket失败", {description: result.msg, richColors: true});
                        setBuckets([]);
                    }
                })
            }
        }, [current,flag,setBuckets,setCurrentBucket])

        const contextValue = React.useMemo<BucketContext>(
            () => ({
                currentBucket,
                buckets,
                toggleBucket: (name?) =>  setCurrentBucket(buckets?.find(c => c.name === name)),
                refresh: () => steFlag(!flag)
            }),
            [buckets,currentBucket]
        )

        return (
            <BucketContext.Provider value={contextValue}>
                <div ref={ref} {...props}>{children}</div>
            </BucketContext.Provider>
        )
    }
)
BucketProvider.displayName = "BucketProvider"
export {
    BucketProvider,
    BucketContext,
    useBucket
}
