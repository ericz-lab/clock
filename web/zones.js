// World clock: the city catalog, wall-clock time in any IANA time zone, and how a zone relates to
// the viewer's own. Pure functions on top of Intl, shared by the page and the tests.

/** Cities offered by the picker. Any other IANA zone can still be added by its id. */
export const CITIES = [
  ["beijing", "Asia/Shanghai", "Beijing", "北京"], ["shanghai", "Asia/Shanghai", "Shanghai", "上海"],
  ["hongkong", "Asia/Hong_Kong", "Hong Kong", "香港"], ["taipei", "Asia/Taipei", "Taipei", "台北"],
  ["tokyo", "Asia/Tokyo", "Tokyo", "东京"], ["seoul", "Asia/Seoul", "Seoul", "首尔"],
  ["singapore", "Asia/Singapore", "Singapore", "新加坡"], ["bangkok", "Asia/Bangkok", "Bangkok", "曼谷"],
  ["kualalumpur", "Asia/Kuala_Lumpur", "Kuala Lumpur", "吉隆坡"], ["jakarta", "Asia/Jakarta", "Jakarta", "雅加达"],
  ["manila", "Asia/Manila", "Manila", "马尼拉"], ["hochiminh", "Asia/Ho_Chi_Minh", "Ho Chi Minh City", "胡志明市"],
  ["delhi", "Asia/Kolkata", "New Delhi", "新德里"], ["mumbai", "Asia/Kolkata", "Mumbai", "孟买"],
  ["kathmandu", "Asia/Kathmandu", "Kathmandu", "加德满都"], ["karachi", "Asia/Karachi", "Karachi", "卡拉奇"],
  ["dubai", "Asia/Dubai", "Dubai", "迪拜"], ["riyadh", "Asia/Riyadh", "Riyadh", "利雅得"],
  ["tehran", "Asia/Tehran", "Tehran", "德黑兰"], ["istanbul", "Europe/Istanbul", "Istanbul", "伊斯坦布尔"],
  ["moscow", "Europe/Moscow", "Moscow", "莫斯科"], ["athens", "Europe/Athens", "Athens", "雅典"],
  ["berlin", "Europe/Berlin", "Berlin", "柏林"], ["paris", "Europe/Paris", "Paris", "巴黎"],
  ["amsterdam", "Europe/Amsterdam", "Amsterdam", "阿姆斯特丹"], ["zurich", "Europe/Zurich", "Zurich", "苏黎世"],
  ["rome", "Europe/Rome", "Rome", "罗马"], ["madrid", "Europe/Madrid", "Madrid", "马德里"],
  ["stockholm", "Europe/Stockholm", "Stockholm", "斯德哥尔摩"], ["london", "Europe/London", "London", "伦敦"],
  ["cairo", "Africa/Cairo", "Cairo", "开罗"], ["nairobi", "Africa/Nairobi", "Nairobi", "内罗毕"],
  ["lagos", "Africa/Lagos", "Lagos", "拉各斯"], ["johannesburg", "Africa/Johannesburg", "Johannesburg", "约翰内斯堡"],
  ["newyork", "America/New_York", "New York", "纽约"], ["washington", "America/New_York", "Washington", "华盛顿"],
  ["toronto", "America/Toronto", "Toronto", "多伦多"], ["chicago", "America/Chicago", "Chicago", "芝加哥"],
  ["denver", "America/Denver", "Denver", "丹佛"], ["losangeles", "America/Los_Angeles", "Los Angeles", "洛杉矶"],
  ["sanfrancisco", "America/Los_Angeles", "San Francisco", "旧金山"], ["seattle", "America/Los_Angeles", "Seattle", "西雅图"],
  ["vancouver", "America/Vancouver", "Vancouver", "温哥华"], ["mexicocity", "America/Mexico_City", "Mexico City", "墨西哥城"],
  ["saopaulo", "America/Sao_Paulo", "São Paulo", "圣保罗"], ["buenosaires", "America/Argentina/Buenos_Aires", "Buenos Aires", "布宜诺斯艾利斯"],
  ["anchorage", "America/Anchorage", "Anchorage", "安克雷奇"], ["honolulu", "Pacific/Honolulu", "Honolulu", "檀香山"],
  ["sydney", "Australia/Sydney", "Sydney", "悉尼"], ["melbourne", "Australia/Melbourne", "Melbourne", "墨尔本"],
  ["perth", "Australia/Perth", "Perth", "珀斯"], ["auckland", "Pacific/Auckland", "Auckland", "奥克兰"],
  ["utc", "UTC", "UTC", "协调世界时"],
].map(([id, zone, en, zh]) => ({ id, zone, name: { en, zh } }));

