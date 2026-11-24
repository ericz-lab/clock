// The clock faces. Each face is { id, name: { en, zh }, mount(root, ctx) -> { update(now) } }.
// `root` is an empty element that is a size container, so a face lays itself out in cq units and the
// same code draws the full screen and the gallery thumbnails. `update` runs every animation frame;
// faces that only change once a second keep a key and return early.
// ctx: { h24: boolean, seconds: boolean, lang: "en" | "zh", ampm(hours) -> string, date(now) -> string }

import { EN_GRID, ZH_GRID, wordCells } from "./words.js";

const pad = n => String(n).padStart(2, "0");
const NS = "http://www.w3.org/2000/svg";

/** Hours as the face shows them, with the 12-hour label when it applies. */
function clockHours(now, ctx) {
  const h = now.getHours();
  if (ctx.h24) return { h, label: "" };
  return { h: (h % 12) || 12, label: ctx.ampm(h) };
}

/** Fractional hand positions for an analog face. */
function hands(now) {
  const ms = now.getMilliseconds(), s = now.getSeconds() + ms / 1000;
  const m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
  return { s, m, h };
}

const rot = (el, deg) => el.setAttribute("transform", `rotate(${deg.toFixed(3)})`);

function ticks(n, inner, outer, cls, every = 0, everyCls = "") {
  let out = "";
  for (let i = 0; i < n; i++) {
    const major = every && i % every === 0;
    out += `<line class="${major ? everyCls : cls}" y1="${-outer}" y2="${-(major ? inner - 4 : inner)}" transform="rotate(${(i * 360) / n})"/>`;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// 1. Minimal: a quiet analog dial, thin numerals, sweeping orange seconds hand

const minimal = {
  id: "minimal",
  name: { en: "Minimal", zh: "极简" },
  mount(root, ctx) {
    let nums = "";
    for (let i = 1; i <= 12; i++) {
      const a = (i * Math.PI) / 6;
      nums += `<text x="${(Math.sin(a) * 71).toFixed(2)}" y="${(-Math.cos(a) * 71).toFixed(2)}">${i}</text>`;
    }
    root.innerHTML = `<div class="mn"><svg viewBox="-100 -100 200 200" aria-hidden="true">
      <circle class="mn-dial" r="96"/>
      ${ticks(60, 88, 92, "mn-tick", 5, "mn-tick5")}
      <g class="mn-nums">${nums}</g>
      <text class="mn-date" y="34"></text>
      <line class="mn-h" y1="10" y2="-46"/>
      <line class="mn-m" y1="12" y2="-74"/>
      <g class="mn-s"><line y1="18" y2="-84"/><circle r="3.6"/></g>
      <circle class="mn-cap" r="1.4"/>
    </svg></div>`;
    const [h, m, s] = ["h", "m", "s"].map(k => root.querySelector(`.mn-${k}`));
    const date = root.querySelector(".mn-date");
    let day = "";
    return {
      update(now) {
        const p = hands(now);
        rot(h, p.h * 30); rot(m, p.m * 6);
        if (ctx.seconds) rot(s, p.s * 6);
        s.style.display = ctx.seconds ? "" : "none";
        const d = ctx.date(now, "short");
        if (d !== day) date.textContent = day = d;
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 2. Station: a railway dial; the red seconds disc sweeps in 58.5 s, waits at 12, the minute hand jumps

const station = {
  id: "station",
  name: { en: "Station", zh: "车站钟" },
  mount(root, ctx) {
    let marks = "";
    for (let i = 0; i < 60; i++) {
      marks += i % 5 === 0
        ? `<rect class="st-bar" x="-3.2" y="-91" width="6.4" height="22" transform="rotate(${i * 6})"/>`
        : `<rect class="st-min" x="-1.1" y="-91" width="2.2" height="7" transform="rotate(${i * 6})"/>`;
    }
    root.innerHTML = `<div class="st"><svg viewBox="-100 -100 200 200" aria-hidden="true">
      <circle class="st-rim" r="99"/>
      <circle class="st-dial" r="95"/>
      ${marks}
      <polygon class="st-h" points="-5,14 5,14 4,-56 -4,-56"/>
      <polygon class="st-m" points="-4,18 4,18 3,-84 -3,-84"/>
      <g class="st-s"><line y1="26" y2="-56"/><circle cy="-58" r="9"/></g>
      <circle class="st-cap" r="2.2"/>
    </svg></div>`;
    const [h, m, s] = ["h", "m", "s"].map(k => root.querySelector(`.st-${k}`));
    return {
      update(now) {
        const sec = now.getSeconds() + now.getMilliseconds() / 1000;
        rot(s, Math.min(sec / 58.5, 1) * 360);
        rot(m, now.getMinutes() * 6);
        rot(h, ((now.getHours() % 12) + now.getMinutes() / 60) * 30);
        s.style.display = ctx.seconds ? "" : "none";
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 3. Flip: split-flap cards, the upper leaf folds down over the lower one

const flip = {
  id: "flip",
  name: { en: "Flip", zh: "翻页" },
  mount(root, ctx) {
    const groups = ctx.seconds ? 3 : 2;
    const card = () => `<div class="fl-card">
      <div class="fl-half fl-top"><span></span></div><div class="fl-half fl-bot"><span></span></div>
      <div class="fl-half fl-top fl-leaf-top"><span></span></div><div class="fl-half fl-bot fl-leaf-bot"><span></span></div>
    </div>`;
    root.innerHTML = `<div class="fl" style="--n:${groups}">
      <div class="fl-row">${Array.from({ length: groups }, card).join("")}</div>
      <div class="fl-meta"><span class="fl-ampm"></span><span class="fl-date"></span></div>
    </div>`;
    const cards = [...root.querySelectorAll(".fl-card")].map(el => {
      const [top, bot, leafTop, leafBot] = [...el.querySelectorAll("span")];
      return { el, top, bot, leafTop, leafBot, value: "" };
    });
    cards.forEach(c => c.el.querySelector(".fl-leaf-bot").addEventListener("animationend", () => {
      c.bot.textContent = c.value;
      c.el.classList.remove("go");
    }));
    const ampm = root.querySelector(".fl-ampm"), date = root.querySelector(".fl-date");
    let last = "";
    function set(c, v, animate) {
      if (c.value === v) return;
      const old = c.value;
      c.value = v;
      if (!animate || !old) { c.top.textContent = c.bot.textContent = c.leafTop.textContent = c.leafBot.textContent = v; return; }
      c.top.textContent = v; c.bot.textContent = old; c.leafTop.textContent = old; c.leafBot.textContent = v;
      c.el.classList.remove("go"); void c.el.offsetWidth; c.el.classList.add("go");
    }
    return {
      update(now) {
        const { h, label } = clockHours(now, ctx);
        const values = [pad(h), pad(now.getMinutes()), pad(now.getSeconds())].slice(0, groups);
        const k = values.join(":");
        if (k === last) return;
        const animate = last !== "" && !document.hidden;
        last = k;
        values.forEach((v, i) => set(cards[i], v, animate));
        ampm.textContent = label;
        date.textContent = ctx.date(now, "long");
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 4. Neon: glowing seven-segment digits

const SEGMENTS = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg" };

const neon = {
  id: "neon",
  name: { en: "Neon", zh: "霓虹" },
  mount(root, ctx) {
    const digit = cls => `<div class="ne-digit ${cls}">${[..."abcdefg"].map(s => `<i class="ne-seg ne-${s}"></i>`).join("")}</div>`;
    const colon = cls => `<div class="ne-colon ${cls}"><i></i><i></i></div>`;
    root.innerHTML = `<div class="ne ${ctx.seconds ? "ne-secs" : ""}"><div class="ne-row">
      ${digit("ne-a1")}${digit("ne-a1")}${colon("ne-a1")}${digit("ne-a2")}${digit("ne-a2")}
      ${ctx.seconds ? colon("ne-a2") + digit("ne-a3 ne-small") + digit("ne-a3 ne-small") : ""}
    </div><div class="ne-meta"><span class="ne-ampm"></span><span class="ne-date"></span></div></div>`;
    const digits = [...root.querySelectorAll(".ne-digit")];
    const colons = [...root.querySelectorAll(".ne-colon")];
    const ampm = root.querySelector(".ne-ampm"), date = root.querySelector(".ne-date");
    let last = "";
    return {
      update(now) {
        const { h, label } = clockHours(now, ctx);
        const text = pad(h) + pad(now.getMinutes()) + pad(now.getSeconds());
        const blink = now.getMilliseconds() < 500;
        colons.forEach(c => c.classList.toggle("off", !blink));
        if (text === last) return;
        last = text;
        digits.forEach((d, i) => {
          const on = SEGMENTS[text[i]];
          // a leading zero of the 12-hour clock stays dark, like a real display
          const blank = i === 0 && !ctx.h24 && text[0] === "0";
          d.querySelectorAll(".ne-seg").forEach(seg => seg.classList.toggle("on", !blank && on.includes(seg.classList[1].slice(3))));
        });
        ampm.textContent = label;
        date.textContent = ctx.date(now, "long");
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 5. Nixie: glass tubes with stacked numerals, the lit one glowing orange

const nixie = {
  id: "nixie",
  name: { en: "Nixie", zh: "辉光管" },
  mount(root, ctx) {
    const tube = () => `<div class="nx-tube"><div class="nx-stack">${"0123456789".split("").map(d => `<b>${d}</b>`).join("")}</div></div>`;
    const sep = `<div class="nx-sep"><i></i><i></i></div>`;
    const n = ctx.seconds ? 3 : 2;
    root.innerHTML = `<div class="nx" style="--n:${n}"><div class="nx-row">
      ${Array.from({ length: n }, () => tube() + tube()).join(sep)}
    </div><div class="nx-base"><span class="nx-ampm"></span><span class="nx-date"></span></div></div>`;
    const tubes = [...root.querySelectorAll(".nx-stack")].map(s => [...s.children]);
    const ampm = root.querySelector(".nx-ampm"), date = root.querySelector(".nx-date");
    let last = "";
    return {
      update(now) {
        const { h, label } = clockHours(now, ctx);
        const text = (pad(h) + pad(now.getMinutes()) + pad(now.getSeconds())).slice(0, n * 2);
        if (text === last) return;
        last = text;
        tubes.forEach((nums, i) => nums.forEach((b, d) => b.classList.toggle("on", String(d) === text[i])));
        ampm.textContent = label;
        date.textContent = ctx.date(now, "long");
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 6. Words: a letter grid that spells the time in five-minute steps, dots for the minutes between

const words = {
  id: "words",
  name: { en: "Words", zh: "文字" },
  mount(root, ctx) {
    const grid = ctx.lang === "zh" ? ZH_GRID : EN_GRID;
    const cols = [...grid[0]].length;
    root.innerHTML = `<div class="wd ${ctx.lang === "zh" ? "wd-zh" : ""}" style="--cols:${cols};--rows:${grid.length}">
      <div class="wd-grid" role="img">${grid.map((row, r) => [...row].map((ch, c) => `<span data-k="${r}:${c}">${ch}</span>`).join("")).join("")}</div>
      <div class="wd-dots"><i></i><i></i><i></i><i></i></div>
    </div>`;
    const cells = [...root.querySelectorAll(".wd-grid span")];
    const dots = [...root.querySelectorAll(".wd-dots i")];
    const label = root.querySelector(".wd-grid");
    let last = "";
    return {
      update(now) {
        const k = `${now.getHours()}:${now.getMinutes()}`;
        if (k === last) return;
        last = k;
        const r = wordCells(now.getHours(), now.getMinutes(), ctx.lang);
        cells.forEach(c => c.classList.toggle("on", r.cells.has(c.dataset.k)));
        dots.forEach((d, i) => d.classList.toggle("on", i < r.dots));
        label.setAttribute("aria-label", r.text);
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 7. Rings: three concentric arcs fill up through the hour, the minute and the day

const rings = {
  id: "rings",
  name: { en: "Rings", zh: "圆环" },
  mount(root, ctx) {
    const ring = (cls, r) => `<circle class="rg-track ${cls}" r="${r}"/><circle class="rg-arc ${cls}" r="${r}" pathLength="100" transform="rotate(-90)"/>`;
    root.innerHTML = `<div class="rg"><svg viewBox="-100 -100 200 200" aria-hidden="true">
      ${ring("rg-h", 88)}${ring("rg-m", 72)}${ctx.seconds ? ring("rg-s", 56) : ""}
    </svg><div class="rg-center"><div class="rg-time"></div><div class="rg-sub"></div></div></div>`;
    const arc = cls => root.querySelector(`.rg-arc.${cls}`);
    const [ah, am, as] = [arc("rg-h"), arc("rg-m"), arc("rg-s")];
    const time = root.querySelector(".rg-time"), sub = root.querySelector(".rg-sub");
    const set = (el, p) => el && el.setAttribute("stroke-dasharray", `${Math.max(p, 0.001).toFixed(3)} 100`);
    let last = "";
    return {
      update(now) {
        const p = hands(now);
        set(ah, ctx.h24 ? ((now.getHours() + p.m / 60) / 24) * 100 : (p.h / 12) * 100);
        set(am, (p.m / 60) * 100);
        set(as, (p.s / 60) * 100);
        const { h, label } = clockHours(now, ctx);
        const k = `${h}:${now.getMinutes()}:${label}`;
        if (k === last) return;
        last = k;
        time.textContent = `${ctx.h24 ? pad(h) : h}:${pad(now.getMinutes())}`;
        sub.textContent = [label, ctx.date(now, "short")].filter(Boolean).join(" · ");
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 8. Binary: each decimal digit as a column of bits (8 4 2 1)

const binary = {
  id: "binary",
  name: { en: "Binary", zh: "二进制" },
  mount(root, ctx) {
    const bits = ctx.seconds ? [2, 4, 3, 4, 3, 4] : [2, 4, 3, 4];
    const col = (n, i) => `<div class="bn-col ${i % 2 ? "bn-ones" : ""}">${[8, 4, 2, 1].map(v => `<i class="${v >= 1 << n ? "bn-none" : ""}" data-v="${v}"></i>`).join("")}<b></b></div>`;
    root.innerHTML = `<div class="bn" style="--cols:${bits.length}"><div class="bn-board">
      <div class="bn-legend"><span>8</span><span>4</span><span>2</span><span>1</span><b></b></div>
      ${bits.map(col).join("")}
    </div><div class="bn-meta"></div></div>`;
    const cols = [...root.querySelectorAll(".bn-col")].map(c => ({ dots: [...c.querySelectorAll("i")], label: c.querySelector("b") }));
    const meta = root.querySelector(".bn-meta");
    let last = "";
    return {
      update(now) {
        const { h, label } = clockHours(now, ctx);
        const text = (pad(h) + pad(now.getMinutes()) + pad(now.getSeconds())).slice(0, bits.length);
        if (text === last) return;
        last = text;
        cols.forEach((c, i) => {
          const d = Number(text[i]);
          c.dots.forEach(dot => dot.classList.toggle("on", (d & Number(dot.dataset.v)) !== 0));
          c.label.textContent = text[i];
        });
        meta.textContent = [label, ctx.date(now, "long")].filter(Boolean).join(" · ");
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 9. Type: one huge thin time, the date, and how much of the day has gone

const type = {
  id: "type",
  name: { en: "Type", zh: "大字" },
  mount(root, ctx) {
    root.innerHTML = `<div class="ty">
      <div class="ty-date"></div>
      <div class="ty-time"><span class="ty-hm"></span><span class="ty-side"><span class="ty-ampm"></span><span class="ty-s"></span></span></div>
      <div class="ty-day"><div class="ty-bar"><i></i></div><span class="ty-pct"></span></div>
    </div>`;
    const [hm, s, ap, dt, bar, pct] = [".ty-hm", ".ty-s", ".ty-ampm", ".ty-date", ".ty-bar i", ".ty-pct"].map(q => root.querySelector(q));
    let last = "";
    return {
      update(now) {
        const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
        bar.style.transform = `scaleX(${(secs / 86400).toFixed(5)})`;
        const { h, label } = clockHours(now, ctx);
        const k = `${h}:${now.getMinutes()}:${now.getSeconds()}`;
        if (k === last) return;
        last = k;
        hm.textContent = `${ctx.h24 ? pad(h) : h}:${pad(now.getMinutes())}`;
        s.textContent = ctx.seconds ? pad(now.getSeconds()) : "";
        ap.textContent = label;
        dt.textContent = ctx.date(now, "full");
        pct.textContent = ctx.dayLeft(Math.floor((secs / 86400) * 100));
      },
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 10. Tape: vertical number tapes that roll the current value under a reading band

const tape = {
  id: "tape",
  name: { en: "Tape", zh: "滚轮" },
  mount(root, ctx) {
    const hours = ctx.h24 ? Array.from({ length: 24 }, (_, i) => pad(i)) : Array.from({ length: 12 }, (_, i) => String(i + 1));
    const sixty = Array.from({ length: 60 }, (_, i) => pad(i));
    const lists = [hours, sixty, ...(ctx.seconds ? [sixty] : [])];
    root.innerHTML = `<div class="tp" style="--n:${lists.length}">
      <div class="tp-band"></div>
      <div class="tp-cols">${lists.map(l => `<div class="tp-col"><div class="tp-list">${l.map(v => `<span>${v}</span>`).join("")}</div></div>`).join("")}</div>
      <div class="tp-meta"></div>
    </div>`;
    const cols = [...root.querySelectorAll(".tp-list")].map(el => ({ el, items: [...el.children], index: -1 }));
    const meta = root.querySelector(".tp-meta");
    let last = "";
    function roll(c, index) {
      if (c.index === index) return;
      // wrapping to the top jumps instead of rolling back through the whole tape
      c.el.classList.toggle("jump", c.index === -1 || index < c.index);
      if (c.index >= 0) c.items[c.index].classList.remove("on");
      c.items[index].classList.add("on");
      c.el.style.setProperty("--i", String(index));
      c.index = index;
    }
    return {
      update(now) {
        const { h, label } = clockHours(now, ctx);
        const k = `${h}:${now.getMinutes()}:${now.getSeconds()}`;
        if (k === last) return;
        last = k;
        roll(cols[0], ctx.h24 ? h : h - 1);
        roll(cols[1], now.getMinutes());
        if (cols[2]) roll(cols[2], now.getSeconds());
        meta.textContent = [label, ctx.date(now, "long")].filter(Boolean).join(" · ");
      },
    };
  },
};

export const FACES = [minimal, station, flip, neon, nixie, words, rings, binary, type, tape];
