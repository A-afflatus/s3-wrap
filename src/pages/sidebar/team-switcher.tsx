import * as React from "react"
import {useState} from "react"
import {ChevronsUpDown, Command, KeyRound, Plus, Settings, Trash2} from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,} from "@/components/ui/sidebar"
import AddOrEditCredential from '@/pages/modules/credentials/AddOrEditCredential.tsx'
import {CredentialInfo, useCredential} from '@/hooks/useCredential'
import {Dialog} from "@radix-ui/react-dialog";
import {DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {confirm} from "@tauri-apps/plugin-dialog";
import {useDB} from "@/hooks/useDB.tsx";

export function TeamSwitcher() {

    const {isMobile} = useSidebar()
    const {credentials, current, toggleCredential, refresh} = useCredential()
    const [checkedCredential, setCheckedCredential] = useState<CredentialInfo>()
    const [open, setOpen] = React.useState(false)
    const {DB} = useDB()

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{checkedCredential ? "修改凭证" : "新增凭证"}</DialogTitle>
                        <AddOrEditCredential credential={checkedCredential}/>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <div
                                    className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Command className="size-4"/>
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {current.name}
                  </span>
                                    <span className="truncate text-xs">{current.region}</span>
                                </div>
                                <ChevronsUpDown className="ml-auto"/>
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                            align="start"
                            side={isMobile ? "bottom" : "right"}
                            sideOffset={4}
                        >
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                                凭证
                            </DropdownMenuLabel>
                            {credentials.map((team, index) => (
                                <DropdownMenuItem
                                    key={index}
                                    className="gap-2"
                                >
                                    <div className="flex gap-2 items-center w-full" onClick={() => toggleCredential(team.id)}>
                                        <div className="flex size-6 items-center justify-center rounded-sm border">
                                            <KeyRound className="size-4 shrink-0"/>
                                        </div>
                                        {team.name}
                                    </div>
                                    <DropdownMenuShortcut className="ml-auto flex gap-1">
                                        <Settings
                                            className="size-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                                            onClick={() => {
                                                setCheckedCredential(team)
                                                setTimeout(() => setOpen(true), 50)
                                            }}/>
                                        <Trash2 className="size-3.5 shrink-0 text-red-300 hover:text-red-600"
                                                onClick={async () => {
                                                    if (await confirm(`确认删除当前凭证吗？`, {title: '删除凭证', okLabel: '确认', cancelLabel: '取消', kind: 'warning'})) {
                                                        await DB?.execute("DELETE FROM credentials WHERE id = ?", [team.id])
                                                        refresh()
                                                    }
                                                }}/>
                                    </DropdownMenuShortcut>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem className="gap-2 p-2"
                                              onClick={() => (setCheckedCredential(undefined), setTimeout(() => setOpen(true), 50))}>
                                <div
                                    className="flex size-6 items-center justify-center rounded-md border bg-background">
                                    <Plus className="size-4"/>
                                </div>
                                <div className="font-medium text-muted-foreground">
                                    添加凭证
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </>
    )
}
