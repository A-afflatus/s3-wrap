import router from '@/router'
import {AppSidebar} from "@/pages/sidebar/app-sidebar"
import {SidebarInset, SidebarProvider, SidebarTrigger,} from "@/components/ui/sidebar"
import {CredentialProvider} from '@/hooks/useCredential'
import {Outlet, RouterProvider, useMatches, useParams,} from "react-router-dom"
import {Separator} from '@/components/ui/separator'
import {Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage} from '@/components/ui/breadcrumb'
import {TRANSFER_LIST} from "@/router/constant.ts";

export function Content() {
    const routerHandle: any = useMatches().pop()?.handle;
    let title: string = routerHandle?.title
    if (TRANSFER_LIST === title) {
        const {type} = useParams();
        title = type === "download" ? "下载任务" : "上传任务"
    }
    return (
        <CredentialProvider>
            <SidebarProvider className='select-none'>
                <AppSidebar className='w-[220px]'/>
                <SidebarInset className='flex flex-col h-screen overflow-y-auto'>
                    <header
                        className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1"/>
                            <Separator orientation="vertical" className="mr-2 h-4"/>
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="font-bold">{title}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                    </header>
                    <Outlet/>
                </SidebarInset>
            </SidebarProvider>
        </CredentialProvider>
    )
}

export default function Main() {
    return <RouterProvider router={router}/>;
};
