import type {Coord} from "../types";

export function generateBezierArray(startLevel: number, endLevel: number, h1: Coord, h2: Coord, steps = 64): number[] {
    const curve = new Array(steps);

    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const y = Math.pow(1 - t, 3) * startLevel +
            3 * Math.pow(1 - t, 2) * t * (startLevel + (endLevel - startLevel) * h1.y) +
            3 * (1 - t) * Math.pow(t, 2) * (startLevel + (endLevel - startLevel) * h2.y) +
            Math.pow(t, 3) * endLevel;

        curve[i] = Math.max(0, Math.min(1, y));
    }

    curve[0] = startLevel;
    curve[steps - 1] = endLevel;

    return curve;
}