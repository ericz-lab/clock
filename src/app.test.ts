import { expect, test } from "bun:test";
import { handle } from "./app.ts";

const get = (path: string, method = "GET") => handle(new Request(`http://clock.test${path}`, { method }));

test("healthz", async () => {
  const res = await get("/healthz");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test("serves the page and its scripts", async () => {
  for (const path of ["/", "/app.css", "/app.js", "/faces.js", "/words.js", "/zones.js", "/icon.svg"]) {
    expect((await get(path)).status).toBe(200);
  }
  const html = await (await get("/")).text();
  expect(html).toContain("/_space/usage.js");
  expect(html).toContain("/_space/feedback.js");
});

test("only the allowlist is served", async () => {
  for (const path of ["/space.yaml", "/src/app.ts", "/../package.json", "/web/index.html"]) {
    expect((await get(path)).status).toBe(404);
  }
  expect((await get("/", "POST")).status).toBe(405);
});
