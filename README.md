# Clock

A full-screen clock with ten faces you can switch between, for a desk or an always-on screen, with a world clock for any city or IANA time zone. It shows the viewer's own device time; other cities are computed in the browser from their time zone.

| Face | 中文 | Look |
| --- | --- | --- |
| Minimal | 极简 | quiet analog dial, sweeping orange seconds hand |
| Station | 车站钟 | railway dial; the red disc sweeps in 58.5 s, waits at 12, the minute hand jumps |
| Flip | 翻页 | split-flap cards that fold over each second |
| Neon | 霓虹 | glowing seven-segment digits |
| Nixie | 辉光管 | glass tubes with stacked numerals, one lit orange |
| Words | 文字 | a letter grid that spells the time in five-minute steps (English and Chinese grids) |
| Rings | 圆环 | three arcs that fill through the hour, the minute and the day |
| Binary | 二进制 | each digit as a column of bits |
| Type | 大字 | one huge thin time, the date and how much of the day has gone |
| Tape | 滚轮 | number tapes rolling under a reading band |

## Use

- ← / → or swipe to switch faces; the face name or the grid button (or `G`) opens the gallery with live previews.
- `24h` / `12h`, seconds on or off, full screen (`F` or double-click), theme (system / light / dark) and 中 / EN are in the toolbar, which hides itself after a few seconds; move the mouse or tap to bring it back.
- World clock: the globe button (or `W`) shows every chosen city as a tile in the current face, with day or night, today / tomorrow / yesterday and the offset from local time. `+` adds a city (search in English, Chinese or by zone id such as `Europe/Oslo`), × removes one, and a tile opens that city full screen.
- Every choice is remembered in the browser. A kiosk can pin them in the URL: `/?face=flip&h24=0&seconds=0&theme=dark&lang=zh`, one city with `&zone=tokyo` (or `&zone=Asia/Tokyo`), a wall of cities with `&view=world&cities=local,newyork,london,tokyo`.
- While the page is visible it asks the browser to keep the screen awake.

## Install

On an ai-space Space: `space app install clock`, or from the panel's app catalog. Every release's `.spaceapp` packages are on the [GitHub releases](https://github.com/ericz-lab/clock/releases).

## Run locally

```bash
bun install
PORT=9190 bun src/index.ts
bun run check
```

See [AGENTS.md](AGENTS.md) for the deploy channel. This is an [ai-space](https://github.com/ericz-lab/ai-space) app; the contract is its `docs/app-spec.md`. It also runs on its own: `bun src/index.ts` serves the page on `127.0.0.1:${PORT:-9190}`.

## License

[MIT](LICENSE)
