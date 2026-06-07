import styles from "./PlaygroundPage.module.css";
import React, {useEffect, useState} from "react";
import {useSynth} from "../contexts/SynthContext.ts";
import Card from "../components/elements/Card.tsx";
import {MdMusicNote, MdPlayArrow, MdShowChart, MdStop, MdTune, MdVolumeUp, MdWaves} from "react-icons/md";
import Select from "../components/forms/Select.tsx";
import Button from "../components/elements/Button.tsx";
import {commonNotes} from "../types/music.ts";
import {createDefaultInstrument} from "../utils/audio.ts";
import WaveformVisualizer, {type WaveDefinition} from "../components/widgets/WaveformVisualizer.tsx";
import {usePreset} from "../contexts/PresetContext.ts";
import Slider from "../components/forms/Slider.tsx";
import clsx from "clsx";

const getItalianNoteName = (noteName: string) => {
    const noteMap: Record<string, string> = {
        'C': 'Do',
        'D': 'Re',
        'E': 'Mi',
        'F': 'Fa',
        'G': 'Sol',
        'A': 'La',
        'B': 'Si'
    };

    return noteMap[noteName] || noteName;
};

const PLAYGROUND_CHANNEL_ID = 'playground-synth';

const PlaygroundPage = () => {
    const {isAudioReady, initAudio, registerChannel, unregisterChannel, updateChannelConfig, playNote, releaseNote, updateNoteFrequency} = useSynth();
    const {presets} = usePreset();

    const [frequency, setFrequency] = useState(440);
    const [amplitude, setAmplitude] = useState(0.5);
    const [isPlaying, setIsPlaying] = useState(false);

    const [selectedPresetId, setSelectedPresetId] = useState<string>(presets[0]?.id || '');
    const [oscillatorType, setOscillatorType] = useState<OscillatorType>(presets[0]?.oscillatorType || 'sine');
    const [partials, setPartials] = useState<number[]>(presets[0]?.partials || [1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    useEffect(() => {
        const config = createDefaultInstrument(PLAYGROUND_CHANNEL_ID, 'Playground');

        config.envelope = {attack: 0.05, decay: 0.0, sustain: 1.0, release: 0.1};
        config.oscillatorType = oscillatorType;
        config.partials = partials;
        config.volume = amplitude;

        registerChannel(config);

        return () => {
            unregisterChannel(PLAYGROUND_CHANNEL_ID);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerChannel, unregisterChannel]);

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const presetId = e.target.value;
        setSelectedPresetId(presetId);

        const preset = presets.find(p => p.id === presetId);

        if (preset) {
            const newType = preset.oscillatorType || 'custom';

            setPartials(preset.partials);
            setOscillatorType(newType);

            updateChannelConfig(PLAYGROUND_CHANNEL_ID, {
                oscillatorType: newType,
                partials: preset.partials
            });
        }
    };

    const handleFrequencyChange = (newFreq: number) => {
        const oldFreq = frequency;
        setFrequency(newFreq);
        if (isPlaying) updateNoteFrequency(PLAYGROUND_CHANNEL_ID, oldFreq, newFreq);
    };

    const handleAmplitudeChange = (newAmp: number) => {
        setAmplitude(newAmp);
        updateChannelConfig(PLAYGROUND_CHANNEL_ID, {volume: newAmp});
    };

    const handlePlay = async () => {
        if (!isAudioReady) await initAudio();
        playNote(PLAYGROUND_CHANNEL_ID, frequency, 1.0);
        setIsPlaying(true);
    };

    const handleStop = () => {
        releaseNote(PLAYGROUND_CHANNEL_ID, frequency);
        setIsPlaying(false);
    };

    const presetOptions = presets.map(p => ({value: p.id, label: p.name}));
    const currentWaves: WaveDefinition[] = [
        {
            id: 'wave',
            label: presets.find(p => p.id === selectedPresetId)?.name || 'Custom',
            type: oscillatorType,
            frequency: frequency,
            amplitude: amplitude,
            color: 'yellow',
            partials: partials
        }
    ]

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div className={styles.titleRow}>
                    <MdShowChart className={styles.titleIcon}/>
                    <h2 className={styles.title}>Visualizzatore Onda</h2>
                </div>
                <p className={styles.description}>Sperimenta con le forme d'onda e i preset, ascoltando il motore multi-canale in azione.</p>
            </div>

            <div className={styles.layout}>
                <div className={styles.visualizerCol}>
                    <WaveformVisualizer waves={currentWaves}/>
                </div>

                <div className={styles.controlsCol}>
                    <Card elevation={4} className={styles.controlsCard}>
                        <Card.Header>
                            <h3 className={clsx(styles.cardHeader, styles.controlsHeader)}><MdTune/> Controlli</h3>
                        </Card.Header>

                        <Card.Body className={styles.controlsBody}>
                            <div className={styles.controlGroup}>
                                <label className={styles.controlLabel}><MdWaves className={styles.controlIcon}/> Tipo Onda:</label>
                                <Select
                                    options={presetOptions}
                                    value={selectedPresetId}
                                    onChange={handlePresetChange}
                                    color="cyan"
                                    icon={<MdWaves/>}
                                />
                            </div>

                            <div className={styles.controlGroup}>
                                <label className={styles.controlLabel}>
                                    <MdMusicNote className={styles.controlIcon}/> Frequenza:
                                    <span className={styles.valBadge}>{frequency} Hz</span>
                                </label>
                                <Slider
                                    min={100}
                                    max={1000}
                                    value={frequency}
                                    onChange={handleFrequencyChange}
                                    leftLabel="Grave"
                                    rightLabel="Acuto"
                                    color="cyan"
                                />
                            </div>

                            <div className={styles.controlGroup}>
                                <label className={clsx(styles.controlLabel, styles.mutedLabel)}>Note Comuni:</label>
                                <div className={styles.buttonGrid}>
                                    {commonNotes.map((n, idx) =>
                                        <Button
                                            key={n.note + '_' + idx} color="cyan"
                                            variant={frequency === n.frequency ? 'active' : 'default'}
                                            onClick={() => handleFrequencyChange(n.frequency)}
                                        >
                                            {getItalianNoteName(n.note)}{n.alteration}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.controlGroup}>
                                <label className={styles.controlLabel}>
                                    <MdVolumeUp className={styles.controlIcon}/> Volume:
                                    <span className={styles.valBadge}>{Math.round(amplitude * 100)}%</span>
                                </label>
                                <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={amplitude}
                                    onChange={handleAmplitudeChange}
                                    leftLabel="Piano"
                                    rightLabel="Forte"
                                    color="cyan"
                                />
                            </div>

                            <div className={styles.actionButtons}>
                                <Button
                                    color="green" variant={isPlaying ? 'active' : 'default'}
                                    onClick={handlePlay} disabled={isPlaying}
                                    icon={<MdPlayArrow/>} className={styles.actionBtn}
                                >
                                    Play
                                </Button>
                                <Button
                                    color="red" variant={!isPlaying ? 'active' : 'default'}
                                    onClick={handleStop} disabled={!isPlaying}
                                    icon={<MdStop/>} className={styles.actionBtn}
                                >
                                    Stop
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PlaygroundPage;