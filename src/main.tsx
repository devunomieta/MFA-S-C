import React from "react";

import ReactDOM from "react-dom/client";

import App from "./app/App";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import { AuthProvider } from "./app/context/AuthContext";

import "./styles/index.css";
import "./styles/tailwind.css";
import "./styles/theme.css";

// Capture PWA install prompt early before React components mount
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).deferredPWAEvent = e;
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
