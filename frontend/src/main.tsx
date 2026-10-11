import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { I18nProvider } from "./i18n/I18nProvider.tsx";
import "./index.css";
import { registerOfflineSupport } from "./offline/register.ts";

registerOfflineSupport();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <AppWrapper>
            <App />
          </AppWrapper>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
