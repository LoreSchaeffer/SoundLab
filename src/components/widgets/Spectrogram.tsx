import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import styles from './Spectrogram.module.css';
import Card from '../elements/Card.tsx';
import {type Color, getComputedColor} from "../../types";
import Button from "../elements/Button.tsx";
import {MdFileUpload, MdPause, MdPlayArrow} from "react-icons/md";

const generateColormap = () => {
    const cmap = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
        const t = i / 255.0;
        let r = 0, g = 0, b = 0;

        if (t < 0.15) b = t * (1.0 / 0.15) * 100;
        else if (t < 0.4) {
            const nt = (t - 0.15) / 0.25;
            b = 100 + nt * 155;
            r = nt * 100;
        } else if (t < 0.6) {
            const nt = (t - 0.4) / 0.2;
            b = 255 - nt * 100;
            r = 100 - nt * 100;
            g = nt * 200;
        } else if (t < 0.8) {
            const nt = (t - 0.6) / 0.2;
            g = 200 + nt * 55;
            r = nt * 255;
            b = 155 - nt * 155;
        } else {
            const nt = (t - 0.8) / 0.2;
            r = 255;
            g = 255 - nt * 255;
            b = 0;
        }

        const intensity = Math.pow(t, 1.2);
        cmap[i * 4] = Math.min(255, r * intensity);
        cmap[i * 4 + 1] = Math.min(255, g * intensity);
        cmap[i * 4 + 2] = Math.min(255, b * intensity);
        cmap[i * 4 + 3] = 255;
    }
    return cmap;
};
const COLORMAP = generateColormap();
const TIMELINE_HEIGHT = 24;
const Y_AXIS_WIDTH = 28;
const HF_CUTOFF_THRESHOLD = 75;
const SILENCE_CUTOFF_THRESHOLD = 20;

type Rect = {
    x1: number, y1: number,
    x2: number, y2: number
};

export type SpectrogramProps = {
    width?: number | string;
    height?: number;
    color?: Color;
    onPlay?: () => void;
    onAudioLoaded?: (buffer: AudioBuffer) => void;
};

