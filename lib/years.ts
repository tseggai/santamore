/** `?godina=2025` → 2025; anything else → null (all years). Plain module: pages read it on the server. */
export function parseYear(value: string | undefined): number | null {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}
