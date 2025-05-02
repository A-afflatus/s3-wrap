import { BucketProvider, useBucket } from "@/hooks/useBucket";
import FileTable from "@/pages/modules/buckets/list/FileTable.tsx";
import BucketTable from "@/pages/modules/buckets/list/BucketTable.tsx";

const Main = () => {
    const { currentBucket } = useBucket()
    return currentBucket ? <FileTable /> : <BucketTable />
};

export default () => {
    return <BucketProvider>
        <div className="w-full box-border p-4">
            <Main />
        </div>
    </BucketProvider>
}