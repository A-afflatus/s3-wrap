import React from "react";
import {homeDir, join} from "@tauri-apps/api/path";
import Database from '@tauri-apps/plugin-sql';

type DBContext = {
    DB?: Database
}

const DBContext = React.createContext<DBContext | null>(null)

function useDB() {
    const context = React.useContext(DBContext)
    if (!context) {
        throw new Error("useDB must be used within a DBProvider.")
    }
    return context
}

const connect = async () => {
    const path = await join(await homeDir(), ".s3wap", ".s3wap.db")
    return await Database.load(`sqlite://${path}`);
}

const DBProvider = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & {}>(
    ({className, style, children, ...props}, ref) => {
        const [DB, setDB] = React.useState<Database>()
        React.useEffect(() => {
            connect().then(setDB)
        }, [setDB])
        const contextValue = React.useMemo<DBContext>(() => ({
            DB
        }), [DB])

        return (
            <DBContext.Provider value={contextValue}>
                <div ref={ref} {...props}>{children}</div>
            </DBContext.Provider>
        )
    }
)
DBProvider.displayName = "DBProvider"
export {
    DBProvider,
    DBContext,
    useDB
};

