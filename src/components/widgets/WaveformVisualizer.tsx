import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import styles from "./WaveformVisualizer.module.css";
import Card from "../elements/Card.tsx";
import {type Color, getComputedColor} from "../../types";
import {MdGraphicEq} from "react-icons/md";
import clsx from "clsx";
import Button from "../elements/Button.tsx";

export type WaveDefinition = {
    id: string;
    label: string;
    type: OscillatorType;
    frequency: number;
    amplitude: number;
    color: Color;
    partials?: number[];
};

export type WaveformVisualizerProps = React.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    titleColor?: Color;
    waves: WaveDefinition[];
    showToggles?: boolean;
    showSumWave?: boolean;
    sumWaveColor?: Color;
};

const WaveformVisualizer = ({
                                title = "Waveform Viewer",
                                titleColor = "cyan",
                                waves,
                                showToggles = false,
                                showSumWave = false,
                                sumWaveColor = "white",
                                className,
                                style,
                                ...props
                            }: WaveformVisualizerProps) => {
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [hiddenWaves, setHiddenWaves] = useState<Set<string>>(new Set());
    const [isSumVisible, setIsSumVisible] = useState<boolean>(waves.length > 1 && showSumWave);

    const computedTitleColor = useMemo(() => getComputedColor(titleColor), [titleColor]);
    const computedSumColor = useMemo(() => getComputedColor(sumWaveColor), [sumWaveColor]);

    const toggleWave = (id: string) => {
        setHiddenWaves(prev => {
            const next = new Set(prev);

            if (next.has(id)) next.delete(id);
            else next.add(id);

            return next;
        });
    };

    const getWaveY = useCallback((wave: WaveDefinition, tParam: number) => {
        let y = 0;
        switch (wave.type) {
            case 'sine':
                y = Math.sin(tParam);
                break;
            case 'square':
                y = Math.sign(Math.sin(tParam));
                break;
            case 'triangle':
                y = (2 / Math.PI) * Math.asin(Math.sin(tParam));
                break;
            case 'sawtooth':
                y = ((tParam / (2 * Math.PI)) % 1) * 2 - 1;
                break;
            case 'custom': {
                const partials = wave.partials || [];
                const sum = partials.reduce((a, b) => a + b, 0);
                const scale = sum > 0 ? 1 / Math.max(1, sum * 0.6) : 1;

                for (let i = 0; i < partials.length; i++) {
                    if (partials[i] > 0) y += partials[i] * Math.sin(tParam * (i + 1));
                }

                y *= scale;
                break;
            }
        }
        return y * wave.amplitude;
    }, []);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = 'hsl(210 16% 98% / 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (i * height) / 4;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        for (let i = 0; i <= 8; i++) {
            const x = (i * width) / 8;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Zero Line
        ctx.strokeStyle = 'hsl(210 16% 98% / 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        const activeWaves = waves.filter(w => !hiddenWaves.has(w.id));
        const baseFrequency = 440;
        const points = width;
        const baseCycles = 3;

        // Waves
        activeWaves.forEach(wave => {
            ctx.strokeStyle = getComputedColor(wave.color);
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            const cycles = (wave.frequency / baseFrequency) * baseCycles;

            for (let x = 0; x < points; x++) {
                const tParam = (x / points) * cycles * 2 * Math.PI;
                const y = getWaveY(wave, tParam);
                const pixelY = centerY + y * (height / 4) * 0.8;

                if (x === 0) ctx.moveTo(x, pixelY);
                else ctx.lineTo(x, pixelY);
            }
            ctx.stroke();
        });

        // Waves Sum
        if (showSumWave && isSumVisible && activeWaves.length > 0) {
            ctx.strokeStyle = computedSumColor;
            ctx.lineWidth = 2.5;

            ctx.beginPath();

            const visibleWaves = activeWaves.filter(w => !hiddenWaves.has(w.id));
            const maxAmplitudePossible = visibleWaves.reduce((acc, w) => acc + w.amplitude, 0);
            const scaleFactor = maxAmplitudePossible > 1.2 ? 1.2 / maxAmplitudePossible : 1;

            for (let x = 0; x < points; x++) {
                let sumY = 0;

                visibleWaves.forEach(wave => {
                    const cycles = (wave.frequency / baseFrequency) * baseCycles;
                    const tParam = (x / points) * cycles * 2 * Math.PI;
                    sumY += getWaveY(wave, tParam);
                });

                const pixelY = centerY + (sumY * scaleFactor) * (height / 4) * 0.8;
                if (x === 0) ctx.moveTo(x, pixelY);
                else ctx.lineTo(x, pixelY);
            }
            ctx.stroke();
        }
    }, [waves, showSumWave, isSumVisible, hiddenWaves, getWaveY, computedSumColor]);

    const drawWaveformRef = useRef(drawCanvas);

    useEffect(() => {
        drawWaveformRef.current = drawCanvas;
    }, [drawCanvas]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    useEffect(() => {
        const container = canvasContainerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (canvasRef.current) {
                    const dpr = window.devicePixelRatio || 1;
                    canvasRef.current.width = entry.contentRect.width * dpr;
                    canvasRef.current.height = entry.contentRect.height * dpr;
                    drawWaveformRef.current();
                }
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <Card
            elevation={4}
            className={clsx(styles.container, className)}
            style={style}
            {...props}
        >
            <Card.Header className={styles.header}>
                <MdGraphicEq className={styles.titleIcon} style={{color: computedTitleColor}}/>
                <h3 className={styles.title} style={{color: computedTitleColor}}>{title}</h3>
            </Card.Header>

            <Card.Body className={styles.body}>
                <div ref={canvasContainerRef} className={styles.canvasWrapper}>
                    <canvas ref={canvasRef} className={styles.canvas}/>
                </div>

                {showToggles && waves.length > 0 && (
                    <div className={styles.togglesContainer}>
                        {waves.map(wave => {
                            const isActive = !hiddenWaves.has(wave.id);
                            return (
                                <Button
                                    key={wave.id}
                                    color={wave.color}
                                    variant={isActive ? 'active' : 'default'}
                                    onClick={() => toggleWave(wave.id)}
                                >
                                    {wave.label}
                                </Button>
                            );
                        })}

                        {showSumWave && waves.length > 1 && (
                            <Button
                                color={sumWaveColor}
                                variant={isSumVisible ? 'active' : 'default'}
                                onClick={() => setIsSumVisible(prev => !prev)}
                            >
                                Resulting Wave
                            </Button>
                        )}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default WaveformVisualizer;