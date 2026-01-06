import React from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Chat } from "./components/Chat";
import "./styles.css";

// Get Convex URL injected by the server into window
const convexUrl = (window as any).__CONVEX_URL__ as string;

if (!convexUrl) {
  console.error("CONVEX_URL not configured. Set CONVEX_URL in .env");
}

const convex = new ConvexReactClient(convexUrl);

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <Chat />
    </ConvexAuthProvider>
  </React.StrictMode>
);
