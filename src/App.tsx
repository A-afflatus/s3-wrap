import { getCurrentWebview } from '@tauri-apps/api/webview';
import Main from './pages/Main'

const viewMap = {
  main: <Main/>,
};

export default function App() {
  const webview = getCurrentWebview();
  return viewMap[webview.label as keyof typeof viewMap] || null;
}
