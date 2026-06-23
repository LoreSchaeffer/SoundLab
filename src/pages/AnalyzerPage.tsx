import React, {useEffect, useRef, useState} from 'react';
import styles from './AnalyzerPage.module.css';
import {Destination, FFT, Player} from 'tone';
import {useSynth} from '../contexts/SynthContext.ts';
import {usePreset} from '../contexts/PresetContext.ts';
import Button from '../components/elements/Button.tsx';
import Select from '../components/forms/Select.tsx';
import {MdCode, MdImage, MdPlayArrow, MdStop} from 'react-icons/md';
import {generateBezierArray, generateMSEGArray} from '../utils/curves.ts';

const ANALYZER_CHANNEL_ID = 'analyzer_synth';
const TEST_NOTE = 'A4';

const AnalyzerPage = () => {
    const {presets} = usePreset();
    const {registerChannel, unregisterChannel, playNote, releaseNote} = useSynth();

    const [presetId, setPresetId] = useState('piano');
    const [isSynthPlaying, setIsSynthPlaying] = useState(false);
    const [isFilePlaying, setIsFilePlaying] = useState(false);
    const [audioPlayer, setAudioPlayer] = useState<Player | null>(null);
    const [fileName, setFileName] = useState<string>('');

    const synthCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileCanvasRef = useRef<HTMLCanvasElement>(null);

    const synthFftRef = useRef<FFT | null>(null);
    const fileFftRef = useRef<FFT | null>(null);
    const rafSynthRef = useRef<number>(0);
    const rafFileRef = useRef<number>(0);

    const synthHistoryRef = useRef<Float32Array[]>([]);
    const fileHistoryRef = useRef<Float32Array[]>([]);

    useEffect(() => {
        const fft1 = new FFT(1024);
        fft1.smoothing = 0.8;
        Destination.connect(fft1);
        synthFftRef.current = fft1;

        const fft2 = new FFT(1024);
        fft2.smoothing = 0.8;
        Destination.connect(fft2);
        fileFftRef.current = fft2;

        return () => {
            fft1.dispose();
            fft2.dispose();
        };
    }, []);

    useEffect(() => {
        const preset = presets.find(p => p.id === presetId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getCurve = (data: any, start: number, end: number) =>
            data?.isAdvanced && data?.points ? generateMSEGArray(data.points) : (data?.handle1 && data?.handle2 ? generateBezierArray(start, end, data.handle1, data.handle2) : undefined);

        const atk = preset?.attack || {time: 15};
        const dec = preset?.decay || {time: 500};
        const rel = preset?.release || {time: 300};

        registerChannel({
            id: ANALYZER_CHANNEL_ID,
            name: 'Analyzer',
            volume: 1.0,
            oscillatorType: preset?.oscillatorType || 'sine',
            partials: preset?.partials || [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            envelope: {
                attack: Math.max(0.015, atk.time / 1000),
                decay: Math.max(0.05, dec.time / 1000),
                sustain: 0,
                release: Math.max(0.1, rel.time / 1000),
                attackCurve: getCurve(preset?.attack, 0.0, 1.0),
                decayCurve: getCurve(preset?.decay, 1.0, 0.0),
                releaseCurve: getCurve(preset?.release, 1.0, 0.0)
            }
        });

        return () => unregisterChannel(ANALYZER_CHANNEL_ID);
    }, [presetId, presets, registerChannel, unregisterChannel]);

    const getColor = (value: number) => {
        let intensity = (value - (-100)) / 90;
        intensity = Math.max(0, Math.min(1, intensity));
        if (intensity < 0.1) return '#000000';
        if (intensity < 0.3) return `rgb(${intensity * 500}, 0, ${intensity * 800})`;
        if (intensity < 0.6) return `rgb(${intensity * 400}, 0, 0)`;
        if (intensity < 0.8) return `rgb(255, ${intensity * 200}, 0)`;
        return `rgb(255, 255, ${intensity * 255})`;
    };

    const drawSpectrogram = (canvas: HTMLCanvasElement, fft: FFT, rafRef: React.MutableRefObject<number>, historyRef: React.MutableRefObject<Float32Array[]>) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;
            const values = fft.getValue();

            historyRef.current.push(new Float32Array(values as Float32Array));

            ctx.drawImage(canvas, -2, 0);

            const bandsToDraw = 200;
            const sliceHeight = height / bandsToDraw;

            for (let i = 0; i < bandsToDraw; i++) {
                const value = values[bandsToDraw - 1 - i] as number;
                ctx.fillStyle = getColor(value);
                ctx.fillRect(width - 2, i * sliceHeight, 2, sliceHeight + 1);
            }

            rafRef.current = requestAnimationFrame(draw);
        };
        draw();
    };

    const handlePlaySynth = () => {
        if (synthCanvasRef.current && synthFftRef.current) {
            const ctx = synthCanvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, synthCanvasRef.current.width, synthCanvasRef.current.height);

            synthHistoryRef.current = [];
            drawSpectrogram(synthCanvasRef.current, synthFftRef.current, rafSynthRef, synthHistoryRef);
        }
        playNote(ANALYZER_CHANNEL_ID, TEST_NOTE, 1);
        setIsSynthPlaying(true);
    };

    const handleStopSynth = () => {
        releaseNote(ANALYZER_CHANNEL_ID, TEST_NOTE);
        setTimeout(() => cancelAnimationFrame(rafSynthRef.current), 2000);
        setIsSynthPlaying(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        const player = new Player(url).toDestination();
        await player.load(url);
        setAudioPlayer(player);
        setFileName(file.name.replace(".wav", ""));
    };

    const handlePlayFile = () => {
        if (!audioPlayer || !audioPlayer.loaded) return;

        if (fileCanvasRef.current && fileFftRef.current) {
            const ctx = fileCanvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, fileCanvasRef.current.width, fileCanvasRef.current.height);

            fileHistoryRef.current = [];
            drawSpectrogram(fileCanvasRef.current, fileFftRef.current, rafFileRef, fileHistoryRef);
        }

        audioPlayer.start();
        setIsFilePlaying(true);

        setTimeout(() => {
            setIsFilePlaying(false);
            setTimeout(() => cancelAnimationFrame(rafFileRef.current), 500);
        }, audioPlayer.buffer.duration * 1000);
    };

    const handleStopFile = () => {
        if (audioPlayer) audioPlayer.stop();
        cancelAnimationFrame(rafFileRef.current);
        setIsFilePlaying(false);
    };

    const exportImage = (history: Float32Array[], filename: string) => {
        if (history.length === 0) return alert("Nessun dato! Suona prima una nota.");

        const bandsToDraw = 200;
        const sliceWidth = 2;

        const canvas = document.createElement('canvas');
        canvas.width = history.length * sliceWidth;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const sliceHeight = canvas.height / bandsToDraw;

        history.forEach((values, frameIdx) => {
            for (let i = 0; i < bandsToDraw; i++) {
                const value = values[bandsToDraw - 1 - i];
                ctx.fillStyle = getColor(value);
                ctx.fillRect(frameIdx * sliceWidth, i * sliceHeight, sliceWidth, sliceHeight + 1);
            }
        });

        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const exportAIData = (history: Float32Array[], filename: string) => {
        if (history.length === 0) return alert("Nessun dato! Suona prima una nota.");

        const bandsToExport = 200;
        let csvContent = "";

        history.forEach(values => {
            const row = [];
            for (let i = 0; i < bandsToExport; i++) {
                row.push(values[bandsToExport - 1 - i].toFixed(4));
            }
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const presetOptions = presets.map(p => ({value: p.id, label: p.name}));

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>Laboratorio di Analisi A/B</h1>
                <p className={styles.description}>Confronta visivamente ed esporta gli spettrogrammi per addestrare modelli di intelligenza artificiale o analizzare i transienti.</p>
            </div>

            <div className={styles.splitLayout}>
                <div className={styles.column}>
                    <h2 className={styles.colTitle}>1. Suono Sintetico</h2>
                    <div className={styles.controls}>
                        <Select options={presetOptions} value={presetId} onChange={(e) => setPresetId(e.target.value)} color="cyan"/>
                        <Button color="green" icon={<MdPlayArrow/>} disabled={isSynthPlaying} onClick={handlePlaySynth}>Suona</Button>
                        <Button color="red" icon={<MdStop/>} disabled={!isSynthPlaying} onClick={handleStopSynth}>Ferma</Button>
                    </div>

                    <div className={styles.spectrogramBox}>
                        <canvas ref={synthCanvasRef} width={600} height={300} className={styles.canvas}/>
                    </div>

                    <div className={styles.exportRow}>
                        <Button className={styles.exportBtn} color="cyan" variant="default" icon={<MdImage/>} onClick={() => exportImage(synthHistoryRef.current, `synth_${presetId}`)}>
                            Immagine Completa
                        </Button>
                        <Button className={styles.exportBtn} color="blue" variant="default" icon={<MdCode/>} onClick={() => exportAIData(synthHistoryRef.current, `synth_${presetId}`)}>
                            Dati per AI (JSON)
                        </Button>
                    </div>
                </div>

                <div className={styles.column}>
                    <h2 className={styles.colTitle}>2. Suono Reale (File Audio)</h2>
                    <div className={styles.controls}>
                        <input type="file" accept="audio/wav,audio/mp3" onChange={handleFileUpload} className={styles.fileInput}/>
                        <Button color="green" icon={<MdPlayArrow/>} disabled={isFilePlaying || !audioPlayer} onClick={handlePlayFile}>Play</Button>
                        <Button color="red" icon={<MdStop/>} disabled={!isFilePlaying} onClick={handleStopFile}>Stop</Button>
                    </div>

                    <div className={styles.spectrogramBox}>
                        <canvas ref={fileCanvasRef} width={600} height={300} className={styles.canvas}/>
                    </div>

                    <div className={styles.exportRow}>
                        <Button className={styles.exportBtn} color="cyan" variant="default" icon={<MdImage/>} onClick={() => exportImage(fileHistoryRef.current, fileName)}>
                            Immagine Completa
                        </Button>
                        <Button className={styles.exportBtn} color="blue" variant="default" icon={<MdCode/>} onClick={() => exportAIData(fileHistoryRef.current, fileName)}>
                            Dati per AI (JSON)
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyzerPage;