import React from "react";
import {useDB} from "@/hooks/useDB.tsx";


interface CredentialInfo {
    id: string,
    name: string,
    region: string,
    endpoint: string,
    access_key_id: string,
    secret_access_key: string,
    force_path_style: boolean,
    isTourist?: boolean
}

export const touristCredential: CredentialInfo = {
    id: 'tourist',
    name: "游客凭证",
    region: "tourist",
    endpoint: "tourist",
    access_key_id: "tourist",
    secret_access_key: "tourist",
    force_path_style: true,
    isTourist: true
}

type CredentialContext = {
    current: CredentialInfo
    credentials: CredentialInfo[]
    toggleCredential: (id: string) => void
    refresh: () => void
}

const CredentialContext = React.createContext<CredentialContext | null>(null)

function useCredential() {
    const context = React.useContext(CredentialContext)
    if (!context) {
        throw new Error("useCredential must be used within a CredentialProvider.")
    }
    return context
}

const CredentialProvider = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & {}>(
    ({className, style, children, ...props}, ref) => {
        const {DB} = useDB();
        const [credentials, setCredentials] = React.useState<CredentialInfo[]>([touristCredential])
        const [current, setCurrent] = React.useState<CredentialInfo>(touristCredential)
        const [flag, steFlag] = React.useState(false)
        React.useEffect(() => {
            (async () => {
                const credentialList = (await DB?.select("select * from credentials")) as CredentialInfo[] ?? []

                const list = credentialList.map((r) => ({
                    ...r,
                    force_path_style: 1 === r.force_path_style as unknown as number
                }))
                const credentials = list.length === 0 ? [touristCredential] : list
                setCredentials(credentials)
                setCurrent((c) => {
                    return c && !c.isTourist && credentials.find(c => c.id === c.id) ? c : credentials[0]
                })
            })()
        }, [flag, DB, setCurrent, setCredentials])

        const contextValue = React.useMemo<CredentialContext>(
            () => ({
                current,
                credentials,
                toggleCredential: (id) => {
                    const credential = credentials.find(c => c.id === id)
                    if (credential) {
                        setCurrent(credential)
                    }
                },
                refresh: () => {
                    steFlag(!flag)
                }
            }),
            [credentials, current]
        )

        return (
            <CredentialContext.Provider value={contextValue}>
                <div ref={ref} {...props}>{children}</div>
            </CredentialContext.Provider>
        )
    }
)
CredentialProvider.displayName = "CredentialProvider"
export {
    CredentialProvider,
    CredentialContext,
    useCredential
};
export type {CredentialInfo};

