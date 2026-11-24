// The page: settings, language and theme, the toolbar, the gallery and the frame loop.
// The clock shows the viewer's own device time and timezone; nothing is sent to the server.

import { FACES } from "./faces.js";

const DICT = {
  en: {
    title: "Clock", styles: "Clock styles", prev: "Previous style", next: "Next style",
    h24: "24-hour clock", seconds: "Show seconds", fullscreen: "Full screen", lang: "中文",
    themeSystem: "Theme: follow system", themeLight: "Theme: light", themeDark: "Theme: dark",
    galleryTitle: "Clock styles", hint: "← → switch · G styles · F full screen", close: "Close",
    am: "AM", pm: "PM", dayLeft: p => `${p}% of today has passed`,
  },
  zh: {
    title: "时钟", styles: "时钟样式", prev: "上一个样式", next: "下一个样式",
    h24: "24 小时制", seconds: "显示秒", fullscreen: "全屏", lang: "English",
    themeSystem: "主题：跟随系统", themeLight: "主题：浅色", themeDark: "主题：深色",
    galleryTitle: "时钟样式", hint: "← → 切换 · G 样式 · F 全屏", close: "关闭",
    am: "上午", pm: "下午", dayLeft: p => `今天已过去 ${p}%`,
  },
};

const store = {
  get(k) { try { return localStorage.getItem(`clock.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`clock.${k}`, v); } catch {} },
};

const html = document.documentElement;
const query = new URLSearchParams(location.search);
const state = {
  lang: html.lang.startsWith("zh") ? "zh" : "en",
  face: Math.max(0, FACES.findIndex(f => f.id === (query.get("face") || store.get("face")))),
  h24: (query.get("h24") ?? store.get("h24") ?? "1") !== "0",
  seconds: (query.get("seconds") ?? store.get("seconds") ?? "1") !== "0",
};
const t = k => DICT[state.lang][k];

const dateFormats = {};
function ctx() {
  const lang = state.lang, locale = lang === "zh" ? "zh-CN" : "en-US";
  const fmt = style => (dateFormats[`${locale}:${style}`] ??= new Intl.DateTimeFormat(locale,
    style === "short" ? { weekday: "short", day: "numeric" }
      : style === "long" ? { weekday: "long", month: "long", day: "numeric" }
        : { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  return {
    lang, h24: state.h24, seconds: state.seconds,
    ampm: h => (h < 12 ? t("am") : t("pm")),
    date: (now, style) => fmt(style).format(now),
    dayLeft: p => DICT[lang].dayLeft(p),
  };
}

// ---- faces ------------------------------------------------------------------------------------

const stage = document.getElementById("stage");
let main = null;
let thumbs = [];

function mountFace(root, face) {
  root.replaceChildren();
  root.className = `${root === stage ? "stage" : "thumb-face"} face face-${face.id}`;
  const instance = face.mount(root, ctx());
  instance.update(new Date());
  return instance;
}

function showFace(index) {
  state.face = (index + FACES.length) % FACES.length;
  store.set("face", FACES[state.face].id);
  main = mountFace(stage, FACES[state.face]);
  document.getElementById("faceName").textContent = FACES[state.face].name[state.lang];
  document.querySelectorAll(".thumb").forEach((el, i) => el.setAttribute("aria-current", String(i === state.face)));
}

function frame() {
  const now = new Date();
  main?.update(now);
  for (const th of thumbs) th.update(now);
  requestAnimationFrame(frame);
}

// ---- gallery ----------------------------------------------------------------------------------

const gallery = document.getElementById("gallery");
const grid = document.getElementById("galleryGrid");

function openGallery() {
  grid.replaceChildren();
  thumbs = FACES.map((face, i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "thumb";
    card.setAttribute("aria-current", String(i === state.face));
    const view = document.createElement("div");
    view.className = "thumb-face";
    const name = document.createElement("span");
    name.className = "thumb-name";
    name.textContent = face.name[state.lang];
    card.append(view, name);
    card.addEventListener("click", () => { showFace(i); closeGallery(); });
    grid.append(card);
    return mountFace(view, face);
  });
  gallery.hidden = false;
  grid.querySelector('[aria-current="true"]')?.focus({ preventScroll: false });
}

function closeGallery() {
  gallery.hidden = true;
  grid.replaceChildren();
  thumbs = [];
}

// ---- toolbar ----------------------------------------------------------------------------------

const ICONS = {
  system: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
};

function themeName() { return html.dataset.theme || "system"; }

function renderChrome() {
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-label]").forEach(el => {
    el.setAttribute("aria-label", t(el.dataset.i18nLabel));
    el.title = t(el.dataset.i18nLabel);
  });
  const h24 = document.getElementById("h24"), secs = document.getElementById("secs");
  h24.textContent = state.h24 ? "24h" : "12h";
  h24.setAttribute("aria-pressed", String(state.h24));
  secs.textContent = state.lang === "zh" ? "秒" : ":ss";
  secs.setAttribute("aria-pressed", String(state.seconds));
  document.getElementById("lang").textContent = state.lang === "zh" ? "EN" : "中";
  const theme = document.getElementById("theme"), name = themeName();
  theme.innerHTML = ICONS[name];
  const label = t(name === "system" ? "themeSystem" : name === "light" ? "themeLight" : "themeDark");
  theme.setAttribute("aria-label", label);
  theme.title = label;
}

function rerender() {
  renderChrome();
  showFace(state.face);
  if (!gallery.hidden) openGallery();
}

document.getElementById("prev").addEventListener("click", () => showFace(state.face - 1));
document.getElementById("next").addEventListener("click", () => showFace(state.face + 1));
document.getElementById("faceName").addEventListener("click", openGallery);
document.getElementById("openGallery").addEventListener("click", openGallery);
document.getElementById("closeGallery").addEventListener("click", closeGallery);
document.getElementById("h24").addEventListener("click", () => { state.h24 = !state.h24; store.set("h24", state.h24 ? "1" : "0"); rerender(); });
document.getElementById("secs").addEventListener("click", () => { state.seconds = !state.seconds; store.set("seconds", state.seconds ? "1" : "0"); rerender(); });
document.getElementById("lang").addEventListener("click", () => {
  state.lang = state.lang === "zh" ? "en" : "zh";
  html.lang = state.lang === "zh" ? "zh-CN" : "en";
  store.set("lang", state.lang);
  rerender();
});
document.getElementById("theme").addEventListener("click", () => {
  const next = { system: "light", light: "dark", dark: "system" }[themeName()];
  if (next === "system") delete html.dataset.theme; else html.dataset.theme = next;
  store.set("theme", next);
  renderChrome();
});

const fsButton = document.getElementById("fullscreen");
const canFullscreen = !!document.documentElement.requestFullscreen;
fsButton.hidden = !canFullscreen;
function toggleFullscreen() {
  if (!canFullscreen) return;
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}
fsButton.addEventListener("click", toggleFullscreen);

// ---- the toolbar hides itself while the clock is just being looked at -------------------------

const bar = document.getElementById("bar");
let idleTimer = 0;
function wake() {
  document.body.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!bar.matches(":hover, :focus-within")) document.body.classList.add("idle"); }, 3500);
}
addEventListener("pointermove", wake);
addEventListener("keydown", wake);
stage.addEventListener("click", () => {
  if (document.body.classList.contains("idle")) wake();
  else { clearTimeout(idleTimer); document.body.classList.add("idle"); }
});
stage.addEventListener("dblclick", toggleFullscreen);

// swipe left / right on a phone switches the face
let touchX = null;
stage.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
stage.addEventListener("touchend", e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 60) showFace(state.face + (dx < 0 ? 1 : -1));
});

addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Escape" && !gallery.hidden) closeGallery();
  else if (e.key === "ArrowRight") showFace(state.face + 1);
  else if (e.key === "ArrowLeft") showFace(state.face - 1);
  else if (e.key === "g" || e.key === "G") gallery.hidden ? openGallery() : closeGallery();
  else if (e.key === "f" || e.key === "F") toggleFullscreen();
});

// ---- keep an always-on screen awake while the page is visible ---------------------------------

let wakeLock = null;
async function holdScreen() {
  if (!("wakeLock" in navigator) || document.hidden || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch {}
}
document.addEventListener("visibilitychange", holdScreen);
addEventListener("pointerdown", holdScreen, { once: true });
holdScreen();

renderChrome();
showFace(state.face);
wake();
requestAnimationFrame(frame);
