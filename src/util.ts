export function roundToNearest(n: number, interval: number): number {
  return Math.round(n / interval) * interval;
}
