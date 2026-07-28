import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ApplyFlowApp from "./ApplyFlowApp";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("ApplyFlow root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <ApplyFlowApp />
  </StrictMode>,
);