const Spectrogram = ({width = '100%', height = 350, color = 'cyan', onPlay, onAudioLoaded}: SpectrogramProps) => {
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const yAxisCanvasRef = useRef<HTMLCanvasElement>(null);
    const hZoomRef = useRef<HTMLDivElement>(null);
    const vZoomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [status, setStatus] = useState<'idle' | 'decoding' | 'processing' | 'ready'>('idle');
    const [isPlaying, setIsPlaying] = useState(false);

    // Zoom States
    const [hView, setHView] = useState<[number, number]>([0, 1]);
    const [vView, setVView] = useState<[number, number]>([0, 1]);
    const hViewRef = useRef<[number, number]>([0, 1]);
    const vViewRef = useRef<[number, number]>([0, 1]);

    // Audio & Processing Data
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const maxRenderFreqRef = useRef<number>(8000);
    const trimmedDurationRef = useRef<number>(0);

    // Playback engine
    const playbackCtxRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const filtersRef = useRef<{ hp: BiquadFilterNode, lp: BiquadFilterNode } | null>(null);
    const startTimeRef = useRef<number>(0);
    const offsetTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);

    // Interaction state
    const playheadRef = useRef<number>(0);
    const selectionRef = useRef<Rect | null>(null);
    const mouseActionRef = useRef<'idle' | 'seek' | 'select'>('idle');

    // Drag States
    const hDragState = useRef<{ type: 'left' | 'right' | 'track', startX: number, initView: [number, number] } | null>(null);
    const vDragState = useRef<{ type: 'top' | 'bottom' | 'track', startY: number, initView: [number, number] } | null>(null);


    const computedColor = useMemo(() => getComputedColor(color), [color]);

    // File Upload & Processing
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        stopPlayback();
        setStatus('decoding');
        selectionRef.current = null;
        playheadRef.current = 0;
        offsetTimeRef.current = 0;

        hViewRef.current = [0, 1];
        setHView([0, 1]);
        vViewRef.current = [0, 1];
        setVView([0, 1]);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const decodeCtx = new AudioContext();
            const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
            audioBufferRef.current = audioBuffer;

            onAudioLoaded?.(audioBuffer);

            decodeCtx.close();

            setStatus('processing');
            await processSpectrogram(audioBuffer);
            setStatus('ready');
        } catch (error) {
            console.error("Errore:", error);
            alert("Formato non supportato. Usa file WAV, MP3 o FLAC.");
            setStatus('idle');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const processSpectrogram = async (audioBuffer: AudioBuffer) => {
        const sampleRate = audioBuffer.sampleRate;
        const length = audioBuffer.length;

        const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;

        const fftSize = 4096;
        const analyser = offlineCtx.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = 0.0;

        const processor = offlineCtx.createScriptProcessor(2048, 1, 1);
        const data: Uint8Array[] = [];

        processor.onaudioprocess = () => {
            const freqs = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(freqs);
            data.push(new Uint8Array(freqs));
        };

        source.connect(analyser);
        analyser.connect(processor);
        processor.connect(offlineCtx.destination);
        source.start(0);
        await offlineCtx.startRendering();

        let highestBin = 0;
        for (let t = 0; t < data.length; t++) {
            for (let b = data[t].length - 1; b > highestBin; b--) {
                if (data[t][b] > HF_CUTOFF_THRESHOLD) {
                    highestBin = b;
                    break;
                }
            }
        }
        const hzPerBin = (sampleRate / 2) / analyser.frequencyBinCount;

        let lastActiveFrame = 0;
        for (let t = data.length - 1; t >= 0; t--) {
            let frameHasEnergy = false;
            for (let b = 0; b <= highestBin; b++) {
                if (data[t][b] > SILENCE_CUTOFF_THRESHOLD) {
                    frameHasEnergy = true;
                    break;
                }
            }
            if (frameHasEnergy) {
                lastActiveFrame = t;
                break;
            }
        }

        maxRenderFreqRef.current = sampleRate / 2;
        trimmedDurationRef.current = audioBuffer.duration;

        generateOffscreenCanvas(data, hzPerBin);

        const activeFreq = Math.max(2000, (highestBin * hzPerBin) * 1.15);
        const vEnd = Math.max(0.01, Math.min(1, activeFreq / maxRenderFreqRef.current));

        const marginFrames = Math.floor((sampleRate / 2048) * 0.5);
        const activeFrames = Math.min(data.length, lastActiveFrame + marginFrames);
        const hEnd = Math.max(0.01, Math.min(1, activeFrames / data.length));

        vViewRef.current = [0, vEnd];
        setVView([0, vEnd]);

        hViewRef.current = [0, hEnd];
        setHView([0, hEnd]);
    };

    const generateOffscreenCanvas = (data: Uint8Array[], hzPerBin: number) => {
        const maxBinIndex = Math.floor(maxRenderFreqRef.current / hzPerBin);
        const imgWidth = data.length;
        const imgHeight = Math.min(data[0].length, maxBinIndex);

        const offCanvas = document.createElement('canvas');
        offCanvas.width = imgWidth;
        offCanvas.height = imgHeight;
        const ctx = offCanvas.getContext('2d')!;
        const imageData = ctx.createImageData(imgWidth, imgHeight);

        for (let x = 0; x < imgWidth; x++) {
            const col = data[x];
            for (let y = 0; y < imgHeight; y++) {
                const invY = imgHeight - 1 - y;
                const val = col[y];

                const pixelIndex = (invY * imgWidth + x) * 4;
                const cmapIndex = val * 4;

                imageData.data[pixelIndex] = COLORMAP[cmapIndex];
                imageData.data[pixelIndex + 1] = COLORMAP[cmapIndex + 1];
                imageData.data[pixelIndex + 2] = COLORMAP[cmapIndex + 2];
                imageData.data[pixelIndex + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        offscreenCanvasRef.current = offCanvas;
    };

    // Zoom controls logic
    const onHPointerDown = (e: React.PointerEvent, type: 'left' | 'right' | 'track') => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        hDragState.current = {type, startX: e.clientX, initView: [...hViewRef.current]};
    };

    const onHPointerMove = (e: React.PointerEvent) => {
        if (!hDragState.current || !hZoomRef.current) return;
        const {type, startX, initView} = hDragState.current;
        const deltaNorm = (e.clientX - startX) / hZoomRef.current.getBoundingClientRect().width;
        let [newStart, newEnd] = initView;

        if (type === 'left') newStart = Math.min(newEnd - 0.05, Math.max(0, initView[0] + deltaNorm));
        else if (type === 'right') newEnd = Math.max(newStart + 0.05, Math.min(1, initView[1] + deltaNorm));
        else if (type === 'track') {
            const range = initView[1] - initView[0];
            newStart = initView[0] + deltaNorm;
            newEnd = initView[1] + deltaNorm;
            if (newStart < 0) {
                newStart = 0;
                newEnd = range;
            }

            if (newEnd > 1) {
                newEnd = 1;
                newStart = 1 - range;
            }
        }

        hViewRef.current = [newStart, newEnd];
        setHView([newStart, newEnd]);
    };

    const onVPointerDown = (e: React.PointerEvent, type: 'top' | 'bottom' | 'track') => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        vDragState.current = {type, startY: e.clientY, initView: [...vViewRef.current]};
    };

    const onVPointerMove = (e: React.PointerEvent) => {
        if (!vDragState.current || !vZoomRef.current) return;
        const {type, startY, initView} = vDragState.current;
        const deltaNorm = (e.clientY - startY) / vZoomRef.current.getBoundingClientRect().height;
        let [newBottom, newTop] = initView;

        if (type === 'top') newTop = Math.min(1, Math.max(newBottom + 0.05, initView[1] - deltaNorm));
        else if (type === 'bottom') newBottom = Math.max(0, Math.min(newTop - 0.05, initView[0] - deltaNorm));
        else if (type === 'track') {
            const range = initView[1] - initView[0];
            newTop = initView[1] - deltaNorm;
            newBottom = initView[0] - deltaNorm;
            if (newTop > 1) {
                newTop = 1;
                newBottom = 1 - range;
            }

            if (newBottom < 0) {
                newBottom = 0;
                newTop = range;
            }
        }

        vViewRef.current = [newBottom, newTop];
        setVView([newBottom, newTop]);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        hDragState.current = null;
        vDragState.current = null;
    };

    // Playback & Filters Engine
    const initPlaybackContext = useCallback(() => {
        if (!playbackCtxRef.current) {
            playbackCtxRef.current = new AudioContext();
            const hp = playbackCtxRef.current.createBiquadFilter();
            hp.type = 'highpass';
            const lp = playbackCtxRef.current.createBiquadFilter();
            lp.type = 'lowpass';
            hp.connect(lp);
            lp.connect(playbackCtxRef.current.destination);
            filtersRef.current = {hp, lp};
        }
    }, []);

    const updateFilters = useCallback(() => {
        if (!filtersRef.current) return;
        const {hp, lp} = filtersRef.current;

        if (selectionRef.current) {
            const {y1, y2} = selectionRef.current;
            const topY = Math.min(y1, y2);
            const bottomY = Math.max(y1, y2);

            hp.frequency.value = maxRenderFreqRef.current * (1 - bottomY);
            lp.frequency.value = maxRenderFreqRef.current * (1 - topY);
        } else {
            hp.frequency.value = 0;
            lp.frequency.value = 22050;
        }
    }, []);

    const stopPlayback = useCallback(() => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }

        if (isPlaying && playbackCtxRef.current) {
            offsetTimeRef.current += (playbackCtxRef.current.currentTime - startTimeRef.current);
        }

        setIsPlaying(false);
    }, [isPlaying]);

    const play = useCallback(() => {
        if (!audioBufferRef.current) return;
        initPlaybackContext();
        updateFilters();

        if (playbackCtxRef.current?.state === 'suspended') playbackCtxRef.current.resume();

        stopPlayback();

        const source = playbackCtxRef.current!.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.loop = true;
        source.loopEnd = trimmedDurationRef.current;
        source.connect(filtersRef.current!.hp);

        if (offsetTimeRef.current >= trimmedDurationRef.current) offsetTimeRef.current = 0;

        source.start(0, offsetTimeRef.current);
        sourceNodeRef.current = source;
        startTimeRef.current = playbackCtxRef.current!.currentTime;
        setIsPlaying(true);
        onPlay?.();
    }, [initPlaybackContext, stopPlayback, updateFilters, onPlay]);

    const togglePlay = () => isPlaying ? stopPlayback() : play();

    const seekTo = useCallback((normalizedX: number) => {
        if (!audioBufferRef.current) return;
        const wasPlaying = isPlaying;
        if (isPlaying) stopPlayback();

        const safeX = Math.max(0, Math.min(1, normalizedX));
        offsetTimeRef.current = safeX * trimmedDurationRef.current;
        playheadRef.current = safeX;

        if (wasPlaying) play();
    }, [isPlaying, play, stopPlayback]);

    // Main canvas mouse interaction
    const getMousePos = (e: React.MouseEvent | MouseEvent) => {
        const canvas = mainCanvasRef.current;
        if (!canvas) return {absX: 0, absY: 0, isTimeline: false, rect: {width: 0, height: 0}};
        const rect = canvas.getBoundingClientRect();

        const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const specHeight = rect.height - TIMELINE_HEIGHT;
        const rawY = e.clientY - rect.top;
        const isTimeline = rawY >= specHeight;

        const absX = hViewRef.current[0] + relX * (hViewRef.current[1] - hViewRef.current[0]);

        const relY = Math.max(0, Math.min(1, rawY / specHeight));
        const absY = vViewRef.current[1] - relY * (vViewRef.current[1] - vViewRef.current[0]);

        return {absX, absY, isTimeline, rect};
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!audioBufferRef.current || status !== 'ready') return;
        const {absX, absY, isTimeline} = getMousePos(e);

        if (isTimeline) {
            mouseActionRef.current = 'seek';
            seekTo(absX);
        } else {
            mouseActionRef.current = 'select';
            selectionRef.current = {x1: absX, y1: absY, x2: absX, y2: absY};
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (mouseActionRef.current === 'idle' || !audioBufferRef.current || !mainCanvasRef.current) return;
        const {absX, absY} = getMousePos(e);

        if (mouseActionRef.current === 'seek') seekTo(absX);
        else if (mouseActionRef.current === 'select' && selectionRef.current) {
            selectionRef.current.x2 = absX;
            selectionRef.current.y2 = absY;
        }
    }, [seekTo]);

    const handleMouseUp = useCallback(() => {
        if (mouseActionRef.current === 'select' && selectionRef.current) {
            const {x1, y1, x2, y2} = selectionRef.current;
            if (Math.abs(x2 - x1) < 0.005 && Math.abs(y2 - y1) < 0.02) selectionRef.current = null;
            updateFilters();
        }
        mouseActionRef.current = 'idle';
    }, [updateFilters]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Render Loop
    const drawYAxis = useCallback((specHeight: number, actualHeight: number) => {
        const canvas = yAxisCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        if (canvas.width !== Y_AXIS_WIDTH || canvas.height !== actualHeight) {
            canvas.width = Y_AXIS_WIDTH;
            canvas.height = actualHeight;
        }

        ctx.fillStyle = 'hsl(210 15% 10%)';
        ctx.fillRect(0, 0, canvas.width, actualHeight);

        ctx.fillStyle = 'hsl(210 16% 98% / 0.7)';
        ctx.font = '10px monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';

        const minFreq = maxRenderFreqRef.current * vView[0];
        const maxFreq = maxRenderFreqRef.current * vView[1];
        const freqRange = maxFreq - minFreq;

        const step = freqRange > 12000 ? 4000 : freqRange > 6000 ? 2000 : freqRange > 2000 ? 1000 : 500;
        const firstStep = Math.ceil(minFreq / step) * step;

        for (let freq = firstStep; freq <= maxFreq; freq += step) {
            const y = specHeight - ((freq - minFreq) / freqRange) * specHeight;
            if (y > 10 && y < specHeight - 10) ctx.fillText(`${Math.round(freq / 1000)}k`, canvas.width - 6, y);
        }

        ctx.fillStyle = 'hsl(210 14% 16%)';
        ctx.fillRect(0, specHeight, canvas.width, TIMELINE_HEIGHT);
    }, [vView]);

    const drawMainCanvas = useCallback(() => {
        const canvas = mainCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.parentElement?.getBoundingClientRect();

        // FIX: Use rect.height (the actual grid cell height) instead of the component's height prop
        if (rect && (canvas.width !== rect.width || canvas.height !== rect.height)) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        // Now actualHeight perfectly matches the CSS grid cell
        const actualHeight = canvas.height;
        const specHeight = actualHeight - TIMELINE_HEIGHT;
        ctx.clearRect(0, 0, canvas.width, actualHeight);

        // Spectrogram Slicing
        const img = offscreenCanvasRef.current;
        if (img) {
            const sx = hView[0] * img.width;
            const sw = (hView[1] - hView[0]) * img.width;
            const sy = (1 - vView[1]) * img.height;
            const sh = (vView[1] - vView[0]) * img.height;
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, specHeight);
        }

        drawYAxis(specHeight, actualHeight);

        // Horizontal Grid
        ctx.strokeStyle = 'hsl(210 16% 98% / 0.15)';
        ctx.lineWidth = 1;
        const minFreq = maxRenderFreqRef.current * vView[0];
        const maxFreq = maxRenderFreqRef.current * vView[1];
        const freqRange = maxFreq - minFreq;
        const step = freqRange > 12000 ? 4000 : freqRange > 6000 ? 2000 : freqRange > 2000 ? 1000 : 500;
        const firstStep = Math.ceil(minFreq / step) * step;

        for (let freq = firstStep; freq <= maxFreq; freq += step) {
            const y = specHeight - ((freq - minFreq) / freqRange) * specHeight;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Timeline
        ctx.fillStyle = 'hsl(210 14% 16%)';
        ctx.fillRect(0, specHeight, canvas.width, TIMELINE_HEIGHT);
        ctx.strokeStyle = 'hsl(210 16% 98% / 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, specHeight);
        ctx.lineTo(canvas.width, specHeight);
        ctx.stroke();

        if (audioBufferRef.current) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 11px monospace';

            const startTime = trimmedDurationRef.current * hView[0];
            const endTime = trimmedDurationRef.current * hView[1];
            const duration = endTime - startTime;

            const timeStep = duration > 20 ? 5 : duration > 5 ? 2 : duration > 2 ? 1 : 0.5;
            const firstTimeStep = Math.ceil(startTime / timeStep) * timeStep;

            for (let s = firstTimeStep; s <= endTime; s += timeStep) {
                const x = ((s - startTime) / duration) * canvas.width;
                ctx.fillStyle = 'hsl(210 13% 65% / 0.5)';
                ctx.fillRect(x, specHeight, 1, 6);
                ctx.fillStyle = 'hsl(210 16% 98%)';
                ctx.fillText(`${s}s`, s === 0 ? x + 8 : x, specHeight + 13);
            }
        }

        // Selection
        if (selectionRef.current) {
            const {x1, y1, x2, y2} = selectionRef.current;

            const relX1 = (x1 - hView[0]) / (hView[1] - hView[0]);
            const relX2 = (x2 - hView[0]) / (hView[1] - hView[0]);
            const relY1 = (vView[1] - y1) / (vView[1] - vView[0]);
            const relY2 = (vView[1] - y2) / (vView[1] - vView[0]);

            const px1 = relX1 * canvas.width;
            const px2 = relX2 * canvas.width;
            const py1 = relY1 * specHeight;
            const py2 = relY2 * specHeight;

            ctx.fillStyle = `color-mix(in srgb, ${computedColor} 20%, transparent)`;
            ctx.strokeStyle = computedColor;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.fillRect(px1, py1, px2 - px1, py2 - py1);
            ctx.strokeRect(px1, py1, px2 - px1, py2 - py1);
            ctx.setLineDash([]);
        }

        // Playhead
        if (isPlaying && playbackCtxRef.current && audioBufferRef.current) {
            const elapsed = playbackCtxRef.current.currentTime - startTimeRef.current;
            const currentT = (offsetTimeRef.current + elapsed) % trimmedDurationRef.current;
            playheadRef.current = Math.max(0, currentT / trimmedDurationRef.current);

            // Autoscroll
            if (mouseActionRef.current === 'idle') {
                const absHeadX = playheadRef.current;
                if (absHeadX > hViewRef.current[1] || absHeadX < hViewRef.current[0]) {
                    const viewRange = hViewRef.current[1] - hViewRef.current[0];
                    let newStart = absHeadX - viewRange * 0.1;
                    let newEnd = newStart + viewRange;

                    if (newEnd > 1) {
                        newEnd = 1;
                        newStart = 1 - viewRange;
                    }

                    if (newStart < 0) {
                        newStart = 0;
                        newEnd = viewRange;
                    }

                    hViewRef.current = [newStart, newEnd];
                    setHView([newStart, newEnd]);
                }
            }
        }

        if (playheadRef.current >= hView[0] && playheadRef.current <= hView[1]) {
            const relHeadX = (playheadRef.current - hView[0]) / (hView[1] - hView[0]);
            const headX = relHeadX * canvas.width;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(headX, 0);
            ctx.lineTo(headX, specHeight);
            ctx.stroke();

            ctx.fillStyle = computedColor;
            ctx.beginPath();
            ctx.moveTo(headX - 6, specHeight + TIMELINE_HEIGHT);
            ctx.lineTo(headX + 6, specHeight + TIMELINE_HEIGHT);
            ctx.lineTo(headX, specHeight);
            ctx.fill();
        }

        animationFrameRef.current = requestAnimationFrame(drawMainCanvas);
    }, [isPlaying, computedColor, hView, vView, drawYAxis]);

    useEffect(() => {
        animationFrameRef.current = requestAnimationFrame(drawMainCanvas);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [drawMainCanvas]);

    return (
        <Card elevation={4} className={styles.container} style={{width}}>
            <Card.Header className={styles.header}>
                <span className={styles.title} style={{color: computedColor}}>Audio Spectrogram</span>

                <div className={styles.controls}>
                    <Button
                        color={color} variant={isPlaying ? 'active' : 'default'}
                        icon={isPlaying ? <MdPause/> : <MdPlayArrow/>}
                        onClick={togglePlay} disabled={status !== 'ready'}
                    >
                        {isPlaying ? 'Pause' : 'Play'}
                    </Button>

                    <div style={{width: '1px', height: '20px', backgroundColor: 'var(--neutral-700)', margin: '0 8px'}}/>

                    <Button
                        color={color} icon={<MdFileUpload/>}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={status === 'decoding' || status === 'processing'}
                    >
                        {status === 'idle' || status === 'ready' ? 'Upload Audio' : 'Wait...'}
                    </Button>
                    <input
                        type="file" accept=".wav, .mp3, .ogg, .flac, .m4a, .aac, audio/wav, audio/mpeg"
                        ref={fileInputRef} onChange={handleFileUpload} className={styles.hiddenInput}
                    />
                </div>
            </Card.Header>

            <Card.Body>
                <div className={styles.gridContainer} style={{height}}>
                    {status === 'decoding' && <div className={styles.overlay}>Decoding...</div>}
                    {status === 'processing' && <div className={styles.overlay}>Generating Spectrogram...</div>}

                    <div className={styles.corner}/>

                    {/* H-ZOOM SLIDER */}
                    <div className={styles.hZoomArea} ref={hZoomRef}>
                        <div
                            className={styles.zoomTrack}
                            style={{
                                left: `${hView[0] * 100}%`, right: `${(1 - hView[1]) * 100}%`, top: '2px', bottom: '2px',
                                backgroundColor: `color-mix(in srgb, ${computedColor} 30%, transparent)`, border: `1px solid ${computedColor}`
                            }}
                            onPointerDown={(e) => onHPointerDown(e, 'track')} onPointerMove={onHPointerMove} onPointerUp={onPointerUp}
                        >
                            <div className={styles.hHandleLeft} style={{backgroundColor: computedColor}} onPointerDown={(e) => onHPointerDown(e, 'left')} onPointerMove={onHPointerMove} onPointerUp={onPointerUp}/>
                            <div className={styles.hHandleRight} style={{backgroundColor: computedColor}} onPointerDown={(e) => onHPointerDown(e, 'right')} onPointerMove={onHPointerMove} onPointerUp={onPointerUp}/>
                        </div>
                    </div>

                    {/* V-ZOOM SLIDER */}
                    <div className={styles.vZoomArea} ref={vZoomRef}>
                        <div
                            className={styles.zoomTrack}
                            style={{
                                top: `${(1 - vView[1]) * 100}%`, bottom: `${vView[0] * 100}%`, left: '2px', right: '2px',
                                backgroundColor: `color-mix(in srgb, ${computedColor} 30%, transparent)`, border: `1px solid ${computedColor}`
                            }}
                            onPointerDown={(e) => onVPointerDown(e, 'track')} onPointerMove={onVPointerMove} onPointerUp={onPointerUp}
                        >
                            <div className={styles.vHandleTop} style={{backgroundColor: computedColor}} onPointerDown={(e) => onVPointerDown(e, 'top')} onPointerMove={onVPointerMove} onPointerUp={onPointerUp}/>
                            <div className={styles.vHandleBottom} style={{backgroundColor: computedColor}} onPointerDown={(e) => onVPointerDown(e, 'bottom')} onPointerMove={onVPointerMove} onPointerUp={onPointerUp}/>
                        </div>
                    </div>

                    <div className={styles.bottomCorner} />

                    <canvas ref={yAxisCanvasRef} className={styles.yAxisCanvas}/>

                    <div className={styles.mainArea}>
                        <canvas ref={mainCanvasRef} className={styles.mainCanvas} onMouseDown={handleMouseDown}/>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};

export default Spectrogram;