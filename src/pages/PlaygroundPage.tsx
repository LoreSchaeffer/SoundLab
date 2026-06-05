import React, {useEffect, useState} from "react";
import styles from "./PlaygroundPage.module.css";
import {useSynth} from "../contexts/SynthContext.ts";
import Card from "../components/elements/Card.tsx";
import {MdMusicNote, MdPlayArrow, MdShowChart, MdStop, MdTune, MdVolumeUp, MdWaves} from "react-icons/md";
import Select from "../components/forms/Select.tsx";
import Button from "../components/elements/Button.tsx";
import {commonNotes} from "../types/music.ts";
import {createDefaultInstrument} from "../utils/audio.ts";
import WaveformVisualizer, {type WaveDefinition} from "../components/widgets/WaveformVisualizer.tsx";

const getItalianNoteName = (noteName: string) => {
    const noteMap: Record<string, string> = {
        'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 'G': 'Sol', 'A': 'La', 'B': 'Si'
    };
    return noteMap[noteName] || noteName;
};

const PLAYGROUND_CHANNEL_ID = 'playground-synth';

const PlaygroundPage = () => {
    // --- STATI LOCALI UI ---
    const [frequency, setFrequency] = useState(440);
    const [amplitude, setAmplitude] = useState(0.8);
    const [isPlaying, setIsPlaying] = useState(false);
    const [oscillatorType, setOscillatorType] = useState<OscillatorType>('sine');

    // Per il playground, usiamo armoniche standard fisse se si seleziona "custom"
    const [partials] = useState<number[]>([1.0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // --- MOTORE AUDIO ---
    const {
        isAudioReady,
        initAudio,
        registerChannel,
        unregisterChannel,
        updateChannelConfig,
        playNote,
        releaseNote,
        updateNoteFrequency,
    } = useSynth();

    useEffect(() => {
        const config = createDefaultInstrument(PLAYGROUND_CHANNEL_ID, 'Playground');

        config.envelope = {attack: 0.05, decay: 0.0, sustain: 1.0, release: 0.1};
        config.oscillatorType = 'sine';
        config.volume = 0.8;

        registerChannel(config);

        return () => {
            unregisterChannel(PLAYGROUND_CHANNEL_ID);
        };
    }, [registerChannel, unregisterChannel]);

    const handleWaveformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const type = e.target.value as OscillatorType;
        setOscillatorType(type);
        updateChannelConfig(PLAYGROUND_CHANNEL_ID, {oscillatorType: type});
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


    const waveformOptions = [
        {value: 'sine', label: 'Sinusoidale'},
        {value: 'square', label: 'Quadrata'},
        {value: 'triangle', label: 'Triangolare'},
        {value: 'sawtooth', label: 'Dente di sega'},
        {value: 'custom', label: 'Preset Custom'}
    ];


    const currentWaves: WaveDefinition[] = [
        {
            id: 'play-wave',
            label: 'Segnale Master',
            type: oscillatorType,
            frequency: frequency,
            amplitude: amplitude,
            color: 'cyan',
            partials: partials
        },
        {
            id: 'play-harmonics',
            label: 'Armoniche',
            type: 'custom',
            frequency: frequency,
            amplitude: amplitude,
            color: 'orange',
            partials: [1.0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
    ];

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
                    <WaveformVisualizer
                        waves={currentWaves}
                        showToggles={true}
                        showSumWave={true}
                    />
                </div>

                <div className={styles.controlsCol}>
                    <Card elevation={4} style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                        <Card.Header>
                            <h3 className={`${styles.cardHeader} ${styles.controlsHeader}`}>
                                <MdTune/> Controlli
                            </h3>
                        </Card.Header>
                        <Card.Body style={{display: 'flex', flexDirection: 'column', flex: 1}}>
                            <div className={styles.controlGroup}>
                                <label className={styles.controlLabel}>
                                    <MdWaves className={styles.controlIcon}/> Tipo Onda:
                                </label>
                                <Select
                                    options={waveformOptions}
                                    value={oscillatorType}
                                    onChange={handleWaveformChange}
                                    color="cyan"
                                    icon={<MdWaves/>}
                                />
                            </div>

                            <div className={styles.controlGroup}>
                                <label className={styles.controlLabel}>
                                    <MdMusicNote className={styles.controlIcon}/> Frequenza:
                                    <span className={styles.valBadge}>{frequency} Hz</span>
                                </label>
                                <div className={styles.sliderWrapper}>
                                    <input
                                        type="range" min={100} max={1000} value={frequency}
                                        onChange={(e) => handleFrequencyChange(Number(e.target.value))}
                                        className={styles.slider}
                                    />
                                    <div className={styles.sliderLabels}><span>Grave</span><span>Acuto</span></div>
                                </div>
                            </div>

                            <div className={styles.controlGroup}>
                                <label className={styles.controlLabel} style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                                    Note Comuni:
                                </label>
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
                                <div className={styles.sliderWrapper}>
                                    <input
                                        type="range" min={0} max={1} step={0.01} value={amplitude}
                                        onChange={(e) => handleAmplitudeChange(Number(e.target.value))}
                                        className={styles.slider}
                                    />
                                    <div className={styles.sliderLabels}><span>Piano</span><span>Forte</span></div>
                                </div>
                            </div>

                            <div className={styles.actionButtons}>
                                <Button
                                    color="green" variant={isPlaying ? 'active' : 'default'}
                                    onClick={handlePlay} disabled={isPlaying}
                                    icon={<MdPlayArrow/>} className={styles.actionBtn}
                                > Play </Button>
                                <Button
                                    color="red" variant={!isPlaying ? 'active' : 'default'}
                                    onClick={handleStop} disabled={!isPlaying}
                                    icon={<MdStop/>} className={styles.actionBtn}
                                > Release </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PlaygroundPage;