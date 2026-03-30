import React, {useCallback, useEffect, useRef} from 'react';
import styles from './CurveEditor.module.css';
import type {Color} from "../../types/colors.ts";
import type {Coord} from "../../types/common.ts";
import clsx from "clsx";

export type CurveEditorProps = {
    width?: number;
    height?: number;
    title: string;
    color: Color;
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(c1.x, c1.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(c2.x, c2.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

    }, [color, startY, endY, handle1, handle2, width, height, toCanvas]);

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
            const sensitivity = 0.005;

            let newTime = startTimeVal.current + (deltaX * sensitivity);
            newTime = Math.max(0.01, Math.min(10.0, newTime));

            onTimeChange?.(newTime);
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
        const step = 0.01;
        const direction = e.deltaY < 0 ? 1 : -1;

        let newTime = time + (direction * step);
        newTime = Math.max(0.01, Math.min(10.0, newTime));

        onTimeChange?.(newTime);
    };

    return (
        <div
            className={clsx(styles.container, styles[color])}
            style={{width: width + 26}}
        >
            <div className={styles.header}>
                <span className={styles.title} style={{color: `var(--${color}-500)`}}>
                    {title}
                </span>
            </div>

            <div className={styles.canvasWrapper} style={{width, height}}>
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

            <div className={styles.info}>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Time</span>
                    {/* Scrubbable value */}
                    <span
                        className={styles.infoVal}
                        style={{cursor: 'ew-resize', userSelect: 'none'}}
                        onMouseDown={handleTimeMouseDown}
                        onTouchStart={handleTimeMouseDown}
                        onWheel={handleTimeWheel}
                    >
                        {Math.round(time * 1000)} ms
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CurveEditor;