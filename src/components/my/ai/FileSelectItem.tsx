import {X} from "lucide-react";
import {
    AiFillFileExcel,
    AiFillFileImage,
    AiFillFileMarkdown,
    AiFillFilePdf,
    AiFillFilePpt,
    AiFillFileText,
    AiFillFileUnknown,
    AiFillFileWord,
    AiFillFileZip
} from "react-icons/ai";
import {useCallback} from "react";

type FileSelectItemProps = {
    fileName?: string;
    onDelete?: () => void;
};
export default function FileSelectItem({fileName,onDelete}: FileSelectItemProps) {
    const fileIcon = useCallback(() => {
        let ext = ""
        const str = fileName?.split('.')
        if (str && str.length > 1) {
            ext = str[str.length - 1].toLowerCase()
        }
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp','icns','ico'].includes(ext)) {
            return <AiFillFileImage/>
        }
        if (['doc', 'docx'].includes(ext)) {
            return <AiFillFileWord/>
        }
        if (['xls', 'xlsx'].includes(ext)) {
            return <AiFillFileExcel/>
        }
        if (['ppt', 'pptx'].includes(ext)) {
            return <AiFillFilePpt/>
        }
        if (ext === 'pdf') {
            return <AiFillFilePdf/>
        }
        if (['md', 'markdown'].includes(ext)) {
            return <AiFillFileMarkdown/>
        }
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
            return <AiFillFileZip/>
        }
        if (['txt', 'json', 'log', 'yml', 'yaml', 'xml', 'csv'].includes(ext)) {
            return <AiFillFileText/>
        }
        return <AiFillFileUnknown/>
    }, [fileName])
    return <div className="flex gap-1 box-border p-0.5 px-1 bg-green-800 items-center text-center rounded-md border" title={fileName}>
        {fileIcon()}
        <div className="align-text-top text-xs max-w-[200px] overflow-hidden overflow-ellipsis text-nowrap">{fileName || "??"}</div>
        {
            onDelete && <X className="cursor-pointer w-3 h-3 hover:text-white hover:bg-[#da8a8a] rounded-3xl" onClick={()=>onDelete()}/>
        }
    </div>;
}