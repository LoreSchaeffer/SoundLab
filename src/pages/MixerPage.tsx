import styles from "./MixerPage.module.css";
import {useSynth} from "../contexts/SynthContext";
import {type Color, colors} from "../types";
import {useEffect, useRef, useState} from "react";
import {createDefaultInstrument} from "../utils/audio.ts";
import WaveformVisualizer, {type WaveDefinition} from "../components/widgets/WaveformVisualizer.tsx";
import {MdAdd, MdDelete, MdGraphicEq, MdPlayArrow, MdStop, MdVolumeOff, MdVolumeUp} from "react-icons/md";
import Button from "../components/elements/Button.tsx";
import Card from "../components/elements/Card.tsx";
import clsx from "clsx";
import {useTranslation} from "react-i18next";
import {usePreset} from "../contexts/PresetContext.ts";
import WaveformConfiguration from "../components/forms/WaveformConfiguration.tsx";
import {now} from "tone";

type WaveState = {
    id: string;
    presetId: string;
    type: OscillatorType;
    partials: number[];
    frequency: number;
    amplitude: number;
    phase: number;
    active: boolean;
    color: Color;
};

const MixerPage = () => {
    const {t} = useTranslation();
    const {registerChannel, unregisterChannel, updateChannelConfig, playNote, releaseNote, updateNoteFrequency} = useSynth();
    const {presets} = usePreset();

    const [isPlaying, setIsPlaying] = useState(false);

    const [waves, setWaves] = useState<WaveState[]>([{
        id: `wave-${Date.now()}`,
        presetId: 'sine',
        type: 'sine',
        partials: [],
        frequency: 440,
        amplitude: 0.25,
        phase: 0,
        active: true,
        color: 'cyan'
    }]);

    const registeredChannelsRef = useRef<Set<string>>(new Set());

    const setupWaveChannel = (wave: WaveState) => {
        const config = createDefaultInstrument(wave.id, `SumWave`);
        config.envelope = {attack: 0.05, decay: 0.0, sustain: 1.0, release: 0.1};
        config.oscillatorType = wave.type;
        config.partials = wave.partials;
        config.volume = wave.active ? wave.amplitude : 0;

        registerChannel(config);
        registeredChannelsRef.current.add(wave.id);
    };

    useEffect(() => {
        setupWaveChannel(waves[0]);

        const currentChannels = registeredChannelsRef.current;

        return () => {
            currentChannels.forEach(id => unregisterChannel(id));
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleMasterPlay = async () => {
        const syncTime = now() + 0.05;

        waves.forEach(w => {
            if (w.active) playNote(w.id, w.frequency, 1.0, syncTime);
        });

        setIsPlaying(true);
    };

    const handleMasterStop = () => {
        waves.forEach(w => releaseNote(w.id, w.frequency));

        setIsPlaying(false);
    };

    const addWave = () => {
        const newWave: WaveState = {
            id: `wave-${Date.now()}`,
            presetId: 'sine',
            type: 'sine',
            partials: [],
            frequency: 440,
            amplitude: 0.25,
            phase: 0,
            active: true,
            color: colors[waves.length % colors.length]
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
        setWaves(prev => prev.map(w => w.id === id ? {...w, ...updates} : w));

        const wave = waves.find(w => w.id === id);
        if (!wave) return;

        if (updates.type !== undefined || updates.partials !== undefined) {
            updateChannelConfig(id, {
                oscillatorType: updates.type !== undefined ? updates.type : wave.type,
                partials: updates.partials !== undefined ? updates.partials : wave.partials
            });
        }

        if (updates.amplitude !== undefined || updates.active !== undefined) {
            const isActive = updates.active !== undefined ? updates.active : wave.active;
            const amp = updates.amplitude !== undefined ? updates.amplitude : wave.amplitude;
            updateChannelConfig(id, {volume: isActive ? amp : 0});
        }

        if (updates.phase !== undefined) {
            updateChannelConfig(id, {phase: updates.phase});
        }

        if (updates.frequency !== undefined) {
            if (isPlaying && wave.active) updateNoteFrequency(id, wave.frequency, updates.frequency);
        }

        if (updates.active !== undefined && isPlaying) {
            if (updates.active) playNote(id, wave.frequency, 1.0);
            else releaseNote(id, wave.frequency);
        }
    };

    const handlePresetChange = (waveId: string, newPresetId: string) => {
        const preset = presets.find(p => p.id === newPresetId);
        if (preset) {
            updateWave(waveId, {
                presetId: newPresetId,
                type: preset.oscillatorType || 'custom',
                partials: preset.partials
            });
        }
    };

    const activeVisualizerWaves: WaveDefinition[] = waves
        .filter(w => w.active)
        .map(w => ({
            id: w.id,
            label: `Wave`,
            type: w.type,
            frequency: w.frequency,
            amplitude: w.amplitude,
            phase: w.phase,
            color: w.color,
            partials: w.partials,
        }));

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div className={styles.titleRow}>
                    <MdGraphicEq className={styles.titleIcon}/>
                    <h2 className={styles.title}>{t('mixer.title')}</h2>
                </div>
                <p className={styles.description}>{t('mixer.description')}</p>
            </div>

            <div className={styles.visualizerSection}>
                <WaveformVisualizer
                    title={t('components.waveform_viewer.title')}
                    titleColor="orange"
                    waves={activeVisualizerWaves}
                    showToggles={false}
                    showSumWave={true}
                    sumWaveColor="white"
                    style={{height: '100%'}}
                    header={(
                        <div className={styles.actionButtons}>
                            <Button
                                color="green"
                                variant={isPlaying ? 'active' : 'default'}
                                icon={<MdPlayArrow/>}
                                disabled={isPlaying}
                                onClick={handleMasterPlay}
                            >
                                {t('common.play')}
                            </Button>
                            <Button
                                color="red"
                                variant={!isPlaying ? 'active' : 'default'}
                                icon={<MdStop/>}
                                disabled={!isPlaying}
                                onClick={handleMasterStop}
                            >
                                {t('common.stop')}
                            </Button>
                        </div>
                    )}
                />
            </div>

            <div className={styles.wavesHeaderRow}>
                <h3 className={styles.wavesTitle}>{t('mixer.sources')}</h3>
                <Button color="cyan" variant="default" icon={<MdAdd/>} onClick={addWave}>
                    {t('mixer.add_wave')}
                </Button>
            </div>

            <div className={styles.wavesGrid}>
                {waves.map((wave, index) => (
                    <Card key={wave.id} elevation={2} className={clsx(styles.waveCard, !wave.active && styles.waveCardMuted)}>
                        <Card.Header>
                            <div className={styles.waveCardHeader}>
                                <div className={styles.waveTitleGroup} style={{color: `var(--${wave.color}-400)`}}>
                                    <span className={styles.colorDot} style={{backgroundColor: `var(--${wave.color}-500)`}}></span>
                                    {t('common.wave')} {index + 1}
                                </div>
                                <div style={{display: 'flex', gap: '8px'}}>
                                    <Button
                                        className={styles.squareBtn}
                                        color={wave.color}
                                        variant={wave.active ? 'active' : 'default'}
                                        icon={wave.active ? <MdVolumeUp/> : <MdVolumeOff/>}
                                        onClick={() => updateWave(wave.id, {active: !wave.active})}
                                    />
                                    {waves.length > 1 && (
                                        <Button
                                            className={styles.squareBtn}
                                            color="red"
                                            variant="default"
                                            icon={<MdDelete/>}
                                            onClick={() => removeWave(wave.id)}
                                        />
                                    )}
                                </div>
                            </div>
                        </Card.Header>

                        <Card.Body className={styles.waveControls}>
                            <WaveformConfiguration
                                color={wave.color}
                                presetId={wave.presetId}
                                onPresetChange={(id) => handlePresetChange(wave.id, id)}
                                frequency={wave.frequency}
                                onFrequencyChange={(val) => updateWave(wave.id, {frequency: val})}
                                amplitude={wave.amplitude}
                                onAmplitudeChange={(val) => updateWave(wave.id, {amplitude: val})}
                                phase={wave.phase}
                                onPhaseChange={(val) => updateWave(wave.id, {phase: val})}
                            />
                        </Card.Body>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default MixerPage;