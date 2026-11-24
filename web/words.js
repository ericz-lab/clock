// Word clock grids and the rule that lights them. Pure functions, shared by the page and the tests.
// The time is read in five-minute steps; the minutes past the step (0-4) are shown as dots.

/** English grid, 12 columns; every word used below sits on one row. */
export const EN_GRID = [
  "ITLISTENHALF",
  "TWENTYQFIVEA",
  "QUARTERSPAST",
  "TOYTHREEONEX",
  "TWOFOURFIVES",
  "SIXZSEVENTEN",
  "EIGHTLNINEUM",
  "ELEVENTWELVE",
  "BOCLOCKSPACE",
];

// word -> [row, column, length]
export const EN = {
  IT: [0, 0, 2], IS: [0, 3, 2], M_TEN: [0, 5, 3], HALF: [0, 8, 4],
  TWENTY: [1, 0, 6], M_FIVE: [1, 7, 4], QUARTER: [2, 0, 7], PAST: [2, 8, 4], TO: [3, 0, 2],
  H3: [3, 3, 5], H1: [3, 8, 3], H2: [4, 0, 3], H4: [4, 3, 4], H5: [4, 7, 4],
  H6: [5, 0, 3], H7: [5, 4, 5], H10: [5, 9, 3], H8: [6, 0, 5], H9: [6, 6, 4],
  H11: [7, 0, 6], H12: [7, 6, 6], OCLOCK: [8, 1, 6],
};

const EN_MINUTES = [
  [], ["M_FIVE", "PAST"], ["M_TEN", "PAST"], ["QUARTER", "PAST"], ["TWENTY", "PAST"],
  ["TWENTY", "M_FIVE", "PAST"], ["HALF", "PAST"], ["TWENTY", "M_FIVE", "TO"], ["TWENTY", "TO"],
  ["QUARTER", "TO"], ["M_TEN", "TO"], ["M_FIVE", "TO"],
];

/** Chinese grid, 6 columns. 现在的时刻是 + hour + 点 + minutes (零五 … 五十五, 半) + 分, or 整 on the hour. */
export const ZH_GRID = [
  "现在的时刻是",
  "十一二三四五",
  "六七八九十点",
  "零二三四五十",
  "五半整分秒钟",
];

const ZH_HOUR = {
  1: [[1, 1]], 2: [[1, 2]], 3: [[1, 3]], 4: [[1, 4]], 5: [[1, 5]], 6: [[2, 0]], 7: [[2, 1]],
  8: [[2, 2]], 9: [[2, 3]], 10: [[2, 4]], 11: [[1, 0], [1, 1]], 12: [[1, 0], [1, 2]],
};
const ZH_TENS = { 2: [3, 1], 3: [3, 2], 4: [3, 3], 5: [3, 4] };
const ZH_SHI = [3, 5], ZH_WU = [4, 0], ZH_LING = [3, 0], ZH_BAN = [4, 1], ZH_ZHENG = [4, 2], ZH_FEN = [4, 3], ZH_DIAN = [2, 5];

const key = (r, c) => `${r}:${c}`;
const hour12 = h => (h % 12) || 12;

/**
 * Cells to light for a local time. Returns { cells: Set<"row:col">, dots: 0-4, text }.
 * @param {number} hours 0-23  @param {number} minutes 0-59  @param {"en"|"zh"} lang
 */
export function wordCells(hours, minutes, lang) {
  const step = Math.floor(minutes / 5);
  const dots = minutes % 5;
  const cells = new Set();
  if (lang === "zh") {
    for (let c = 0; c < 6; c++) cells.add(key(0, c));
    for (const [r, c] of ZH_HOUR[hour12(hours)]) cells.add(key(r, c));
    cells.add(key(...ZH_DIAN));
    const m = step * 5;
    const add = (/** @type {number[]} */ p) => cells.add(key(p[0], p[1]));
    if (m === 0) add(ZH_ZHENG);
    else if (m === 30) add(ZH_BAN);
    else {
      if (m === 5) { add(ZH_LING); add(ZH_WU); }
      else {
        const tens = Math.floor(m / 10), ones = m % 10;
        if (tens >= 2) add(ZH_TENS[tens]);
        add(ZH_SHI);
        if (ones === 5) add(ZH_WU);
      }
      add(ZH_FEN);
    }
    return { cells, dots, text: readCells(ZH_GRID, cells, "") };
  }
  const hour = `H${hour12(step >= 7 ? hours + 1 : hours)}`;
  const words = step === 0 ? ["IT", "IS", hour, "OCLOCK"] : ["IT", "IS", ...EN_MINUTES[step], hour];
  for (const w of words) {
    const [r, c, n] = EN[w];
    for (let i = 0; i < n; i++) cells.add(key(r, c + i));
  }
  const text = words.map(w => EN_GRID[EN[w][0]].slice(EN[w][1], EN[w][1] + EN[w][2])).join(" ").replace("OCLOCK", "O'CLOCK");
  return { cells, dots, text };
}

/** The lit cells read back in grid order, runs joined by `sep`. */
export function readCells(grid, cells, sep = " ") {
  const out = [];
  grid.forEach((row, r) => {
    let word = "";
    [...row].forEach((ch, c) => {
      if (cells.has(key(r, c))) word += ch;
      else if (word) { out.push(word); word = ""; }
    });
    if (word) out.push(word);
  });
  return out.join(sep);
}
