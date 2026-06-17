import React, {type ReactElement, useCallback, useEffect, useMemo, useRef, useState} from "react";
import styles from "./WaveformVisualizer.module.css";
import Card from "../elements/Card.tsx";
import {type Color, getComputedColor} from "../../types";
import {MdGraphicEq} from "react-icons/md";
import clsx from "clsx";
import Button from "../elements/Button.tsx";
import {useTranslation} from "react-i18next";

export type WaveDefinition = {
    id: string;
    label: string;
    type: OscillatorType;
    frequency: number;
    amplitude: number;
    color: Color;
    partials?: number[];
    phase?: number;
};

export type WaveformVisualizerProps = React.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    titleColor?: Color;
    waves: WaveDefinition[];
    showToggles?: boolean;
    showSumWave?: boolean;
    sumWaveColor?: Color;
    header?: ReactElement;
    width?: number;
    height?: number;
};

const WaveformVisualizer = ({
                                title,
                                titleColor = "cyan",
                                waves,
                                showToggles = false,
                                showSumWave = false,
                                sumWaveColor = "white",
                                className,
                                style,
                                header,
                                width,
                                height = 150,
                                ...props
                            }: WaveformVisualizerProps) => {
    const {t} = useTranslation();
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [hiddenWaves, setHiddenWaves] = useState<Set<string>>(new Set());
    const [isSumVisible, setIsSumVisible] = useState<boolean>(showSumWave);

    const computedTitleColor = useMemo(() => getComputedColor(titleColor), [titleColor]);
    const computedSumColor = useMemo(() => getComputedColor(sumWaveColor), [sumWaveColor]);
    const finalTitle = title || t('components.waveform_visualizer.title');

    const toggleWave = (id: string) => {
        setHiddenWaves(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getWaveY = useCallback((wave: WaveDefinition, tParam: number) => {
        const phaseRad = ((wave.phase || 0) * Math.PI) / 180;
        const shiftedT = tParam + phaseRad;

        let y = 0;
        switch (wave.type) {
            case 'sine':
                y = Math.sin(shiftedT);
                break;
            case 'square':
                y = Math.sign(Math.sin(shiftedT));
                break;
            case 'triangle':
                y = (2 / Math.PI) * Math.asin(Math.sin(shiftedT));
                break;
            case 'sawtooth':
                y = ((shiftedT / (2 * Math.PI)) % 1) * 2 - 1;
                break;
            case 'custom': {
                const partials = wave.partials || [];
                const sum = partials.reduce((a, b) => a + b, 0);
                const scale = sum > 0 ? 1 / Math.max(1, sum * 0.6) : 1;

                for (let i = 0; i < partials.length; i++) {
                    if (partials[i] > 0) y += partials[i] * Math.sin(shiftedT * (i + 1));
                }
                y *= scale;
                break;
            }
        }
        return y * wave.amplitude;
    }, []);

    const drawCanvas = useCallback(() => {
        const container = canvasContainerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = container.clientWidth;
        const h = container.clientHeight;

        if (w === 0 || h === 0) return;

        const dpr = window.devicePixelRatio || 1;

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
        }

        ctx.save();
        ctx.scale(dpr, dpr);

        const centerY = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = 'hsl(210 16% 98% / 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (i * h) / 4;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        for (let i = 0; i <= 8; i++) {
            const x = (i * w) / 8;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // Zero Line
        ctx.strokeStyle = 'hsl(210 16% 98% / 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();

        const activeWaves = waves.filter(wWave => !hiddenWaves.has(wWave.id));
        const baseFrequency = 440;
        const points = w;
        const baseCycles = 3;

        // Draw Single Waves
        activeWaves.forEach(wave => {
            ctx.strokeStyle = getComputedColor(wave.color);
            ctx.lineWidth = 2;

            ctx.beginPath();
            const cycles = (wave.frequency / baseFrequency) * baseCycles;

            for (let x = 0; x < points; x++) {
                const tParam = (x / points) * cycles * 2 * Math.PI;
                const y = getWaveY(wave, tParam);
                const pixelY = centerY + y * (h / 4) * 0.8;

                if (x === 0) ctx.moveTo(x, pixelY);
                else ctx.lineTo(x, pixelY);
            }
            ctx.stroke();
        });

        // Draw Sum Wave
        if (showSumWave && isSumVisible && activeWaves.length > 1) {
            ctx.strokeStyle = computedSumColor;
            ctx.lineWidth = 3;

            ctx.beginPath();

            const visibleWaves = activeWaves.filter(wWave => !hiddenWaves.has(wWave.id));
            const maxAmplitudePossible = visibleWaves.reduce((acc, wave) => acc + wave.amplitude, 0);
            const scaleFactor = maxAmplitudePossible > 1.2 ? 1.2 / maxAmplitudePossible : 1;

            for (let x = 0; x < points; x++) {
                let sumY = 0;

                visibleWaves.forEach(wave => {
                    const cycles = (wave.frequency / baseFrequency) * baseCycles;
                    const tParam = (x / points) * cycles * 2 * Math.PI;
                    sumY += getWaveY(wave, tParam);
                });

                const pixelY = centerY + (sumY * scaleFactor) * (h / 4) * 0.8;
                if (x === 0) ctx.moveTo(x, pixelY);
                else ctx.lineTo(x, pixelY);
            }
            ctx.stroke();
        }

        ctx.restore();
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

        const resizeObserver = new ResizeObserver(() => {
            drawWaveformRef.current();
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <Card
            elevation={4}
            className={clsx(styles.container, className)}
            style={{
                flex: '0 0 auto',
                minWidth: '300px',
                width: width ? `${width}px` : '100%',
                ...style
            }}
            {...props}
        >
            <Card.Header className={styles.header}>
                <MdGraphicEq className={styles.titleIcon} style={{color: computedTitleColor}}/>
                <h3 className={styles.title} style={{color: computedTitleColor}}>{finalTitle}</h3>
                <div className={styles.headerData}>{header}</div>
            </Card.Header>

            <Card.Body className={styles.body}>
                <div
                    ref={canvasContainerRef}
                    className={styles.canvasWrapper}
                    style={{height}}
                >
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