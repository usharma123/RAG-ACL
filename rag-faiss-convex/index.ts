import { readFileSync } from "fs";
import { join } from "path";

// Use API_BASE env var for Docker networking, fallback to localhost for local dev
const API_BASE = process.env.API_BASE || "http://localhost:8000";
const CONVEX_URL = process.env.CONVEX_URL || "";

// Build the frontend bundle
const buildResult = await Bun.build({
  entrypoints: [join(import.meta.dir, "frontend.tsx")],
  outdir: join(import.meta.dir, ".build"),
  target: "browser",
  format: "esm",
  splitting: true,
  minify: false,
  sourcemap: "external",
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
});

if (!buildResult.success) {
  console.error("Build failed:");
  for (const log of buildResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("Frontend built successfully");

// Read and inject Convex URL into the HTML
const htmlPath = join(import.meta.dir, "index.html");
const rawHtml = readFileSync(htmlPath, "utf-8");

// Update HTML to point to built bundle
const injectedHtml = rawHtml
  .replace(
    '<script type="module" src="./frontend.tsx"></script>',
    '<script type="module" src="/.build/frontend.js"></script>'
  )
  .replace(
    "</head>",
    `<script>window.__CONVEX_URL__ = "${CONVEX_URL}";</script></head>`
  );

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve index.html for root
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(injectedHtml, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Proxy API requests to FastAPI backend
    if (url.pathname.startsWith("/api/")) {
      const apiPath = url.pathname.replace("/api", "");
      const targetUrl = `${API_BASE}${apiPath}${url.search}`;

      const headers = new Headers(req.headers);
      headers.delete("host");

      try {
        const response = await fetch(targetUrl, {
          method: req.method,
          headers,
          body:
            req.method !== "GET" && req.method !== "HEAD"
              ? await req.text()
              : undefined,
        });

        return new Response(response.body, {
          status: response.status,
          headers: response.headers,
        });
      } catch (error) {
        console.error("API proxy error:", error);
        return new Response("API unavailable", { status: 502 });
      }
    }

    // Serve built files from .build directory
    if (url.pathname.startsWith("/.build/")) {
      const filePath = join(import.meta.dir, url.pathname);
      const file = Bun.file(filePath);

      if (await file.exists()) {
        const contentType = url.pathname.endsWith(".js")
          ? "application/javascript"
          : url.pathname.endsWith(".css")
            ? "text/css"
            : "application/octet-stream";

        return new Response(file, {
          headers: { "Content-Type": contentType },
        });
      }
    }

    // Serve static files (css, images, etc.)
    const filePath = join(import.meta.dir, url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const contentType = url.pathname.endsWith(".css")
        ? "text/css"
        : url.pathname.endsWith(".js")
          ? "application/javascript"
          : url.pathname.endsWith(".png")
            ? "image/png"
            : url.pathname.endsWith(".svg")
              ? "image/svg+xml"
              : "application/octet-stream";

      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    }

    // 404 for everything else
    return new Response("Not found", { status: 404 });
  },
});

console.log("Frontend running at http://localhost:3000");
console.log("API_BASE:", API_BASE);
console.log("CONVEX_URL:", CONVEX_URL || "(not set - add to .env)");
