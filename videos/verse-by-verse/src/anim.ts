import { Easing, interpolate } from "remotion";

export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/** 0 → 1 between t0 and t1 (seconds), clamped, eased. */
export function prog(t: number, t0: number, t1: number, easing = easeInOut): number {
  return interpolate(t, [t0, t1], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** A point on a quadratic Bézier from a to b, bowed sideways by `bow` px. */
export function arc(
  a: { x: number; y: number },
  b: { x: number; y: number },
  p: number,
  bow: number,
): { x: number; y: number } {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / len) * bow;
  const cy = my + (dx / len) * bow;
  const q = 1 - p;
  return { x: q * q * a.x + 2 * q * p * cx + p * p * b.x, y: q * q * a.y + 2 * q * p * cy + p * p * b.y };
}
