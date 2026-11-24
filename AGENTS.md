# Clock - agent guide

Read this before touching code. Users read [README.md](README.md). This repository is an ai-space app; the contract is ai-space `docs/app-spec.md` (spec 1) and `space.yaml` is the only file ai-space reads.

## Rules

1. **The viewer's time.** Every face shows the device's local time and timezone; the server keeps no state and sends no time.
2. **Faces are self-sizing.** A face draws into a size container and uses `cq` units only, so the same code draws the full screen and the gallery thumbnails. Never size a face with `vw`/`vh` or fixed pixels.
3. **Loopback only, allowlist only.** The service binds `127.0.0.1:${PORT}` and serves only the files in `src/app.ts` `STATIC`; add a new web file there (and to `src/app.test.ts`).
4. **Pages keep the three page rules** (ai-space `docs/app-spec.md#app-pages`): full-bleed; every string from the `zh`/`en` dictionary in `web/app.js` with the 中 / EN switch, following `?lang=`, then the saved choice, then the browser; a theme button cycling system → light → dark, applied in `<head>` before the first paint. Every face has a light and a dark token set in `web/app.css` (the dark set is written twice: system dark and `[data-theme="dark"]`). Check at 1440 px and 375 px, both languages, both themes.
5. **Pages load the space's scripts**: `/_space/usage.js` and `/_space/feedback.js` in `<head>` (checked by `src/app.test.ts`).
6. **No build step, no runtime dependency.** `web/` is plain ES modules served as is.

## Stack and runtime model

- Bun + TypeScript service: `src/index.ts` boots `Bun.serve` (idle timeout 30 s), `src/app.ts` routes.
- `web/index.html` page shell; `web/app.js` settings (localStorage `clock.*`, overridable by `?face=&h24=&seconds=&theme=&lang=`), toolbar, gallery, frame loop, screen wake lock; `web/faces.js` the ten faces, each `{ id, name, mount(root, ctx) -> { update(now) } }`; `web/words.js` word-clock grids and lighting rule (pure, tested); `web/app.css` tokens, chrome and one block per face.

## Directory map

```
space.yaml           * manifest: identity, service, deploy checks
src/index.ts           boot, SIGTERM
src/app.ts           * routes (allowlist)
src/*.test.ts          routes; word clock grids and phrases
web/faces.js         * the faces; to add one, append to FACES and add its CSS block and light/dark tokens
web/words.js           word clock grids (EN 12x9, ZH 6x5)
web/app.js / app.css   page logic and styles
deploy/post-receive    bare-repository hook on the host
icon.svg               panel icon and favicon
```

## Conventions

- Code, comments, docs and commits in English; UI strings in the dictionary. Commits follow Conventional Commits.

## Commands

```bash
bun install
PORT=9190 bun src/index.ts
bun run check                    # typecheck + tests
```

## Environment variables

Provided by ai-space: `PORT`. Nothing else is read.

## Deployment

- Runs on the space host as an ai-space supervised service (`space-clock.service`, user level), port 9190; `space app service clock`, `space app restart clock`, logs `journalctl --user -u space-clock -f`.
- Deploy: `git push deploy main` to the bare repository `<workspace>/repos/clock.git` on that host; its `post-receive` hook (`deploy/post-receive`) runs `space app deploy clock`: checkout, `bun install --frozen-lockfile`, `deploy.check`, restart, wait for `/healthz`; a failure keeps the previous tree and service.
- A new app's first deploy also needs `space app sync` on that host, which registers the directory.
- Public URL: the space router's wildcard hostname `clock.<SPACE_DOMAIN>` (manifest `url: /?lang={lang}`), behind the space's access layer.
- Source: GitHub `ericz-lab/clock` (public, MIT, remote `origin`). After a deploy, `git push origin main`.
- Keep `bun.lock` at `"lockfileVersion": 1` while a host runs Bun 1.3.

## Known pitfalls

- The flip face swaps the lower half's text on the lower leaf's `animationend`; reduced motion shortens the animation instead of removing it, or the lower half would never update.
