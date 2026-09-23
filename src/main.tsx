import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/styles.css";
import { App } from "./app/App";
import { applyTheme, useLab } from "./state/store";

// Persisted state hydrates synchronously; apply its theme before the first render.
applyTheme(useLab.getState().theme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
