import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import App from "./App.tsx";
import "./index.css";

registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new Event("trakteras:pwa-update"));
  },
  onOfflineReady() {
    window.dispatchEvent(new Event("trakteras:pwa-offline-ready"));
  },
});

createRoot(document.getElementById("root")!).render(<App />);
