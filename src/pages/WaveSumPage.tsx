import React, { useEffect, useRef, useState } from "react";
import styles from "./WaveSumPage.module.css";
import clsx from "clsx";

// Contesti e Utilities
import { useSynth } from "../contexts/SynthContext.ts";
import { createDefaultInstrument } from "../utils/audio.ts";
import { type Color } from "../types";
import { commonNotes } from "../types/music.ts";

// Componenti UI
import Card from "../components/elements/Card.tsx";
import Button from "../components/elements/Button.tsx";
import Select from "../components/forms/Select.tsx";
import Slider from "../components/forms/Slider.tsx";
import WaveformVisualizer, { type WaveDefinition } from "../components/widgets/WaveformVisualizer.tsx";
import type { OscillatorType } from "../contexts/SynthContext.ts";

// Icone
import { MdAdd, MdDelete, MdGraphicEq, MdMusicNote, MdPlayArrow, MdStop, MdVolumeOff, MdVolumeUp, MdWaves } from "react-icons/md";

const getItalianNoteName = (noteName: string) => {
    const noteMap: Record<string, string> = { 'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 'G': 'Sol', 'A': 'La', 'B': 'Si' };
    return noteMap[noteName] || noteName;
};

type WaveState = {
    id: string;
    type: OscillatorType;
    frequency: number;
    amplitude: number;
    active: boolean;
    color: Color;
};

const AVAILABLE_COLORS: Color[] = ['cyan', 'red', 'yellow', 'green', 'purple', 'pink', 'blue'];

const WaveSumPage = () => {
    const { isAudioReady, initAudio, registerChannel, unregisterChannel, updateChannelConfig, playNote, releaseNote, updateNoteFrequency } = useSynth();

    const [isPlaying, setIsPlaying] = useState(false);
    const [waves, setWaves] = useState<WaveState[]>([{
        id: `wave-${Date.now()}`,
        type: 'sine',
        frequency: 440,
        amplitude: 0.5,
        active: true,
        color: 'cyan'
    }]);

    const registeredChannelsRef = useRef<Set<string>>(new Set());

    // --- CICLO DI VITA CANALI ---
    const setupWaveChannel = (wave: WaveState) => {
        const config = createDefaultInstrument(wave.id, `SumWave`);
        config.envelope = { attack: 0.05, decay: 0.0, sustain: 1.0, release: 0.1 };
        config.oscillatorType = wave.type;
        config.volume = wave.active ? wave.amplitude : 0;

        registerChannel(config);
        registeredChannelsRef.current.add(wave.id);
    };

    useEffect(() => {
        // Setup dell'onda iniziale
        setupWaveChannel(waves[0]);
        return () => {
            // Pulizia totale all'uscita dalla pagina
            registeredChannelsRef.current.forEach(id => unregisterChannel(id));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- AZIONI GLOBALI (MASTER) ---
    const handleMasterPlay = async () => {
        if (!isAudioReady) await initAudio();
        // Fa suonare tutte le onde contemporaneamente. Acusticamente, questa È la somma.
        waves.forEach(w => {
            if (w.active) playNote(w.id, w.frequency, 1.0);
        });
        setIsPlaying(true);
    };

    const handleMasterStop = () => {
        waves.forEach(w => releaseNote(w.id, w.frequency));
        setIsPlaying(false);
    };

    // --- AZIONI SULLE SINGOLE ONDE ---
    const addWave = () => {
        const newWave: WaveState = {
            id: `wave-${Date.now()}`,
            type: 'sine',
            frequency: 440,
            amplitude: 0.5,
            active: true,
            color: AVAILABLE_COLORS[waves.length % AVAILABLE_COLORS.length]
        };

        setWaves(prev => [...prev, newWave]);
        setupWaveChannel(newWave);

        if (isPlaying) playNote(newWave.id, newWave.frequency, 1.0);
    };

    const removeWave = (id: string) => {
        const wave = waves.find(w => w.id === id);
        if (wave && isPlaying) releaseNote(id, wave.frequency);

        unregisterChannel(id);
        registeredChannelsRef.current.delete(id);
        setWaves(prev => prev.filter(w => w.id !== id));
    };

    const updateWave = (id: string, updates: Partial<WaveState>) => {
        setWaves(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));

        const wave = waves.find(w => w.id === id);
        if (!wave) return;

        // Sincronizzazione Engine in tempo reale
        if (updates.type !== undefined) updateChannelConfig(id, { oscillatorType: updates.type });

        if (updates.amplitude !== undefined || updates.active !== undefined) {
            const isActive = updates.active !== undefined ? updates.active : wave.active;
            const amp = updates.amplitude !== undefined ? updates.amplitude : wave.amplitude;
            updateChannelConfig(id, { volume: isActive ? amp : 0 });
        }

        if (updates.frequency !== undefined) {
            if (isPlaying && wave.active) updateNoteFrequency(id, wave.frequency, updates.frequency);
        }

        if (updates.active !== undefined && isPlaying) {
            if (updates.active) playNote(id, wave.frequency, 1.0);
            else releaseNote(id, wave.frequency);
        }
    };

    const waveformOptions = [
        { value: 'sine', label: 'Sinusoidale' },
        { value: 'square', label: 'Quadrata' },
        { value: 'triangle', label: 'Triangolare' },
        { value: 'sawtooth', label: 'Dente di sega' }
    ];

    // Disegniamo sul canvas SOLO le onde non mutate
    const activeVisualizerWaves: WaveDefinition[] = waves
        .filter(w => w.active)
        .map(w => ({
            id: w.id, label: `Onda`, type: w.type, frequency: w.frequency, amplitude: w.amplitude, color: w.color
        }));

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div className={styles.titleRow}>
                    <MdGraphicEq className={styles.titleIcon} />
                    <h2 className={styles.title}>Laboratorio Sintesi Additiva</h2>
                </div>
                <p className={styles.description}>
                    Aggiungi onde, modifica le frequenze singolarmente e scopri come l'interferenza crea timbri complessi.
                    Il suono che ascolti è esattamente la somma matematica calcolata nel visualizzatore.
                </p>
            </div>

            <div className={styles.visualizerSection}>
                <WaveformVisualizer
                    title="Onda Risultante"
                    titleColor="orange"
                    waves={activeVisualizerWaves}
                    showToggles={false}
                    showSumWave={true}
                    sumWaveColor="orange"
                    style={{ height: '100%' }}
                />
            </div>

            <div className={styles.masterControls}>
                <div className={styles.masterInfo}>
                    <h3 className={styles.masterTitle}>Master Control</h3>
                    <p className={styles.masterDesc}>Premi Play per ascoltare l'onda complessa generata dalla somma acustica delle sorgenti attive.</p>
                </div>
                <div className={styles.actionButtons}>
                    <Button color="green" variant={isPlaying ? 'active' : 'default'} onClick={handleMasterPlay} disabled={isPlaying} icon={<MdPlayArrow />} className={styles.actionBtn}>
                        Play Sum
                    </Button>
                    <Button color="red" variant={!isPlaying ? 'active' : 'default'} onClick={handleMasterStop} disabled={!isPlaying} icon={<MdStop />} className={styles.actionBtn}>
                        Release
                    </Button>
                </div>
            </div>

            <div className={styles.wavesHeaderRow}>
                <h3 className={styles.wavesTitle}>Sorgenti Sonore</h3>
                <Button color="cyan" variant="default" icon={<MdAdd />} onClick={addWave}>
                    Aggiungi Onda
                </Button>
            </div>

            <div className={styles.wavesGrid}>
                {waves.map((wave, index) => (
                    <Card key={wave.id} elevation={2} className={clsx(styles.waveCard, !wave.active && styles.waveCardMuted)}>
                        <Card.Header>
                            <div className={styles.waveCardHeader}>
                                <div className={styles.waveTitleGroup} style={{ color: `var(--${wave.color}-400)` }}>
                                    <span className={styles.colorDot} style={{ backgroundColor: `var(--${wave.color}-500)` }}></span>
                                    Onda {index + 1}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button color={wave.color} variant={wave.active ? 'active' : 'default'} icon={wave.active ? <MdVolumeUp /> : <MdVolumeOff />} onClick={() => updateWave(wave.id, { active: !wave.active })} style={{ padding: '6px' }} />
                                    {waves.length > 1 && (
                                        <Button color="red" variant="default" icon={<MdDelete />} onClick={() => removeWave(wave.id)} style={{ padding: '6px' }} />
                                    )}
                                </div>
                            </div>
                        </Card.Header>

                        <Card.Body className={styles.waveControls}>
                            <div className={styles.controlGroup}>
                                <label className={styles.controlLabel}><MdWaves className={styles.controlIcon}/> Forma d'Onda:</label>
                                <Select options={waveformOptions} value={wave.type} onChange={(e) => updateWave(wave.id, { type: e.target.value as OscillatorType })} color={wave.color} icon={<MdWaves />} />
                            </div>

                            <div className={styles.controlGroup}>
                                <label className={styles.controlLabel}>
                                    <MdMusicNote className={styles.controlIcon}/> Frequenza:
                                    <span className={styles.valBadge} style={{ color: `var(--${wave.color}-400)` }}>{wave.frequency} Hz</span>
                                </label>
                                <Slider min={100} max={1000} value={wave.frequency} onChange={(val) => updateWave(wave.id, { frequency: val })} leftLabel="Grave" rightLabel="Acuto" color={wave.color} />
                            </div>

                            <div className={styles.controlGroup}>
                                <label className={clsx(styles.controlLabel, styles.mutedLabel)}>Note Reference:</label>
                                <div className={styles.buttonGrid}>
                                    {commonNotes.map((n, idx) => (
                                        <Button key={n.note + '_' + idx} color={wave.color} variant={wave.frequency === n.frequency ? 'active' : 'default'} onClick={() => updateWave(wave.id, { frequency: n.frequency })}>
                                            {getItalianNoteName(n.note)}{n.alteration}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.controlGroup}>
                                <label className={styles.controlLabel}>
                                    <MdVolumeUp className={styles.controlIcon}/> Ampiezza (Volume):
                                    <span className={styles.valBadge} style={{ color: `var(--${wave.color}-400)` }}>{Math.round(wave.amplitude * 100)}%</span>
                                </label>
                                <Slider min={0} max={1} step={0.01} value={wave.amplitude} onChange={(val) => updateWave(wave.id, { amplitude: val })} leftLabel="Min" rightLabel="Max" color={wave.color} />
                            </div>
                        </Card.Body>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default WaveSumPage;