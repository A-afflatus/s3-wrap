import React from "react";
import {LazyStore} from "@tauri-apps/plugin-store";
import {homeDir, join} from "@tauri-apps/api/path";

type StoreContext = {
    store?: LazyStore
}

const StoreContext = React.createContext<StoreContext | null>(null)

function useStore() {
    const context = React.useContext(StoreContext)
    if (!context) {
        throw new Error("useStore must be used within a StoreProvider.")
    }
    return context
}

const initStore = async () => {
    const path = await join(await homeDir(), ".s3wap", ".s3wap.json")
    return new LazyStore(path)
}

const StoreProvider = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & {}>(
    ({className, style, children, ...props}, ref) => {
        const [store, setStore] = React.useState<LazyStore>()

        React.useEffect(() => {
            initStore().then(setStore)
        }, [setStore])
        const contextValue = React.useMemo<StoreContext>(() => ({
            store: store
        }), [store])

        return (
            <StoreContext.Provider value={contextValue}>
                <div ref={ref} {...props}>{children}</div>
            </StoreContext.Provider>
        )
    }
)
StoreProvider.displayName = "StoreProvider"
export {
    StoreProvider,
    StoreContext,
    useStore
};

