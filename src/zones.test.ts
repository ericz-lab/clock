import { describe, expect, test } from "bun:test";
// @ts-ignore plain JS module shared with the page
import { CITIES, ZonedTime, formatOffset, isZone, relation, resolveCity, searchCities, zoneClock, zoneOffset } from "../web/zones.js";

const H = 3_600_000;

describe("zones", () => {
  test("every catalog zone is a real zone and ids are unique", () => {
    for (const c of CITIES) expect(isZone(c.zone)).toBe(true);
    expect(new Set(CITIES.map((c: { id: string }) => c.id)).size).toBe(CITIES.length);
  });

  test("offsets, including half hours and daylight saving", () => {
    const jan = Date.UTC(2026, 0, 15, 12), jul = Date.UTC(2026, 6, 15, 12);
    expect(zoneOffset("Asia/Shanghai", jan)).toBe(8 * H);
    expect(zoneOffset("Asia/Kolkata", jan)).toBe(5.5 * H);
    expect(zoneOffset("Asia/Kathmandu", jan)).toBe(5.75 * H);
    expect(zoneOffset("America/New_York", jan)).toBe(-5 * H);
    expect(zoneOffset("America/New_York", jul)).toBe(-4 * H);
    expect(zoneOffset("UTC", jul)).toBe(0);
  });

  test("zoned wall time and its relation to another zone", () => {
    const epoch = Date.UTC(2026, 10, 23, 16, 5, 7, 250); // 00:05:07 next day in Shanghai, 11:05 in New York
    const sh = zoneClock("Asia/Shanghai")(epoch), ny = zoneClock("America/New_York")(epoch);
    expect([sh.getHours(), sh.getMinutes(), sh.getSeconds(), sh.getMilliseconds()]).toEqual([0, 5, 7, 250]);
    expect(ny.getHours()).toBe(11);
    expect(relation(sh, ny)).toEqual({ minutes: -13 * 60, days: -1 });
    expect(relation(ny, sh)).toEqual({ minutes: 13 * 60, days: 1 });
    expect(relation(sh, new ZonedTime(epoch, 8 * H))).toEqual({ minutes: 0, days: 0 });
  });

  test("offset labels", () => {
    expect(formatOffset(0)).toBe("");
    expect(formatOffset(480)).toBe("+8 h");
    expect(formatOffset(-210)).toBe("−3:30 h");
  });

  test("city ids resolve; junk does not", () => {
    expect(resolveCity("tokyo")?.zone).toBe("Asia/Tokyo");
    expect(resolveCity("Europe/Oslo")).toEqual({ id: "Europe/Oslo", zone: "Europe/Oslo", name: { en: "Oslo", zh: "Oslo" } });
    expect(resolveCity("local", "Asia/Shanghai")?.name.zh).toBe("本地 · 北京");
    expect(resolveCity("Mars/Olympus")).toBeNull();
    expect(resolveCity("nowhere")).toBeNull();
  });

  test("search by English, Chinese and zone id", () => {
    expect(searchCities("tok").map((c: { id: string }) => c.id)).toContain("tokyo");
    expect(searchCities("东京").map((c: { id: string }) => c.id)).toEqual(["tokyo"]);
    expect(searchCities("oslo").map((c: { id: string }) => c.id)).toContain("Europe/Oslo");
    expect(searchCities("").length).toBe(Math.min(60, CITIES.length));
  });
});
