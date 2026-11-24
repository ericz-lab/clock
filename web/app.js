// The page: settings, language and theme, the toolbar, the style gallery, the world clock (a grid of
// cities, a city picker, one city full screen) and the frame loop. Time comes from the viewer's
// device; a city's wall time is computed in the browser from its IANA zone. Nothing is sent to the server.

import { FACES } from "./faces.js";
import { formatOffset, isDaytime, localZone, relation, resolveCity, searchCities, zoneClock } from "./zones.js";

const DICT = {
  en: {
    title: "Clock", styles: "Clock styles", prev: "Previous style", next: "Next style",
    h24: "24-hour clock", seconds: "Show seconds", fullscreen: "Full screen", lang: "中文",
    themeSystem: "Theme: follow system", themeLight: "Theme: light", themeDark: "Theme: dark",
    galleryTitle: "Clock styles", hint: "← → switch · G styles · W world clock · F full screen", close: "Close",
    am: "AM", pm: "PM", dayLeft: p => `${p}% of today has passed`,
    world: "World clock", single: "Back to one clock", addCity: "Add city", search: "Search a city or time zone",
    remove: c => `Remove ${c}`, open: c => `Show ${c} full screen`, empty: "No cities yet", noMatch: "No city or time zone matches",
    sameTime: "Same time", today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday", day: "Daytime", night: "Night",
    added: "Added",
  },
  zh: {
    title: "时钟", styles: "时钟样式", prev: "上一个样式", next: "下一个样式",
    h24: "24 小时制", seconds: "显示秒", fullscreen: "全屏", lang: "English",
    themeSystem: "主题：跟随系统", themeLight: "主题：浅色", themeDark: "主题：深色",
    galleryTitle: "时钟样式", hint: "← → 切换 · G 样式 · W 世界时钟 · F 全屏", close: "关闭",
    am: "上午", pm: "下午", dayLeft: p => `今天已过去 ${p}%`,
    world: "世界时钟", single: "回到单个时钟", addCity: "添加城市", search: "搜索城市或时区",
    remove: c => `移除${c}`, open: c => `全屏显示${c}`, empty: "还没有城市", noMatch: "没有匹配的城市或时区",
    sameTime: "时间相同", today: "今天", tomorrow: "明天", yesterday: "昨天", day: "白天", night: "夜晚",
    added: "已添加",
  },
};

