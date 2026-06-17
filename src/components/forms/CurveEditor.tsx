import styles from "./CurveEditor.module.css";
import {type Color, type Coord, getComputedColor} from "../../types";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Card from "../elements/Card.tsx";
import clsx from "clsx";

export type CurveEditorProps = {
    width?: number;
    height?: number;
    title: string;
    color: Color;
    coloredBackground?: boolean;
    allowAdvanced?: boolean;

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
                         width,
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
    const wrapperRef = useRef<HTMLDivElement>(null);
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

    const computedBackgroundColor = useMemo(() => {
        const mainColor = getComputedColor(color);
        return `color-mix(in srgb, ${mainColor} 8%, #000000)`;
    }, [color, getComputedColor]);

    const getMathPos = useCallback((e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent): Coord => {
        const canvas = canvasRef.current;
        if (!canvas) return {x: 0, y: 0};

        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, 1 - ((clientY - rect.top) / rect.height)));

        return {x, y};
    }, []);

    const draw = useCallback((w: number, h: number) => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx || w === 0 || h === 0) return;

        const dpr = window.devicePixelRatio || 1;

        canvas.width = w * dpr;
        canvas.height = h * dpr;

        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        ctx.scale(dpr, dpr);

        const toCanvas = (p: Coord) => ({
            x: p.x * w,
            y: h - (p.y * h)
        });

        const mainColor = getComputedColor(color);
        ctx.clearRect(0, 0, w, h);

        // Draw Grid
        ctx.strokeStyle = coloredBackground ? `color-mix(in srgb, ${mainColor} 20%, transparent)` : 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (advancedMode) {
            for (let i = 1; i < 4; i++) {
                ctx.moveTo((w / 4) * i, 0);
                ctx.lineTo((w / 4) * i, h);
                ctx.moveTo(0, (h / 4) * i);
                ctx.lineTo(w, (h / 4) * i);
            }
        } else {
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w / 2, h);
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
        }
        ctx.stroke();

        if (advancedMode && points) {
            // Draw MSEG Curves
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

            // Draw MSEG Points
            points.forEach((p) => {
                const canvasP = toCanvas(p);
                ctx.fillStyle = computedBackgroundColor;
                ctx.strokeStyle = mainColor;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(canvasP.x, canvasP.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

        } else {
            // Draw Bezier Curve
            const p0 = toCanvas({x: 0, y: startY});
            const p3 = toCanvas({x: 1, y: endY});
            const c1 = toCanvas(handle1);
            const c2 = toCanvas(handle2);

            // Handle connection lines
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

            // Main curve
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
            ctx.stroke();

            // Endpoints
            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.arc(p0.x, p0.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p3.x, p3.y, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Handles
            ctx.fillStyle = computedBackgroundColor;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(c1.x, c1.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(c2.x, c2.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }, [advancedMode, points, color, coloredBackground, startY, endY, handle1, handle2, computedBackgroundColor, getComputedColor]);

    useEffect(() => {
        if (canvasRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d');
        }
    }, []);

    // Observer attached to the wrapper, NOT the canvas
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            const {width, height} = entry.contentRect;
            // Draw is triggered exclusively by layout changes or dependency updates
            draw(width, height);
        });

        resizeObserver.observe(wrapper);
        return () => resizeObserver.disconnect();
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
        // Drag MSEG points
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

        // Drag Bezier handles
        if (!advancedMode && dragTargetBezier.current !== 'none') {
            if ('touches' in e && e.cancelable) e.preventDefault();
            const pos = getMathPos(e);
            if (dragTargetBezier.current === 'handle1') onCurveChange?.(pos, handle2);
            else if (dragTargetBezier.current === 'handle2') onCurveChange?.(handle1, pos);
            return;
        }

        // Drag Time value
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
        <Card
            elevation={4}
            style={{flex: 1, minWidth: '150px', flexBasis: width ? `${width}px` : 'auto'}}
        >
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
                            title={advancedMode ? "Return to Basic Mode" : "Enable Advanced Mode"}
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
                                title="Drag to change, click to edit"
                                style={{cursor: 'ew-resize'}}
                            >
                                {time > 9999 ? '∞ ms' : `${Math.round(time)} ms`}
                            </span>
                        )}
                    </div>
                </div>
            </Card.Header>
            <Card.Body>
                <div
                    ref={wrapperRef}
                    className={styles.canvasWrapper}
                    style={{
                        width: '100%',
                        height: height,
                        backgroundColor: coloredBackground ? computedBackgroundColor : '#000000'
                    }}
                >
                    <canvas
                        ref={canvasRef}
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