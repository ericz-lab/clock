/**
 * HTTP routes: an allowlist of the page's files plus /healthz. Nothing else in the repository is served.
 */

import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const STATIC: Record<string, { file: string; type: string }> = {
  "/": { file: "web/index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "web/index.html", type: "text/html; charset=utf-8" },
  "/app.css": { file: "web/app.css", type: "text/css; charset=utf-8" },
  "/app.js": { file: "web/app.js", type: "text/javascript; charset=utf-8" },
  "/faces.js": { file: "web/faces.js", type: "text/javascript; charset=utf-8" },
  "/words.js": { file: "web/words.js", type: "text/javascript; charset=utf-8" },
  "/zones.js": { file: "web/zones.js", type: "text/javascript; charset=utf-8" },
  "/icon.svg": { file: "icon.svg", type: "image/svg+xml" },
  "/favicon.svg": { file: "icon.svg", type: "image/svg+xml" },
};

export async function handle(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname;
  if (path === "/healthz") return Response.json({ ok: true });
  const entry = STATIC[path];
  if (!entry) return new Response("not found", { status: 404 });
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("method not allowed", { status: 405 });
  return new Response(Bun.file(join(ROOT, entry.file)), {
    headers: { "content-type": entry.type, "cache-control": "no-cache" },
  });
}
