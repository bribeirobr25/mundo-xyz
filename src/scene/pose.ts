import type { Motion } from "../domain/catalogModel.js";

export function partPose(
  motion: Motion,
  step: number,
  steps: number,
  phase: number,
  amplitude: number,
  reduced: boolean,
): { x: number; y: number; rotation: number } {
  const rest = { x: 0, y: 0, rotation: 0 };
  if (reduced || motion === "none" || steps < 2) return rest;
  const index = ((step + phase) % steps + steps) % steps;
  if (motion === "hop") {
    const lifted = index === 1 || index === 2;
    return { x: 0, y: lifted ? -amplitude : 0, rotation: 0 };
  }
  const direction = index % 2 === 0 ? -1 : 1;
  return { x: 0, y: 0, rotation: direction * amplitude * (Math.PI / 180) };
}
