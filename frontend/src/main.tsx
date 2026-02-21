import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/app";
import "./shared/styles/global.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root container");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
