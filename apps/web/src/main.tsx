import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth";
import { SyncProvider } from "./sync";
import { PrefsProvider } from "./prefs";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PrefsProvider>
        <AuthProvider>
          <SyncProvider>
            <App />
          </SyncProvider>
        </AuthProvider>
      </PrefsProvider>
    </BrowserRouter>
  </StrictMode>,
);
