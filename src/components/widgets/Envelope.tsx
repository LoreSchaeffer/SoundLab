import styles from './Envelope.module.css';
import {useCallback, useEffect, useRef} from 'react';
import type {Color, Coord} from "../../types";
import Card from "../elements/Card.tsx";

export type EnvelopeData = {
    handle1: Coord;
    handle2: Coord;
    time: number;
    color: Color;
}

export type EnvelopeVisualizerProps = {
    attack: EnvelopeData;
    decay: EnvelopeData;
    release: EnvelopeData;
    width?: number;
    height?: number;
}

const EnvelopeVisualizer = ({
                                attack,
                                decay,
                                release,
                                width = 800,
                                height = 200
                            }: EnvelopeVisualizerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    const getComputedColor = (colorName: Color) => {
        if (typeof window === 'undefined') return '#ffffff';
        return getComputedStyle(document.documentElement).getPropertyValue(`--${colorName}-500`).trim();
    };

    const drawSegment = useCallback((
        ctx: CanvasRenderingContext2D,
        startX: number,
        segmentWidth: number,
        startLevel: number,
        endLevel: number,
        h1: Coord,
        h2: Coord,
        colorStr: string
    ) => {
        if (segmentWidth <= 0) return;

        // Start/End point
        const p0x = startX;
        const p0y = height - (startLevel * height);
        const p3x = startX + segmentWidth;
        const p3y = height - (endLevel * height);

        // Dynamically mapped handles
        const c1x = startX + (h1.x * segmentWidth);
        const c1y = height - (h1.y * height);
        const c2x = startX + (h2.x * segmentWidth);
        const c2y = height - (h2.y * height);

        // Drawing curve
        ctx.strokeStyle = colorStr;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p3x, p3y);
        ctx.stroke();

        // Initial Node
        ctx.fillStyle = colorStr;
        ctx.beginPath();
        ctx.arc(p0x, p0y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Final Node
        ctx.fillStyle = colorStr;
        ctx.beginPath();
        ctx.arc(p3x, p3y, 2, 0, Math.PI * 2);
        ctx.fill();
    }, [height]);

    const draw = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        const colorA = getComputedColor(attack.color);
        const colorD = getComputedColor(decay.color);
        const colorR = getComputedColor(release.color);

        const totalTime = attack.time + decay.time + release.time;
        const safeTotal = totalTime > 0 ? totalTime : 1;

        const wA = (attack.time / safeTotal) * width;
        const wD = (decay.time / safeTotal) * width;
        const wR = (release.time / safeTotal) * width;

        // Attack
        drawSegment(ctx, 0, wA, 0.0, 1.0, attack.handle1, attack.handle2, colorA);

        // Decay
        drawSegment(ctx, wA, wD, 1.0, 0.0, decay.handle1, decay.handle2, colorD);

        // Separator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(wA + wD, 0);
        ctx.lineTo(wA + wD, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Release
        drawSegment(ctx, wA + wD, wR, 1.0, 0.0, release.handle1, release.handle2, colorR);
    }, [attack, decay, release, width, height, drawSegment]);

    useEffect(() => {
        if (canvasRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d');
            draw();
        }
    }, [draw]);

    return (
        <Card elevation={4} className={styles.container} style={{width: width + 26}}>
            <Card.Header className={styles.header}>
                <span className={styles.title}>Envelope</span>
            </Card.Header>
            <Card.Body>
                <div className={styles.canvasWrapper} style={{width, height}}>
                    <canvas
                        ref={canvasRef}
                        width={width}
                        height={height}
                        className={styles.canvas}
                    />
                </div>
            </Card.Body>
        </Card>
    );
};

export default EnvelopeVisualizer;