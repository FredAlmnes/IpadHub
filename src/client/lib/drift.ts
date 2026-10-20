// Burn-in protection offsets. Deterministic so they are testable.
export function nightDriftOffset(step: number): { x: number; y: number } {
  return {
    x: Math.round(96 * Math.sin(step * 0.37)),
    y: Math.round(64 * Math.sin(step * 0.23 + 1)),
  };
}

const DAY_X = [0, 4, 8, 4, 0, -4, -8, -4];
const DAY_Y = [0, -4, 0, 4, 8, 4, 0, -8];

export function dayDriftOffset(step: number): { x: number; y: number } {
  const i = ((step % DAY_X.length) + DAY_X.length) % DAY_X.length;
  const j = ((((step * 3 + 1) % DAY_Y.length) + DAY_Y.length) % DAY_Y.length);
  return { x: DAY_X[i]! + 0, y: DAY_Y[j]! + 0 };
}
