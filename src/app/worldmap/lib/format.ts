import { format } from 'd3';

const si = format('.3~s');
// 1.23K / 4.56M / 7.89B / 1.2T (d3's SI "G" reads as giga, so swap it for B)
export function compact(n: number): string {
  if (Math.abs(n) < 1000) return format('.3~r')(n);
  return si(n).replace('G', 'B').replace('k', 'K');
}

// Formats a value by its indicator unit
export function formatValue(value: number, unit: string): string {
  if (unit.includes('US$') || unit.includes('international $')) return `$${compact(value)}`;
  if (unit.startsWith('%')) return `${format('.1f')(value)}%`;
  if (unit.startsWith('score')) return format('+.2f')(value);
  if (unit.startsWith('index')) return format('.3f')(value);
  if (unit === 'years' || unit.startsWith('births')) return format('.1f')(value);
  return compact(value);
}

// Short axis-tick form of the same
export function formatTick(value: number, unit: string): string {
  if (unit.includes('$')) return `$${compact(value)}`;
  if (unit.startsWith('%')) return `${format('~r')(value)}%`;
  return compact(value);
}
