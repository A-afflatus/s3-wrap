import ReactDOM from "react-dom/client";
import App from "./App";
import './main.css'
import { Toaster } from "@/components/ui/sonner"
import { StoreProvider } from "@/hooks/useStore.tsx";
import { DBProvider } from "@/hooks/useDB.tsx";
import { ThemeProvider } from "./hooks/useTheme";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <StoreProvider>
        <ThemeProvider>
            <DBProvider>
                <div>
                    <App />
                    <Toaster richColors />
                </div>
            </DBProvider>
        </ThemeProvider>
    </StoreProvider>
    ,
);
