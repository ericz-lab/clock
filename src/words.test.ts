import { describe, expect, test } from "bun:test";
// @ts-ignore plain JS module shared with the page
import { EN, EN_GRID, ZH_GRID, wordCells } from "../web/words.js";

describe("word clock", () => {
  test("grids are rectangular", () => {
    expect(new Set(EN_GRID.map((r: string) => r.length))).toEqual(new Set([12]));
    expect(new Set(ZH_GRID.map((r: string) => [...r].length))).toEqual(new Set([6]));
  });

  test("every English word sits where the grid spells it", () => {
    const names: Record<string, string> = { H1: "ONE", H2: "TWO", H3: "THREE", H4: "FOUR", H5: "FIVE", H6: "SIX", H7: "SEVEN", H8: "EIGHT", H9: "NINE", H10: "TEN", H11: "ELEVEN", H12: "TWELVE" };
    for (const [word, [r, c, n]] of Object.entries(EN as Record<string, number[]>)) {
      expect(EN_GRID[r].slice(c, c + n)).toBe(names[word] ?? word.replace(/^M_/, ""));
    }
  });

  test.each([
    [0, 0, "IT IS TWELVE O'CLOCK"],
    [9, 3, "IT IS NINE O'CLOCK"],
    [9, 5, "IT IS FIVE PAST NINE"],
    [13, 15, "IT IS QUARTER PAST ONE"],
    [14, 27, "IT IS TWENTY FIVE PAST TWO"],
    [7, 30, "IT IS HALF PAST SEVEN"],
    [7, 35, "IT IS TWENTY FIVE TO EIGHT"],
    [11, 50, "IT IS TEN TO TWELVE"],
    [23, 58, "IT IS FIVE TO TWELVE"],
  ])("en %i:%i", (h, m, text) => {
    const r = wordCells(h, m, "en");
    expect(r.text).toBe(text);
    expect(r.dots).toBe(m % 5);
  });

  test.each([
    [0, 0, "现在的时刻是十二点整"],
    [9, 5, "现在的时刻是九点零五分"],
    [10, 10, "现在的时刻是十点十分"],
    [11, 15, "现在的时刻是十一点十五分"],
    [14, 30, "现在的时刻是二点半"],
    [16, 45, "现在的时刻是四点四十五分"],
    [22, 58, "现在的时刻是十点五十五分"],
  ])("zh %i:%i", (h, m, text) => {
    expect(wordCells(h, m, "zh").text).toBe(text);
  });

  test("every minute of the day lights cells in both languages", () => {
    for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) {
      expect(wordCells(h, m, "en").cells.size).toBeGreaterThan(6);
      expect(wordCells(h, m, "zh").cells.size).toBeGreaterThan(7);
    }
  });
});