const BY_ID = new Map(CITIES.map(c => [c.id, c]));

/** The viewer's own IANA zone. */
export const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function isZone(zone) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); return true; } catch { return false; }
}

/** A zone id without a catalog entry, named after its last segment: "America/Argentina/Cordoba" -> "Cordoba". */
const zoneName = zone => zone.split("/").pop().replace(/_/g, " ");

/**
 * Resolve a stored city id: "local", a catalog id, or an IANA zone. Returns null for anything else.
 * @returns {{ id: string, zone: string, name: { en: string, zh: string }, local?: boolean } | null}
 */
export function resolveCity(id, here = localZone()) {
  if (id === "local") {
    const known = CITIES.find(c => c.zone === here);
    const place = known ? known.name : { en: zoneName(here), zh: zoneName(here) };
    return { id, zone: here, local: true, name: { en: `Local · ${place.en}`, zh: `本地 · ${place.zh}` } };
  }
  const city = BY_ID.get(id);
  if (city) return city;
  if (typeof id === "string" && id.includes("/") && isZone(id)) return { id, zone: id, name: { en: zoneName(id), zh: zoneName(id) } };
  if (id === "UTC") return BY_ID.get("utc") ?? null;
  return null;
}

const partFormats = new Map();
/** Milliseconds to add to UTC to get the zone's wall time at `epoch` (whole seconds). */
export function zoneOffset(zone, epoch) {
  let fmt = partFormats.get(zone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
    });
    partFormats.set(zone, fmt);
  }
  const p = Object.fromEntries(fmt.formatToParts(new Date(epoch)).map(x => [x.type, x.value]));
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return wall - Math.floor(epoch / 1000) * 1000;
}

/** Wall-clock fields of one instant in one zone, with the Date getters the faces read. */
export class ZonedTime {
  constructor(epoch, offset) {
    this.epoch = epoch;
    this.offset = offset;
    this.wall = new Date(epoch + offset);
  }
  getHours() { return this.wall.getUTCHours(); }
  getMinutes() { return this.wall.getUTCMinutes(); }
  getSeconds() { return this.wall.getUTCSeconds(); }
  getMilliseconds() { return this.wall.getUTCMilliseconds(); }
  /** Days since 1970-01-01 in this zone's calendar. */
  day() { return Math.floor((this.epoch + this.offset) / 86_400_000); }
}

/**
 * A clock for one zone: epoch -> ZonedTime. The offset is looked up once a minute, so a DST change
 * shows within a minute and a frame costs no Intl call.
 */
export function zoneClock(zone) {
  let minute = NaN, offset = 0;
  return epoch => {
    const m = Math.floor(epoch / 60_000);
    if (m !== minute) { minute = m; offset = zoneOffset(zone, epoch); }
    return new ZonedTime(epoch, offset);
  };
}

/** How `there` relates to `here`: minutes ahead (negative behind) and calendar days apart (-1, 0, 1). */
export function relation(here, there) {
  return { minutes: Math.round((there.offset - here.offset) / 60_000), days: there.day() - here.day() };
}

/** "+8 h", "-3:30 h", "" for the same time. */
export function formatOffset(minutes) {
  if (minutes === 0) return "";
  const a = Math.abs(minutes), h = Math.floor(a / 60), m = a % 60;
  return `${minutes > 0 ? "+" : "−"}${h}${m ? `:${String(m).padStart(2, "0")}` : ""} h`;
}

/** Day or night at the zone's wall time (06:00 to 18:00 is day). */
export const isDaytime = t => t.getHours() >= 6 && t.getHours() < 18;

/** Catalog entries and other IANA zones matching a search, catalog first. */
export function searchCities(query, limit = 60) {
  const q = query.trim().toLowerCase();
  const hit = c => !q || c.id.includes(q.replace(/\s+/g, "")) || c.zone.toLowerCase().includes(q) ||
    c.name.en.toLowerCase().includes(q) || c.name.zh.includes(q);
  const out = CITIES.filter(hit);
  if (q && typeof Intl.supportedValuesOf === "function") {
    const known = new Set(CITIES.map(c => c.zone));
    for (const zone of Intl.supportedValuesOf("timeZone")) {
      if (out.length >= limit) break;
      if (!known.has(zone) && zone.toLowerCase().replace(/_/g, " ").includes(q)) out.push({ id: zone, zone, name: { en: zoneName(zone), zh: zoneName(zone) } });
    }
  }
  return out.slice(0, limit);
}
