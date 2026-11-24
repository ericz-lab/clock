/**
 * The service: the clock page and /healthz. Binds 127.0.0.1 only; the space router stands in front.
 * The clock runs in the browser on the viewer's own time, so the server keeps no state.
 */

import { handle } from "./app.ts";

const port = Number(process.env.PORT ?? 9190);
// idleTimeout: Bun closes idle connections after 10 s by default; static files need no more than 30
const server = Bun.serve({ hostname: "127.0.0.1", port, idleTimeout: 30, fetch: handle });
console.log(`[clock] listening on http://127.0.0.1:${server.port}`);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`[clock] ${signal}, shutting down`);
    server.stop();
    process.exit(0);
  });
}
