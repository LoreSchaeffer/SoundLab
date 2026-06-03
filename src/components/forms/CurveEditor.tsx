import styles from "./CurveEditor.module.css";
import type {Color, Coord} from "../../types";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Card from "../elements/Card.tsx";
import clsx from "clsx";

export type CurveEditorProps = {
    width?: number;
    height?: number;
    title: string;
    color: Color;
    coloredBackground?: boolean;
    allowAdvanced?: boolean

    time: number;
    onTimeChange?: (time: number) => void;

    // Bezier Mode
    startY: number;
    endY: number;
    handle1?: Coord;
    handle2?: Coord;
    onCurveChange?: (handle1: Coord, handle2: Coord) => void;

    // MSEG Mode
    isAdvanced?: boolean;
    onModeChange?: (isAdvanced: boolean) => void;
    points?: Coord[];
    onPointsChange?: (points: Coord[]) => void;
}

const CurveEditor = ({
                         width = 200,
                         height = 200,
                         title,
                         color,
                         coloredBackground = true,
                         allowAdvanced = false,

                         time,
                         onTimeChange,

                         // Bezier Mode
                         startY,
                         endY,
                         handle1 = {x: 0, y: startY},
                         handle2 = {x: 1, y: endY},
                         onCurveChange,

                         // MSEG Mode
                         isAdvanced = false,
                         onModeChange,
                         points,
                         onPointsChange
                     }: CurveEditorProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    const [advanced, setAdvanced] = useState<boolean>(false);
    const advancedMode = isAdvanced !== undefined ? isAdvanced : advanced;

    const dragTargetBezier = useRef<'none' | 'handle1' | 'handle2'>('none');
    const dragTargetMSEG = useRef<number>(-1);

    const isDraggingTime = useRef<boolean>(false);
    const startDragX = useRef<number>(0);
    const startTimeVal = useRef<number>(0);
    const hasDragged = useRef<boolean>(false);

    const [isEditingTime, setIsEditingTime] = useState<boolean>(false);
    const [tempTime, setTempTime] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);

    const getComputedColor = useCallback((colorName: Color) => {
        if (typeof window === 'undefined') return '#ffffff';
        return getComputedStyle(document.documentElement).getPropertyValue(`--${colorName}-500`).trim();
    }, []);

    const computedBackgroundColor = useMemo(() => {
        const mainColor = getComputedColor(color);
        return `color-mix(in srgb, ${mainColor} 8%, #000000)`;
    }, [color, getComputedColor]);

    const toCanvas = useCallback((p: Coord) => ({
        x: p.x * width,
        y: height - (p.y * height)
    }), [width, height]);

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

    const draw = useCallback(() => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        const mainColor = getComputedColor(color);
        ctx.clearRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = coloredBackground ? `color-mix(in srgb, ${mainColor} 20%, transparent)` : 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (advancedMode) {
            for (let i = 1; i < 4; i++) {
                ctx.moveTo((width / 4) * i, 0);
                ctx.lineTo((width / 4) * i, height);
                ctx.moveTo(0, (height / 4) * i);
                ctx.lineTo(width, (height / 4) * i);
            }
        } else {
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(width / 2, height);
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
        }
        ctx.stroke();

        if (advancedMode && points) {
            // Draw MSEG
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            points.forEach((p, i) => {
                const canvasP = toCanvas(p);
                if (i === 0) ctx.moveTo(canvasP.x, canvasP.y);
                else ctx.lineTo(canvasP.x, canvasP.y);
            });
            ctx.stroke();

            points.forEach((p) => {
                const canvasP = toCanvas(p);
                ctx.fillStyle = computedBackgroundColor;
                ctx.strokeStyle = mainColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(canvasP.x, canvasP.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

        } else {
            // Draw BEZIER
            const p0 = toCanvas({x: 0, y: startY});
            const p3 = toCanvas({x: 1, y: endY});
            const c1 = toCanvas(handle1);
            const c2 = toCanvas(handle2);

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

            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
            ctx.stroke();

            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.arc(p0.x, p0.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p3.x, p3.y, 3, 0, Math.PI * 2);
            ctx.fill();

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
        }
    }, [advancedMode, points, color, width, height, coloredBackground, toCanvas, startY, endY, handle1, handle2, computedBackgroundColor, getComputedColor]);

    useEffect(() => {
        if (canvasRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d');
            draw();
        }
    }, [draw]);

    const handleCanvasMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e && e.cancelable) e.preventDefault();

        const pos = getMathPos(e);
        const HIT_RADIUS = 0.08;

        if (advancedMode) {
            if (!points) return;
            const hitIndex = points.findIndex(p => Math.hypot(p.x - pos.x, p.y - pos.y) < HIT_RADIUS);
            if (hitIndex !== -1) dragTargetMSEG.current = hitIndex;
        } else {
            const dist1 = Math.hypot(pos.x - handle1.x, pos.y - handle1.y);
            const dist2 = Math.hypot(pos.x - handle2.x, pos.y - handle2.y);
            if (dist1 < HIT_RADIUS && dist1 <= dist2) dragTargetBezier.current = 'handle1';
            else if (dist2 < HIT_RADIUS) dragTargetBezier.current = 'handle2';
        }
    };

    const handleCanvasDoubleClick = (e: React.MouseEvent) => {
        if (!advancedMode || !points) return;

        const pos = getMathPos(e);
        const HIT_RADIUS = 0.08;
        const hitIndex = points.findIndex(p => Math.hypot(p.x - pos.x, p.y - pos.y) < HIT_RADIUS);

        if (hitIndex !== -1) {
            if (hitIndex !== 0 && hitIndex !== points.length - 1) {
                const newPoints = points.filter((_, i) => i !== hitIndex);
                onPointsChange?.(newPoints);
            }
        } else {
            const newPoints = [...points, pos].sort((a, b) => a.x - b.x);
            onPointsChange?.(newPoints);
        }
    };

    const handleGlobalMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        // Drag MSEG
        if (advancedMode && dragTargetMSEG.current !== -1 && points) {
            if ('touches' in e && e.cancelable) e.preventDefault();
            const pos = getMathPos(e);
            let newX = pos.x;
            const idx = dragTargetMSEG.current;

            if (idx === 0) newX = 0;
            else if (idx === points.length - 1) newX = 1;
            else {
                newX = Math.max(points[idx - 1].x + 0.01, Math.min(points[idx + 1].x - 0.01, newX));
            }
            const newPoints = [...points];
            newPoints[idx] = {x: newX, y: pos.y};
            onPointsChange?.(newPoints);
            return;
        }

        // Drag Bezier
        if (!advancedMode && dragTargetBezier.current !== 'none') {
            if ('touches' in e && e.cancelable) e.preventDefault();
            const pos = getMathPos(e);
            if (dragTargetBezier.current === 'handle1') onCurveChange?.(pos, handle2);
            else if (dragTargetBezier.current === 'handle2') onCurveChange?.(handle1, pos);
            return;
        }

        // Drag Tempo
        if (isDraggingTime.current) {
            if ('touches' in e && e.cancelable) e.preventDefault();
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const deltaX = clientX - startDragX.current;

            if (Math.abs(deltaX) > 2) {
                hasDragged.current = true;
                const baseTime = startTimeVal.current > 9999 ? 9999 : startTimeVal.current;
                let newVal = baseTime + deltaX;
                if (newVal >= 10000) newVal = Number.MAX_SAFE_INTEGER;
                else newVal = Math.max(0, Math.round(newVal));
                onTimeChange?.(newVal);
            }
        }
    }, [advancedMode, points, handle1, handle2, onCurveChange, onPointsChange, onTimeChange, getMathPos]);

    useEffect(() => {
        const handleGlobalEnd = () => {
            dragTargetBezier.current = 'none';
            dragTargetMSEG.current = -1;
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

    useEffect(() => {
        if (isEditingTime && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditingTime]);

    const handleTimeMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (isEditingTime) return;
        if ('touches' in e && e.cancelable) e.preventDefault();

        isDraggingTime.current = true;
        hasDragged.current = false;
        startDragX.current = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        startTimeVal.current = time;
        document.body.style.cursor = 'ew-resize';
    };

    const handleTimeMouseUp = () => {
        if (!hasDragged.current && !isEditingTime) {
            setTempTime(time > 9999 ? "9999" : Math.round(time).toString());
            setIsEditingTime(true);
        }

        isDraggingTime.current = false;
        document.body.style.cursor = 'default';
    };

    const handleTimeWheel = (e: React.WheelEvent) => {
        if (isEditingTime) return;
        e.preventDefault();

        const step = e.shiftKey ? 10 : 1;
        const direction = e.deltaY < 0 ? 1 : -1;
        const baseTime = time > 9999 ? 9999 : time;

        let newVal = baseTime + (direction * step);
        if (newVal >= 10000) newVal = Number.MAX_SAFE_INTEGER;
        else newVal = Math.max(0, Math.round(newVal));

        onTimeChange?.(newVal);
    };

    const commitTimeEdit = () => {
        setIsEditingTime(false);
        const parsed = parseFloat(tempTime);

        if (!isNaN(parsed) && parsed >= 0) {
            if (parsed >= 10000) onTimeChange?.(Number.MAX_SAFE_INTEGER);
            else onTimeChange?.(parsed);
        }
    };

    const handleToggleAdvanced = () => {
        const nextMode = !advancedMode;
        setAdvanced(nextMode);
        onModeChange?.(nextMode);
    };

    return (
        <Card elevation={4} className={styles.container} style={{width: width + 26}}>
            <Card.Header className={styles.header}>
                <span className={styles.title} style={{color: `var(--${color}-500)`}}>
                    {title}
                </span>

                <div className={styles.headerControls}>
                    {allowAdvanced && (
                        <button
                            className={styles.modeToggle}
                            onClick={handleToggleAdvanced}
                            style={advancedMode ? {
                                borderColor: `var(--${color}-500)`,
                                color: `var(--${color}-500)`,
                                backgroundColor: `color-mix(in srgb, var(--${color}-500) 10%, transparent)`
                            } : {}}
                            title={advancedMode ? "Torna alla Modalità Base" : "Attiva la Modalità Avanzata"}
                        >
                            {advancedMode ? 'ADV' : 'BAS'}
                        </button>
                    )}

                    <div className={styles.info}>
                        <span className={styles.infoLabel} style={{color: `var(--${color}-500)`}}>
                            Time
                        </span>
                        {isEditingTime ? (
                            <div style={{display: 'flex', alignItems: 'center'}}>
                                <input
                                    ref={inputRef}
                                    type="number"
                                    value={tempTime}
                                    onChange={(e) => setTempTime(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitTimeEdit();
                                        else if (e.key === 'Escape') setIsEditingTime(false);
                                    }}
                                    onBlur={commitTimeEdit}
                                    className={clsx(styles.infoVal, styles.input)}
                                />
                                <span className={styles.infoVal}>ms</span>
                            </div>
                        ) : (
                            <span
                                className={styles.infoVal}
                                onMouseDown={handleTimeMouseDown}
                                onMouseUp={handleTimeMouseUp}
                                onTouchStart={handleTimeMouseDown}
                                onTouchEnd={handleTimeMouseUp}
                                onWheel={handleTimeWheel}
                                title="Drag to change, click to type"
                            >
                                {time > 9999 ? '∞ ms' : `${Math.round(time)} ms`}
                            </span>
                        )}
                    </div>
                </div>
            </Card.Header>
            <Card.Body>
                <div
                    className={styles.canvasWrapper}
                    style={{
                        width: width,
                        height: height,
                        backgroundColor: coloredBackground ? computedBackgroundColor : '#000000'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={width}
                        height={height}
                        className={styles.canvas}
                        onMouseDown={handleCanvasMouseDown}
                        onTouchStart={handleCanvasMouseDown}
                        onDoubleClick={handleCanvasDoubleClick}
                        style={{cursor: 'crosshair'}}
                    />
                </div>
            </Card.Body>
        </Card>
    );
}

export default CurveEditor;