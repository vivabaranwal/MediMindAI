const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD in the browser's local time. `toISOString()` gives the UTC date, which is the wrong day near midnight. */
export const toLocalIsoDate = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
