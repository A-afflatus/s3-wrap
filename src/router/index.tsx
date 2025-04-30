import {createBrowserRouter, createRoutesFromElements, Navigate, Route} from 'react-router-dom';
import {Content} from '@/pages/Main';
import {
    BUCKETS,
    CREDENTIALS,
    DASHBOARD,
    HOME,
    NOT_DEV,
    SETTINGS,
    TOOLS, TOOLS_BASE64,
    TOOLS_CONVERT,
    TRANSFER_LIST,
    USER,
} from './constant';
import NotFound from '@/components/NotFound'
import Dashboard from "@/pages/modules/dashboard";
import Buckets from "@/pages/modules/buckets/index.tsx";
import Credentials from "@/pages/modules/credentials";
import User from "@/pages/modules/user";
import Transfer from "@/pages/modules/transfer";
import TransferMain from "@/pages/modules/transfer/main";
import Settings from "@/pages/modules/settings";
import NotDev from "@/pages/NotDev.tsx";
import Tools from "@/pages/modules/tools"
import ImageConvert from "@/pages/modules/tools/convert"
import BaseConvert from "@/pages/modules/tools/base64"



const router = createBrowserRouter(
    createRoutesFromElements(
        <Route key={"main"}>
            <Route key="home" path={HOME} element={<Content/>}>
                <Route key={USER} path={USER} handle={{title: "用户"}} element={<User/>}/>
                <Route key={CREDENTIALS} path={CREDENTIALS} handle={{title: "凭证"}} element={<Credentials/>}/>
                <Route key={DASHBOARD} path={DASHBOARD} handle={{title: "仪表盘"}} element={<Dashboard/>}/>
                <Route key={BUCKETS} path={BUCKETS} handle={{title: "桶"}} element={<Buckets/>}/>
                <Route key={TRANSFER_LIST} path={TRANSFER_LIST} handle={{title: "传输任务"}} element={<TransferMain/>}/>
                <Route key={TRANSFER_LIST} path={TRANSFER_LIST + "/:type"} handle={{title: TRANSFER_LIST}} element={<Transfer/>}/>
                <Route key={SETTINGS} path={SETTINGS} handle={{title: "设置"}} element={<Settings/>}/>
                <Route key={TOOLS} path={TOOLS} handle={{title: "工具"}} element={<Tools/>}/>
                <Route key={TOOLS_CONVERT} path={TOOLS_CONVERT} handle={{title: "图片转换"}} element={<ImageConvert/>}/>
                <Route key={TOOLS_BASE64} path={TOOLS_BASE64} handle={{title: "BASE64转换"}} element={<BaseConvert/>}/>
                <Route key={NOT_DEV} path={NOT_DEV} handle={{title: "暂未开发"}} element={<NotDev/>}/>
                {/*主页默认*/}
                <Route key="home-default" path={HOME} element={<Navigate to={DASHBOARD}/>}/>
            </Route>
            <Route key={"*"} path="*" element={<NotFound/>}/>
        </Route>
    )
);


export default router;