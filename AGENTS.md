# Clock - agent guide

Read this before touching code. Users read [README.md](README.md). This repository is an ai-space app; the contract is ai-space `docs/app-spec.md` (spec 1) and `space.yaml` is the only file ai-space reads.

## Rules

1. **Be honest.** Data you cannot obtain stays empty or is marked missing; `/api/widget` returns `{ ok: false, error }` on failure and the panel shows it as is.
2. **Traceable.** Every record answers "where from, when".
3. **Append, never rewrite.** History is added to, not edited.
4. **Configuration is environment.** Real values live in `.env` (ignored) or in the `space.env` ai-space generates; the repository holds only `.env.example`.
5. **Loopback only.** The service binds `127.0.0.1:${PORT}`; exposure is the space's job.
6. **Pages keep the three page rules** (ai-space `docs/app-spec.md#app-pages`): full-bleed (the layout fills the window, no outer border, card, radius or padding around the app); Chinese and English for every visible string with a visible 中 / EN switch, following `?lang=` (manifest `url` with `{lang}`), then the saved choice, then the browser; a theme button cycling system → light → dark, saved and applied in `<head>` before the first paint. Check each page at 1440 px and 375 px, in both languages and both themes.
7. **Pages load the space's scripts**: `/_space/usage.js` (time in use) and `/_space/feedback.js` (the Fix this button) in every page's `<head>`, added at runtime when a bundler builds the page (ai-space `docs/app-spec.md#usage`, `#fix-this`). What a person sends with it becomes an ai-todo task that the Fix Engineer fixes by this file, so keep its rules, checks and deploy channel current.
8. **Portable.** Skills and prompts name no host, ssh alias or home directory and carry no "am I on the server" marker; they take paths from the environment (`SPACE_APP_DIR`, `SPACE_APP_DATA_DIR`, `DATABASE_URL`) and the machine from the workspace `AGENTS.md`. Deployment facts live in the Deployment section below and nowhere else.

## Stack and runtime model

- Bun + TypeScript, `src/index.ts` is the whole service (`Bun.serve`, `bun:sqlite`).
- Runs as the user-level systemd unit `clock` from `<workspace>/apps/clock`, port 9190, health `GET /healthz`. Deployment resolves the workspace from explicit `SPACE_HOME`, then the target ai-space unit, then the remote `~/.ai-space` default.
- Storage and notifications are declared in `space.yaml` and reach the process as environment variables.

## Directory map

```
space.yaml           * the manifest: identity, service, agents, widgets, tasks, storage, notify
src/index.ts         * the service: /healthz, /api/widget, /jobs/refresh, SIGTERM handling
agents/assistant.md    system prompt of the `assistant` agent
prompts/               prompt files for scheduled agent tasks
deploy/app.service     user-level systemd unit template (@DIR@ and @SPACE_HOME@ substituted by deploy.sh)
deploy.sh              rsync, install the unit, restart, health check (no sudo)
icon.svg               panel icon, 64x64 viewBox
.env.example           every variable the service reads
```

## Conventions

- Widget contract: `GET /api/widget` -> `{ ok: true, items: [{ text, url, time }] }`, at most twenty items, newest first.
- Task endpoints (`/jobs/*`) do one round of work and answer `{ status: "ok" | "error" | "skipped", error? }`.
- Commit messages follow Conventional Commits.
- Time handling follows ai-space `docs/time.md`: distinguish instants, calendar dates and zoned local times; declare cron zones and share user-timezone context across web, CLI and AI. Read that document before changing time-related behavior.

## Commands

```bash
bun install
PORT=9190 bun src/index.ts
bun test
DEPLOY_HOST=<host> ./deploy.sh
```

## Environment variables

See `.env.example`. Provided by ai-space: `PORT`, `SPACE_APP`, `SPACE_APP_DIR`, `SPACE_APP_DATA_DIR`, `SPACE_API_URL`, `SPACE_APP_TOKEN`, plus `DATABASE_URL` / `BLOB_URL` when declared.

## Deployment

- Runs on the space host as an ai-space supervised service (`space-clock.service`, user level), port 9190; `space app service clock`, `space app restart clock`, logs `journalctl --user -u space-clock -f`.
- Deploy: `git push deploy main` to the bare repository `<workspace>/repos/clock.git` on that host; its `post-receive` hook (`deploy/post-receive`) runs `space app deploy clock`: checkout, `bun install --frozen-lockfile`, `deploy.check`, restart, wait for `/healthz`; a failure keeps the previous tree and service.
- A new app's first deploy also needs `space app sync` on that host, which registers the directory.
- Public URL: the space router's wildcard hostname `clock.<SPACE_DOMAIN>` (manifest `url: /?lang={lang}`), behind the space's access layer.
- Source: GitHub `ericz-lab/clock` (public, MIT, remote `origin`). After a deploy, `git push origin main`.
- Keep `bun.lock` at `"lockfileVersion": 1` while a host runs Bun 1.3.

## Known pitfalls

- Record every trap the moment it is hit; this section is the one that pays for itself.
