import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import styles from './HarmonicsEditor.module.css';
import type {Color} from "../../types";
import Card from "../elements/Card.tsx";

export type HarmonicsEditorProps = {
    partials: number[];
    width?: number;
    height?: number;
    title?: string;
    color: Color;
    colored?: boolean;
    onPartialsChange: (newPartials: number[]) => void;
}

const HarmonicsEditor = ({
                             partials,
                             onPartialsChange,
                             title = 'Harmonics',
                             color,
                             colored = true,
                             width = 600,
                             height = 120
                         }: HarmonicsEditorProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isDragging = useRef(false);

    const getComputedColor = useCallback((colorName: Color) => {
        if (typeof window === 'undefined') return '#ffffff';
        return getComputedStyle(document.documentElement).getPropertyValue(`--${colorName}-500`).trim();
    }, []);

    const computedBackgroundColor = useMemo(() => {
        const mainColor = getComputedColor(color);
        return `color-mix(in srgb, ${mainColor} 8%, #000000)`;
    }, [color, getComputedColor]);

    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const mainColor = getComputedColor(color);
        ctx.clearRect(0, 0, width, height);

        ctx.strokeStyle = colored ? `color-mix(in srgb, ${mainColor} 20%, transparent)` : 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        let maxPeak = 0;
        const waveData = new Float32Array(width);

        for (let x = 0; x < width; x++) {
            const t = x / width;
            let y = 0;

            for (let i = 0; i < partials.length; i++) {
                y += partials[i] * Math.sin((i + 1) * Math.PI * 2 * t);
            }

            waveData[x] = y;
            if (Math.abs(y) > maxPeak) maxPeak = Math.abs(y);
        }

        const scale = maxPeak > 0 ? (height / 2) / (maxPeak * 1.1) : 0;
        const centerY = height / 2;

        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const canvasY = centerY - (waveData[x] * scale);
            if (x === 0) ctx.moveTo(x, canvasY);
            else ctx.lineTo(x, canvasY);
        }
        ctx.stroke();

        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(0, centerY - (waveData[0] * scale), 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(width, centerY - (waveData[width - 1] * scale), 3, 0, Math.PI * 2);
        ctx.fill();

    }, [partials, width, height, color, colored, getComputedColor]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform]);

    const updatePartial = useCallback((e: React.PointerEvent | PointerEvent, index: number) => {
        const track = trackRefs.current[index];
        if (!track) return;

        const rect = track.getBoundingClientRect();
        let value = 1 - ((e.clientY - rect.top) / rect.height);
        value = Math.max(0, Math.min(1, value)); // Clamp tra 0 e 1

        const newPartials = [...partials];
        newPartials[index] = value;
        onPartialsChange(newPartials);
    }, [partials, onPartialsChange]);

    useEffect(() => {
        const handleGlobalPointerUp = () => isDragging.current = false;
        window.addEventListener('pointerup', handleGlobalPointerUp);
        return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
    }, []);

    const handlePointerDown = (e: React.PointerEvent, index: number) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        isDragging.current = true;
        updatePartial(e, index);
    };

    const handlePointerMove = (e: React.PointerEvent, index: number) => {
        if (isDragging.current) updatePartial(e, index);
    };

    const handlePointerEnter = (e: React.PointerEvent, index: number) => {
        if (isDragging.current && e.buttons === 1) updatePartial(e, index);
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>, index: number) => {
        const direction = e.deltaY < 0 ? 1 : -1;
        const step = e.shiftKey ? 0.1 : 0.02;

        let newValue = partials[index] + (direction * step);
        newValue = Math.max(0, Math.min(1, newValue));

        const newPartials = [...partials];
        newPartials[index] = newValue;
        onPartialsChange(newPartials);
    };

    const handleReset = (index: number) => {
        const newPartials = [...partials];
        newPartials[index] = 0;
        onPartialsChange(newPartials);
    };

    return (
        <Card elevation={4} className={styles.container} style={{width: width + 26}}>
            <Card.Header className={styles.header}>
                <span className={styles.title} style={{color: `var(--${color}-500)`}}>
                    {title}
                </span>
            </Card.Header>
            <Card.Body>
                <div
                    className={styles.canvasWrapper}
                    style={{
                        width, height,
                        backgroundColor: colored ? computedBackgroundColor : '#000000'
                    }}
                >
                    <canvas ref={canvasRef} width={width} height={height} className={styles.canvas}/>
                </div>

                <div className={styles.controlsWrapper} style={{width}}>
                    {partials.map((amp, index) => {
                        const fillOpacity = index === 0 ? '1' : '0.8';

                        return (
                            <div
                                key={index}
                                className={styles.sliderCol}
                                onPointerEnter={(e) => handlePointerEnter(e, index)}
                                onWheel={(e) => handleWheel(e, index)}
                            >
                                <div
                                    className={styles.track}
                                    ref={(el) => {
                                        trackRefs.current[index] = el;
                                    }}
                                    onPointerDown={(e) => handlePointerDown(e, index)}
                                    onPointerMove={(e) => handlePointerMove(e, index)}
                                >
                                    <div
                                        className={styles.fill}
                                        style={{
                                            height: `${amp * 100}%`,
                                            backgroundColor: `var(--${color}-500)`,
                                            opacity: fillOpacity
                                        }}
                                    />
                                </div>
                                <div
                                    className={styles.label}
                                    onClick={() => handleReset(index)}
                                    title={'Reset'}
                                    style={{
                                        color: amp > 0.05 ? `var(--${color}-500)` : undefined,
                                        backgroundColor: amp > 0.05 ? computedBackgroundColor : undefined
                                    }}
                                >
                                    {index + 1}x
                                </div>
                            </div>
                        )
                    })}
                </div>
            </Card.Body>
        </Card>
    );
};

export default HarmonicsEditor;