const store = {
  get(k) { try { return localStorage.getItem(`clock.${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`clock.${k}`, v); } catch {} },
};

const DEFAULT_CITIES = ["local", "newyork", "london", "tokyo"];
function loadCities() {
  let ids = query.get("cities")?.split(",");
  if (!ids) { try { ids = JSON.parse(store.get("cities") ?? "null"); } catch { ids = null; } }
  if (!Array.isArray(ids)) ids = DEFAULT_CITIES;
  return [...new Set(ids)].filter(id => resolveCity(id));
}

const html = document.documentElement;
const query = new URLSearchParams(location.search);
const state = {
  lang: html.lang.startsWith("zh") ? "zh" : "en",
  face: Math.max(0, FACES.findIndex(f => f.id === (query.get("face") || store.get("face")))),
  h24: (query.get("h24") ?? store.get("h24") ?? "1") !== "0",
  seconds: (query.get("seconds") ?? store.get("seconds") ?? "1") !== "0",
  view: (query.get("view") ?? store.get("view")) === "world" ? "world" : "single",
  zone: resolveCity(query.get("zone") ?? store.get("zone") ?? "local") ? (query.get("zone") ?? store.get("zone") ?? "local") : "local",
  cities: loadCities(),
};
const t = k => DICT[state.lang][k];
const here = zoneClock(localZone());

const dateFormats = {};
function ctx(zone) {
  const lang = state.lang, locale = lang === "zh" ? "zh-CN" : "en-US";
  const fmt = style => (dateFormats[`${locale}:${zone}:${style}`] ??= new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    ...(style === "short" ? { weekday: "short", day: "numeric" }
      : style === "long" ? { weekday: "long", month: "long", day: "numeric" }
        : { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
  }));
  return {
    lang, h24: state.h24, seconds: state.seconds,
    ampm: h => (h < 12 ? t("am") : t("pm")),
    date: (now, style) => fmt(style).format(new Date(now.epoch)),
    dayLeft: p => DICT[lang].dayLeft(p),
  };
}

/** "Tomorrow · +8 h", "Same time" */
function relationText(now, there) {
  const r = relation(here(now), there);
  const day = r.days > 0 ? t("tomorrow") : r.days < 0 ? t("yesterday") : t("today");
  if (r.minutes === 0) return t("sameTime");
  return `${day} · ${formatOffset(r.minutes)}`;
}

// ---- faces ------------------------------------------------------------------------------------

const stage = document.getElementById("stage");
const cityTag = document.getElementById("cityTag");
/** Everything the frame loop drives: { inst, clock, tick?(now, zoned) } */
let live = [];
let thumbs = [];

function mountFace(root, face, base, zone) {
  root.replaceChildren();
  root.className = `${base} face face-${face.id}`;
  const clock = zoneClock(zone);
  const inst = face.mount(root, ctx(zone));
  inst.update(clock(Date.now()));
  return { inst, clock };
}

function render() {
  const face = FACES[state.face];
  document.getElementById("faceName").textContent = face.name[state.lang];
  document.body.classList.toggle("world-view", state.view === "world");
  document.getElementById("world").setAttribute("aria-pressed", String(state.view === "world"));
  document.getElementById("world").title = t(state.view === "world" ? "single" : "world");
  document.getElementById("world").setAttribute("aria-label", t(state.view === "world" ? "single" : "world"));
  document.querySelectorAll(".thumb").forEach((el, i) => el.setAttribute("aria-current", String(i === state.face)));
  if (state.view === "world") renderWorld(face);
  else renderSingle(face);
}

function renderSingle(face) {
  const city = resolveCity(state.zone) ?? resolveCity("local");
  live = [mountFace(stage, face, "stage", city.zone)];
  if (city.local) { cityTag.hidden = true; return; }
  cityTag.hidden = false;
  const name = document.createElement("b");
  name.textContent = city.name[state.lang];
  const rel = document.createElement("span");
  cityTag.replaceChildren(name, rel);
  const clock = live[0].clock;
  let last = "";
  live[0].tick = now => {
    const text = relationText(now, clock(now));
    if (text !== last) rel.textContent = last = text;
  };
}

/** Columns for n tiles in a w x h area, keeping tiles near 16:10 and as large as possible. */
function columns(n, w, h) {
  if (w < 600) return 1;
  let best = 1, bestSize = 0;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const size = Math.min(w / cols / 16, (h / rows - 44) / 10);
    if (size > bestSize) { bestSize = size; best = cols; }
  }
  return best;
}

function renderWorld(face) {
  cityTag.hidden = true;
  stage.replaceChildren();
  stage.className = "stage world";
  const grid = document.createElement("div");
  grid.className = "world-grid";
  stage.append(grid);
  live = [];
  const cities = state.cities.map(id => resolveCity(id)).filter(Boolean);
  if (!cities.length) {
    const empty = document.createElement("div");
    empty.className = "world-empty";
    const p = document.createElement("p");
    p.textContent = t("empty");
    const add = document.createElement("button");
    add.type = "button";
    add.className = "ink-btn";
    add.textContent = t("addCity");
    add.addEventListener("click", openPicker);
    empty.append(p, add);
    stage.append(empty);
    return;
  }
  const cols = columns(cities.length, innerWidth, innerHeight);
  grid.style.setProperty("--cols", String(cols));
  grid.style.setProperty("--rows", String(Math.ceil(cities.length / cols)));
  grid.classList.toggle("scroll", cols === 1 && cities.length > 1);
  for (const city of cities) {
    const tile = document.createElement("div");
    tile.className = "tile";
    const view = document.createElement("button");
    view.type = "button";
    view.className = "tile-open";
    view.setAttribute("aria-label", t("open")(city.name[state.lang]));
    const faceRoot = document.createElement("div");
    view.append(faceRoot);
    const label = document.createElement("div");
    label.className = "tile-label";
    const sky = document.createElement("i");
    sky.className = "tile-sky";
    const name = document.createElement("b");
    name.textContent = city.name[state.lang];
    const rel = document.createElement("span");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "tile-remove";
    remove.setAttribute("aria-label", t("remove")(city.name[state.lang]));
    remove.title = t("remove")(city.name[state.lang]);
    remove.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>';
    label.append(sky, name, rel, remove);
    tile.append(view, label);
    grid.append(tile);
    view.addEventListener("click", () => { state.zone = city.id; store.set("zone", city.id); setView("single"); });
    remove.addEventListener("click", () => {
      state.cities = state.cities.filter(id => id !== city.id);
      saveCities();
      render();
    });
    const entry = mountFace(faceRoot, face, "tile-face", city.zone);
    let last = "";
    entry.tick = (now, zoned) => {
      const day = isDaytime(zoned);
      const text = `${relationText(now, zoned)}|${day}`;
      if (text === last) return;
      last = text;
      rel.textContent = text.split("|")[0];
      sky.className = `tile-sky ${day ? "sun" : "moon"}`;
      sky.title = t(day ? "day" : "night");
    };
    live.push(entry);
  }
}

function saveCities() { store.set("cities", JSON.stringify(state.cities)); }

function setView(view) {
  state.view = view;
  store.set("view", view);
  render();
}

function showFace(index) {
  state.face = (index + FACES.length) % FACES.length;
  store.set("face", FACES[state.face].id);
  render();
}

function frame() {
  const now = Date.now();
  for (const e of live) {
    const zoned = e.clock(now);
    e.inst.update(zoned);
    e.tick?.(now, zoned);
  }
  for (const e of thumbs) e.inst.update(e.clock(now));
  requestAnimationFrame(frame);
}

let resizeTimer = 0;
addEventListener("resize", () => {
  if (state.view !== "world") return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 150);
});

// ---- style gallery ----------------------------------------------------------------------------

const gallery = document.getElementById("gallery");
const grid = document.getElementById("galleryGrid");

function galleryZone() {
  return state.view === "single" ? (resolveCity(state.zone) ?? resolveCity("local")).zone : localZone();
}

function openGallery() {
  closePicker();
  grid.replaceChildren();
  const zone = galleryZone();
  thumbs = FACES.map((face, i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "thumb";
    card.setAttribute("aria-current", String(i === state.face));
    const view = document.createElement("div");
    const name = document.createElement("span");
    name.className = "thumb-name";
    name.textContent = face.name[state.lang];
    card.append(view, name);
    card.addEventListener("click", () => { closeGallery(); showFace(i); });
    grid.append(card);
    return mountFace(view, face, "thumb-face", zone);
  });
  gallery.hidden = false;
  grid.querySelector('[aria-current="true"]')?.focus({ preventScroll: false });
}

function closeGallery() {
  gallery.hidden = true;
  grid.replaceChildren();
  thumbs = [];
}

// ---- city picker ------------------------------------------------------------------------------

const picker = document.getElementById("picker");
const search = document.getElementById("citySearch");
const list = document.getElementById("cityList");
let pickerTimer = 0;

function fillPicker() {
  const results = searchCities(search.value);
  const now = Date.now();
  const locale = state.lang === "zh" ? "zh-CN" : "en-US";
  const time = zone => new Intl.DateTimeFormat(locale, { timeZone: zone, hour: "numeric", minute: "2-digit", hourCycle: state.h24 ? "h23" : "h12" }).format(new Date(now));
  list.replaceChildren();
  if (!results.length) {
    const li = document.createElement("li");
    li.className = "city-none";
    li.textContent = t("noMatch");
    list.append(li);
    return;
  }
  for (const city of results) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    const added = state.cities.includes(city.id);
    b.disabled = added;
    const name = document.createElement("span");
    name.className = "city-name";
    name.textContent = city.name[state.lang];
    const zone = document.createElement("span");
    zone.className = "city-zone";
    zone.textContent = city.zone;
    const right = document.createElement("span");
    right.className = "city-time";
    const zoned = zoneClock(city.zone)(now);
    right.textContent = added ? t("added") : `${time(city.zone)} · ${relationText(now, zoned)}`;
    b.append(name, zone, right);
    b.addEventListener("click", () => {
      state.cities.push(city.id);
      saveCities();
      closePicker();
      setView("world");
    });
    li.append(b);
    list.append(li);
  }
}

function openPicker() {
  closeGallery();
  search.value = "";
  search.placeholder = t("search");
  search.setAttribute("aria-label", t("search"));
  fillPicker();
  picker.hidden = false;
  search.focus();
}
function closePicker() { picker.hidden = true; list.replaceChildren(); }

search.addEventListener("input", () => { clearTimeout(pickerTimer); pickerTimer = setTimeout(fillPicker, 80); });
search.addEventListener("keydown", e => {
  if (e.key === "Enter") list.querySelector("button:not(:disabled)")?.click();
});

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
  render();
  if (!gallery.hidden) openGallery();
  if (!picker.hidden) fillPicker();
}

document.getElementById("prev").addEventListener("click", () => showFace(state.face - 1));
document.getElementById("next").addEventListener("click", () => showFace(state.face + 1));
document.getElementById("faceName").addEventListener("click", openGallery);
document.getElementById("openGallery").addEventListener("click", openGallery);
document.getElementById("closeGallery").addEventListener("click", closeGallery);
document.getElementById("closePicker").addEventListener("click", closePicker);
document.getElementById("addCity").addEventListener("click", openPicker);
document.getElementById("world").addEventListener("click", () => setView(state.view === "world" ? "single" : "world"));
cityTag.addEventListener("click", () => setView("world"));
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
  idleTimer = setTimeout(() => {
    if (!bar.matches(":hover, :focus-within") && gallery.hidden && picker.hidden) document.body.classList.add("idle");
  }, 3500);
}
addEventListener("pointermove", wake);
addEventListener("keydown", wake);
stage.addEventListener("click", e => {
  if (state.view === "world" && e.target.closest(".tile")) return;
  if (document.body.classList.contains("idle")) wake();
  else { clearTimeout(idleTimer); document.body.classList.add("idle"); }
});
stage.addEventListener("dblclick", e => { if (state.view === "single") toggleFullscreen(); });

// swipe left / right on a phone switches the face
let touchX = null, touchY = null;
stage.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
stage.addEventListener("touchend", e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
  touchX = touchY = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showFace(state.face + (dx < 0 ? 1 : -1));
});

addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Escape") { if (!picker.hidden) closePicker(); else if (!gallery.hidden) closeGallery(); return; }
  if (e.target instanceof HTMLInputElement) return;
  if (e.key === "ArrowRight") showFace(state.face + 1);
  else if (e.key === "ArrowLeft") showFace(state.face - 1);
  else if (e.key === "g" || e.key === "G") gallery.hidden ? openGallery() : closeGallery();
  else if (e.key === "w" || e.key === "W") setView(state.view === "world" ? "single" : "world");
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
render();
wake();
requestAnimationFrame(frame);
