import styles from './Envelope.module.css';
import {useCallback, useEffect, useRef} from 'react';
import {type Color, type Coord, getComputedColor} from "../../types";
import Card from "../elements/Card.tsx";

export type EnvelopeData = {
    time: number;
    color: Color;
    handle1?: Coord;
    handle2?: Coord;
    points?: Coord[];
};

export type TriggerEvent = {
    type: 'attack' | 'release';
    timestamp: number;
};

export type EnvelopeVisualizerProps = {
    attack: EnvelopeData;
    decay: EnvelopeData;
    release: EnvelopeData;
    triggerEvent?: TriggerEvent | null;
    width?: number;
    height?: number;
}

const EnvelopeVisualizer = ({
                                attack,
                                decay,
                                release,
                                triggerEvent,
                                width,
                                height = 200
                            }: EnvelopeVisualizerProps) => {
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    const canvasDims = useRef({w: 0, h: 0});

    const getBezierPoint = (t: number, p0: number, p1: number, p2: number, p3: number) => {
        const u = 1 - t;
        return (u * u * u * p0) + (3 * u * u * t * p1) + (3 * u * t * t * p2) + (t * t * t * p3);
    };

    const getMSEGPoint = (t: number, points: Coord[]): Coord => {
        if (points.length === 0) return {x: 0, y: 0};
        if (t <= 0) return points[0];
        if (t >= 1) return points[points.length - 1];

        let p1 = points[0];
        let p2 = points[points.length - 1];

        for (let i = 0; i < points.length - 1; i++) {
            if (t >= points[i].x && t <= points[i + 1].x) {
                p1 = points[i];
                p2 = points[i + 1];
                break;
            }
        }

        if (p1.x === p2.x) return p1;

        const ratio = (t - p1.x) / (p2.x - p1.x);
        return {
            x: p1.x + ratio * (p2.x - p1.x),
            y: p1.y + ratio * (p2.y - p1.y)
        };
    };

    const drawSegment = useCallback((ctx: CanvasRenderingContext2D, startX: number, segmentWidth: number, startLevel: number, endLevel: number, data: EnvelopeData, colorStr: string, h: number) => {
        if (segmentWidth <= 0) return;

        ctx.strokeStyle = colorStr;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();

        if (data.points && data.points.length > 0) {
            // Draw MSEG
            data.points.forEach((p, i) => {
                const cx = startX + (p.x * segmentWidth);
                const cy = h - (p.y * h);
                if (i === 0) ctx.moveTo(cx, cy);
                else ctx.lineTo(cx, cy);
            });
            ctx.stroke();

            // Draw MSEG nodes
            ctx.fillStyle = colorStr;
            data.points.forEach((p) => {
                const cx = startX + (p.x * segmentWidth);
                const cy = h - (p.y * h);
                ctx.beginPath();
                ctx.arc(cx, cy, 2, 0, Math.PI * 2);
                ctx.fill();
            });

        } else if (data.handle1 && data.handle2) {
            // Draw Bezier
            const p0x = startX;
            const p0y = h - (startLevel * h);
            const p3x = startX + segmentWidth;
            const p3y = h - (endLevel * h);

            const c1x = startX + (data.handle1.x * segmentWidth);
            const c1y = h - (data.handle1.y * h);
            const c2x = startX + (data.handle2.x * segmentWidth);
            const c2y = h - (data.handle2.y * h);

            ctx.moveTo(p0x, p0y);
            ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p3x, p3y);
            ctx.stroke();

            // Draw Bezier endpoints
            ctx.fillStyle = colorStr;
            ctx.beginPath();
            ctx.arc(p0x, p0y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p3x, p3y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }, []);

    const getMappedDot = useCallback((t: number, data: EnvelopeData, startX: number, w: number, startLevel: number, endLevel: number, h: number) => {
        if (data.points && data.points.length > 0) {
            const pt = getMSEGPoint(t, data.points);
            return {
                dotX: startX + pt.x * w,
                dotY: h - pt.y * h
            };
        } else if (data.handle1 && data.handle2) {
            return {
                dotX: getBezierPoint(t, startX, startX + data.handle1.x * w, startX + data.handle2.x * w, startX + w),
                dotY: getBezierPoint(t, h - startLevel * h, h - data.handle1.y * h, h - data.handle2.y * h, h - endLevel * h)
            };
        }
        return {dotX: startX, dotY: h};
    }, []);

    useEffect(() => {
        const container = canvasContainerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const observer = new ResizeObserver((entries) => {
            const {width, height} = entries[0].contentRect;

            canvasDims.current = {w: width, h: height};

            const dpr = window.devicePixelRatio || 1;

            canvas.width = width * dpr;
            canvas.height = height * dpr;

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const renderFrame = useCallback((currentTime: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const {w, h} = canvasDims.current;
        if (w === 0 || h === 0) return;

        const dpr = window.devicePixelRatio || 1;

        ctx.save();
        // Scale dynamically on each frame to match current device pixel ratio
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const colorA = getComputedColor(attack.color);
        const colorD = getComputedColor(decay.color);
        const colorR = getComputedColor(release.color);

        const totalTime = attack.time + decay.time + release.time;
        const safeTotal = totalTime > 0 ? totalTime : 1;

        const MIN_PCT = 0.05;
        const minPixels = w * MIN_PCT;
        const availablePixels = w - (minPixels * 3);

        const wA = minPixels + ((attack.time / safeTotal) * availablePixels);
        const wD = minPixels + ((decay.time / safeTotal) * availablePixels);
        const wR = minPixels + ((release.time / safeTotal) * availablePixels);

        drawSegment(ctx, 0, wA, 0.0, 1.0, attack, colorA, h);
        drawSegment(ctx, wA, wD, 1.0, 0.0, decay, colorD, h);

        // Draw separation line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(wA + wD, 0);
        ctx.lineTo(wA + wD, h);
        ctx.stroke();
        ctx.setLineDash([]);

        drawSegment(ctx, wA + wD, wR, 1.0, 0.0, release, colorR, h);

        // Draw trigger animation
        if (triggerEvent) {
            const elapsed = currentTime - triggerEvent.timestamp;
            let dotX: number | null = null;
            let dotY: number | null = null;

            if (triggerEvent.type === 'attack') {
                if (elapsed <= attack.time) {
                    const t = attack.time > 0 ? Math.max(0, Math.min(1, elapsed / attack.time)) : 1;
                    const res = getMappedDot(t, attack, 0, wA, 0.0, 1.0, h);
                    dotX = res.dotX;
                    dotY = res.dotY;
                } else if (elapsed <= attack.time + decay.time) {
                    const t = decay.time > 0 ? Math.max(0, Math.min(1, (elapsed - attack.time) / decay.time)) : 1;
                    const res = getMappedDot(t, decay, wA, wD, 1.0, 0.0, h);
                    dotX = res.dotX;
                    dotY = res.dotY;
                } else {
                    dotX = wA + wD;
                    dotY = h;
                }
            } else if (triggerEvent.type === 'release') {
                if (elapsed <= release.time) {
                    const t = release.time > 0 ? Math.max(0, Math.min(1, elapsed / release.time)) : 1;
                    const res = getMappedDot(t, release, wA + wD, wR, 1.0, 0.0, h);
                    dotX = res.dotX;
                    dotY = res.dotY;
                }
            }

            if (dotX !== null && dotY !== null) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }, [attack, decay, release, triggerEvent, drawSegment, getMappedDot]);

    useEffect(() => {
        const loop = (time: number) => {
            renderFrame(time);
            animationRef.current = requestAnimationFrame(loop);
        };

        animationRef.current = requestAnimationFrame(loop);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [renderFrame]);

    return (
        <Card
            elevation={4}
            className={styles.container}
            style={{flex: '1 0 auto', minWidth: '300px', width: width ? `${width}px` : '100%'}}
        >
            <Card.Header className={styles.header}>
                <span className={styles.title}>Envelope</span>
            </Card.Header>
            <Card.Body>
                <div
                    ref={canvasContainerRef}
                    className={styles.canvasWrapper}
                    style={{width: '100%', height}}
                >
                    <canvas
                        ref={canvasRef}
                        className={styles.canvas}
                    />
                </div>
            </Card.Body>
        </Card>
    );
};

export default EnvelopeVisualizer;