/** Small presentation helpers shared by overlay + side-panel grid. */

/** Compact count formatting: 1234 → "1,234" (locale), used for raw stats. */
export function formatCount(value: number | undefined | null): string {
  return value == null ? '' : value.toLocaleString();
}

/**
 * Abbreviated count: 12500 → "12.5k", 3_400_000 → "3.4M".
 * Used for the tight on-post overlay badges where space is scarce.
 */
export function formatCompact(value: number | undefined | null): string {
  if (value == null) return '';
  const abs = Math.abs(value);
  if (abs < 1000) return String(value);
  if (abs < 1_000_000) return `${trimZero(value / 1000)}k`;
  if (abs < 1_000_000_000) return `${trimZero(value / 1_000_000)}M`;
  return `${trimZero(value / 1_000_000_000)}B`;
}

function trimZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/** Unix seconds → "YYYY-MM-DD". Empty string when missing. */
export function formatDate(createdAt: number | undefined | null): string {
  if (createdAt == null) return '';
  const d = new Date(1000 * createdAt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Timestamp for export filenames: "YYYYMMDD-HHMMSS". */
export function fileTimestamp(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}
