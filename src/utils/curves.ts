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

export function generateMSEGArray(points: Coord[], steps = 64): number[] {
    const curve = new Array(steps);

    for (let i = 0; i < steps; i++) {
        const x = i / (steps - 1);

        let leftPoint = points[0];
        let rightPoint = points[points.length - 1];

        for (let j = 0; j < points.length - 1; j++) {
            if (x >= points[j].x && x <= points[j + 1].x) {
                leftPoint = points[j];
                rightPoint = points[j + 1];
                break;
            }
        }

        if (leftPoint.x === rightPoint.x) {
            curve[i] = leftPoint.y;
        } else {
            const t = (x - leftPoint.x) / (rightPoint.x - leftPoint.x);
            curve[i] = leftPoint.y + t * (rightPoint.y - leftPoint.y);
        }
    }

    return curve;
}