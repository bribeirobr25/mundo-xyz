import type { Motion } from "../domain/catalogModel.js";

/**
 * Client-side pose. `motionStepMs` × `steps` is one cycle.
 * A hop rises and lands through the points in between. A sway swings through
 * rest. Reduced motion and a stopped ticker use the rest pose.
 */
export function partPose(
  motion: Motion,
  elapsedMs: number,
  motionStepMs: number,
  steps: number,
  phase: number,
  amplitude: number,
  reduced: boolean,
): { x: number; y: number; rotation: number } {
  const rest = { x: 0, y: 0, rotation: 0 };
  if (reduced || motion === "none" || steps < 2 || motionStepMs <= 0) return rest;
  const cycle = motionStepMs * steps;
  const shift = ((phase % steps) + steps) % steps / steps;
  const u = (((elapsedMs / cycle) + shift) % 1 + 1) % 1;
  if (motion === "hop") {
    const y = -amplitude * Math.sin(Math.PI * u);
    return { x: 0, y: y === 0 ? 0 : y, rotation: 0 };
  }
  if (motion === "glance") {
    if (u > 0.08) return rest;
    const y = -amplitude * Math.sin(Math.PI * (u / 0.08));
    return { x: 0, y: y === 0 ? 0 : y, rotation: 0 };
  }
  if (motion === "drift") {
    const x = amplitude * Math.sin(u * Math.PI * 2);
    return { x: x === 0 ? 0 : x, y: 0, rotation: 0 };
  }
  const rotation = Math.sin(u * Math.PI * 2) * amplitude * (Math.PI / 180);
  return { x: 0, y: 0, rotation: rotation === 0 ? 0 : rotation };
}
