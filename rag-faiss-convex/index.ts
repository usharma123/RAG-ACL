import index from "./index.html";

const API_BASE = "http://localhost:8000";

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
    "/api/*": async (req) => {
      // Proxy API requests to FastAPI backend
      const url = new URL(req.url);
      const apiPath = url.pathname.replace("/api", "");
      const targetUrl = `${API_BASE}${apiPath}${url.search}`;

      const headers = new Headers(req.headers);
      headers.delete("host");

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
      });

      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Frontend running at http://localhost:3000");
