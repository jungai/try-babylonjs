import "./styles/tailwind.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App2.tsx";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster richColors />
    <App />
  </StrictMode>,
);
