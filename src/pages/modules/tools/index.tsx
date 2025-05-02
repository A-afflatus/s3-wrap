import {TOOLS_BASE64, TOOLS_CONVERT} from "@/router/constant";
import {Card, CardContent} from "@/components/ui/card.tsx";
import {Code, Image} from "lucide-react";
import {useNavigate} from "react-router-dom";

// const colorPalette = [
//     "#FF4A00",
//     "#96BF48",
//     "#E37400",
//     "#FFE01B",
//     "#F06A6A",
//     "#FFCC22",
//     "#6772E5",
//     "#F22F46",
//     "#2D8CFF",
//     "#0061FF",
//     "#00A1E0",
//     "#D32D27",
//     "#4CAF50",
//     "#9C27B0",
//     "#FF9800",
//     "#795548",
//     "#607D8B",
//     "#3F51B5",
//     "#00BCD4",
//     "#FFC107",
// ]

const TOOLS = [
    {
        name: '图片转换',
        description: '转换图片格式以及图片大小',
        path: TOOLS_CONVERT,
        icon: <Image color="#6772E5"/>,
        color: '#6772E5'
    },
    {
        name: 'Base64转码',
        description: 'Base64和文件互转',
        path: TOOLS_BASE64,
        icon: <Code color="#9C27B0"/>,
        color: '#9C27B0'
    }
]
export default () => {
    const navigate = useNavigate();

    return <div className="w-full flex flex-wrap gap-4 box-border p-4">
            {
                TOOLS.map((item, index) => {
                    return <Card key={index}
                                 className="hover:shadow-lg transition-all duration-300 group h-full w-[250px] cursor-pointer"
                                 onClick={() => {
                                     navigate(item.path)
                                 }}
                    >
                        <CardContent className="p-4 flex flex-col h-full">
                            <div className="flex flex-col items-center text-center space-y-2 mb-2">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300"
                                    style={{backgroundColor: `${item.color}20`}}
                                >
                                    {item.icon}
                                </div>
                                <h3 className="font-semibold text-sm">{item.name}</h3>
                            </div>
                            <div className="text-xs text-gray-500 flex-grow overflow-hidden text-nowrap text-center">
                                {item.description}
                            </div>
                        </CardContent>
                    </Card>
                })
            }
        </div>
}