import {BucketProvider, useBucket} from "@/hooks/useBucket";
import FileTable from "@/pages/modules/buckets/list/FileTable.tsx";
import BucketTable from "@/pages/modules/buckets/list/BucketTable.tsx";

const Main = () => {
    const {currentBucket} = useBucket()
    return currentBucket ? <FileTable/> : <BucketTable/>
};

export default () => {
    return <BucketProvider>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min box-border p-4">
            <div className="w-full">
                <Main/>
            </div>
        </div>
    </BucketProvider>
}