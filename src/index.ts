import dotenv from "dotenv";
dotenv.config();

import http from "http";
import fs from "fs";
import path from "path";
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";

// ✅ Route Imports
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerEventRoutes } from "./routes/event.routes";
import { registerRsvpRoutes } from "./routes/rsvp.routes";
import { registerNotificationRoutes } from "./routes/notification.routes";
import { registerAiRoutes } from "./routes/aiRoutes";

// ✅ Middleware & Services
import { registerErrorPlugin } from "./middleware/error.plugin";
import { initSocket } from "./services/socket";

// ========================
// ✅ Initialize Elysia App
// ========================
const app = new Elysia();

// ✅ Swagger Docs
app.use(
  swagger({
    path: "/swagger",
    documentation: {
      info: {
        title: "Event Monolith API",
        version: "1.0.0",
        description:
          "Authentication, Events, RSVPs, Realtime, and AI Suggestion endpoints",
      },
      tags: [
        { name: "auth", description: "Signup, login" },
        { name: "events", description: "Event CRUD and approvals" },
        { name: "rsvp", description: "RSVP operations" },
        { name: "ai", description: "AI suggestions and recommendations" },
      ],
    },
  })
);

// ✅ Register Middleware & Routes
registerErrorPlugin(app);
registerAuthRoutes(app);
registerEventRoutes(app);
registerRsvpRoutes(app);
registerNotificationRoutes(app);
registerAiRoutes(app);

// ✅ Root Endpoint → serve UI
app.get("/", () => new Response(null, { status: 302, headers: { Location: "/index.html" } }));

// ==================================
// ✅ Create HTTP Server for Socket.io
// ==================================
const PORT = Number(process.env.PORT ?? 3000);

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host ?? `localhost:${PORT}`;
    const url = new URL(req.url ?? "/", `http://${host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
    }

    // ✅ Check static files FIRST for GET requests
    if (req.method === "GET") {
      const urlPath = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = path.join(process.cwd(), "public", path.normalize(urlPath).replace(/^\/+/, ""));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mimeMap: Record<string, string> = {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
        };
        const mime = mimeMap[ext] || "text/plain";
        res.writeHead(200, { "content-type": mime });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // ✅ Read raw body (for POST, PUT, PATCH, DELETE)
    let rawBody = "";
    if (req.method && !["GET", "HEAD"].includes(req.method)) {
      for await (const chunk of req) {
        rawBody += chunk;
      }
    }

    // ✅ Construct Web Request for Elysia
    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: rawBody || undefined,
    });

    const response = await app.fetch(request);

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err: any) {
    console.error("[server adapter error]", err);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Internal Server Error",
        detail: err?.message || String(err),
      })
    );
  }
});

// ✅ Initialize Socket.io
if (typeof initSocket === "function") {
  initSocket(server);
  console.log("🔌 Socket.io initialized successfully");
}

// ✅ Start the server
server.listen(PORT, () => {
  console.log(`✅ Server running with Socket.io on http://localhost:${PORT}`);
});

export { app, server };
