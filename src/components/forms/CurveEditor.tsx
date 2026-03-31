import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import styles from './CurveEditor.module.css';
import type {Color, Coord} from "../../types";
import Card from "../elements/Card.tsx";

export type CurveEditorProps = {
    width?: number;
    height?: number;
    title: string;
    color: Color;
    colored?: boolean;
    time: number;
    startY: number;
    endY: number;
    handle1?: Coord;
    handle2?: Coord;
    onCurveChange?: (handle1: Coord, handle2: Coord) => void;
    onTimeChange?: (time: number) => void;
}

const CurveEditor = ({
                         width = 200,
                         height = 200,
                         title,
                         color,
                         colored = true,
                         time,
                         startY,
                         endY,
                         handle1 = {x: 0, y: startY},
                         handle2 = {x: 1, y: endY},
                         onCurveChange,
                         onTimeChange
                     }: CurveEditorProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const dragTarget = useRef<'none' | 'handle1' | 'handle2'>('none');
    const isDraggingTime = useRef(false);
    const startDragX = useRef(0);
    const startTimeVal = useRef(0);

    const getComputedColor = (colorName: Color) => {
        if (typeof window === 'undefined') return '#ffffff';
        return getComputedStyle(document.documentElement).getPropertyValue(`--${colorName}-500`).trim();
    };

    const computedBackgroundColor = useMemo(() => {
        const mainColor = getComputedColor(color);
        return `color-mix(in srgb, ${mainColor} 8%, #000000)`;
    }, [color]);

    const toCanvas = useCallback((p: Coord) => ({
        x: p.x * width,
        y: height - (p.y * height)
    }), [width, height]);

    const draw = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        const mainColor = getComputedColor(color);

        ctx.clearRect(0, 0, width, height);

        // 1. Background Grid
        ctx.strokeStyle = colored ? `color-mix(in srgb, ${mainColor} 20%, transparent)` : 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // 2. Physical points mapped to Canvas
        const p0 = toCanvas({x: 0, y: startY});
        const p3 = toCanvas({x: 1, y: endY});
        const c1 = toCanvas(handle1);
        const c2 = toCanvas(handle2);

        // 3. Guide lines for handles
        ctx.strokeStyle = mainColor;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(c1.x, c1.y);
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // 4. Main Bezier Curve
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
        ctx.stroke();

        // 5. Start and End anchor points
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(p0.x, p0.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p3.x, p3.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // 6. Interactive Bezier Handles
        ctx.fillStyle = computedBackgroundColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(c1.x, c1.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(c2.x, c2.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

    }, [color, width, height, colored, toCanvas, startY, endY, handle1, handle2, computedBackgroundColor]);

    useEffect(() => {
        if (canvasRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d');
            draw();
        }
    }, [draw]);

    const getMathPos = useCallback((e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent): Coord => {
        const canvas = canvasRef.current;
        if (!canvas) return {x: 0, y: 0};
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const x = Math.max(0, Math.min(1, (clientX - rect.left) / width));
        const y = Math.max(0, Math.min(1, 1 - ((clientY - rect.top) / height)));

        return {x, y};
    }, [width, height]);

    const handleCanvasMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.cancelable) e.preventDefault();

        const pos = getMathPos(e);
        const HIT_RADIUS = 0.1;

        const dist1 = Math.hypot(pos.x - handle1.x, pos.y - handle1.y);
        const dist2 = Math.hypot(pos.x - handle2.x, pos.y - handle2.y);

        if (dist1 < HIT_RADIUS && dist1 <= dist2) {
            dragTarget.current = 'handle1';
        } else if (dist2 < HIT_RADIUS) {
            dragTarget.current = 'handle2';
        }
    };

    const handleGlobalMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (dragTarget.current !== 'none') {
            if ('touches' in e && e.cancelable) e.preventDefault();
            const pos = getMathPos(e);

            if (dragTarget.current === 'handle1') {
                onCurveChange?.(pos, handle2);
            } else if (dragTarget.current === 'handle2') {
                onCurveChange?.(handle1, pos);
            }
            return;
        }

        if (isDraggingTime.current) {
            if ('touches' in e && e.cancelable) e.preventDefault();
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;

            const deltaX = clientX - startDragX.current;
            const sensitivity = 1;

            onTimeChange?.(Math.max(0, startTimeVal.current + (deltaX * sensitivity)));
        }
    }, [handle1, handle2, onCurveChange, onTimeChange, getMathPos]);

    useEffect(() => {
        const handleGlobalEnd = () => {
            dragTarget.current = 'none';
            isDraggingTime.current = false;
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mouseup', handleGlobalEnd);
        window.addEventListener('touchend', handleGlobalEnd);
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('touchmove', handleGlobalMouseMove, {passive: false});

        return () => {
            window.removeEventListener('mouseup', handleGlobalEnd);
            window.removeEventListener('touchend', handleGlobalEnd);
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('touchmove', handleGlobalMouseMove);
        };
    }, [handleGlobalMouseMove]);

    const handleTimeMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.cancelable) e.preventDefault();

        isDraggingTime.current = true;
        startDragX.current = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        startTimeVal.current = time;

        document.body.style.cursor = 'ew-resize';
    };

    const handleTimeWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const step = 1;
        const direction = e.deltaY < 0 ? 1 : -1;

        onTimeChange?.(Math.max(0, time + (direction * step)));
    };

    return (
        <Card
            elevation={4}
            className={styles.container}
            style={{width: width + 26}}
        >
            <Card.Header className={styles.header}>
                <span
                    className={styles.title}
                    style={{color: `var(--${color}-500)`}}
                >
                    {title}
                </span>

                <div className={styles.info}>
                    <span
                        className={styles.infoLabel}
                        style={{color: `var(--${color}-500)`}}
                    >
                        Time
                    </span>
                    <span
                        className={styles.infoVal}
                        onMouseDown={handleTimeMouseDown}
                        onTouchStart={handleTimeMouseDown}
                        onWheel={handleTimeWheel}
                    >
                        {time} ms
                    </span>
                </div>
            </Card.Header>
            <Card.Body>
                <div
                    className={styles.canvasWrapper}
                    style={{
                        width: width,
                        height: height,
                        backgroundColor: colored ? computedBackgroundColor : '#000000'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={width}
                        height={height}
                        className={styles.canvas}
                        onMouseDown={handleCanvasMouseDown}
                        onTouchStart={handleCanvasMouseDown}
                        style={{cursor: 'crosshair'}}
                    />
                </div>
            </Card.Body>
        </Card>
    );
};

export default CurveEditor;