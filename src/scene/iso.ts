export function cellToScreen(x: number, y: number, zoom: number): { sx: number; sy: number } {
  const sx = (x - y) * 48 * zoom;
  const sy = (x + y) * 24 * zoom;
  return { sx, sy };
}
