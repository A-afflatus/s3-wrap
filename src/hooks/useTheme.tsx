import React, {useState} from "react";
import {useStore} from "@/hooks/useStore.tsx";
import {webviewWindow} from "@tauri-apps/api";
import Theme = I.Theme;


type ThemeContext = {
    theme?: Theme
    setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContext | null>(null)

function useTheme() {
    const context = React.useContext(ThemeContext)
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider.")
    }
    return context
}

const ThemeProvider = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & {}>(
    ({className, style, children, ...props}, ref) => {
        const {store} = useStore();
        const setWindowTheme = (theme: unknown) => {
            let appTheme = theme as Theme ?? 'Light';
            setTheme(appTheme)
            document.documentElement.classList.toggle('dark', theme === 'Dark')
            webviewWindow.getCurrentWebviewWindow().setTheme(appTheme.toLowerCase() as any).then()
        }

        const [theme, setTheme] = useState<Theme>('Light')
        React.useEffect(() => {
            store?.get("settings.appearance.theme").then(setWindowTheme)
            store?.onKeyChange("settings.appearance.theme", setWindowTheme)
        }, [store, setTheme])

        const contextValue = React.useMemo<ThemeContext>(() => ({
            theme: theme,
            setTheme: (theme) => {
                store?.set("settings.appearance.theme", theme)
            }
        }), [theme])

        return (
            <ThemeContext.Provider value={contextValue}>
                <div ref={ref} {...props}>{children}</div>
            </ThemeContext.Provider>
        )
    }
)
ThemeProvider.displayName = "ThemeProvider"
export {
    ThemeProvider,
    ThemeContext,
    useTheme
};
