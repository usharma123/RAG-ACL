import React from "react";
import { createRoot } from "react-dom/client";
import { Chat } from "./components/Chat";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Chat />
  </React.StrictMode>
);
