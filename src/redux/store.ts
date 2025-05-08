import { configureStore } from '@reduxjs/toolkit'
import reducer from './modules';
import {AI_CHAT} from "@/redux/constant.ts";
//定义一个空的reducer
const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [`${AI_CHAT}/setMessages`],
                ignoredPaths: ['payload'],
            },
        }),
})
// 推断state的类型
export type RootState = ReturnType<typeof store.getState>
// 推断dispatch的类型
export type AppDispatch = typeof store.dispatch
export default store