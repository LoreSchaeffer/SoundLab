import styles from "./PlaygroundPage.module.css";
import {useEffect, useState} from "react";
import {useSynth} from "../contexts/SynthContext.ts";
import Card from "../components/elements/Card.tsx";
import {MdPlayArrow, MdShowChart, MdStop, MdTune} from "react-icons/md";
import Button from "../components/elements/Button.tsx";
import {createDefaultInstrument} from "../utils/audio.ts";
import WaveformVisualizer, {type WaveDefinition} from "../components/widgets/WaveformVisualizer.tsx";
import {usePreset} from "../contexts/PresetContext.ts";
import clsx from "clsx";
import {useTranslation} from "react-i18next";
import WaveformConfiguration from "../components/forms/WaveformConfiguration.tsx";
import {generateBezierArray, generateMSEGArray} from "../utils/curves.ts";

const PLAYGROUND_CHANNEL_ID = 'playground-synth';

const PlaygroundPage = () => {
    const {t} = useTranslation();
    const {registerChannel, unregisterChannel, updateChannelConfig, playNote, releaseNote, updateNoteFrequency} = useSynth();
    const {presets} = usePreset();

    const [frequency, setFrequency] = useState(440);
    const [amplitude, setAmplitude] = useState(0.5);
    const [phase, setPhase] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const [selectedPresetId, setSelectedPresetId] = useState<string>('sine');
    const [oscillatorType, setOscillatorType] = useState<OscillatorType>('sine');
    const [partials, setPartials] = useState<number[]>(presets[0]?.partials || [1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const [customRatios, setCustomRatios] = useState<{ratio: number; amplitude: number}[] | undefined>(presets[0]?.customRatios);

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

    const handlePresetChange = (presetId: string) => {
        setSelectedPresetId(presetId);
        const preset = presets.find(p => p.id === presetId);

        if (preset) {
            const newType = preset.oscillatorType || 'custom';
            setPartials(preset.partials);
            setCustomRatios(preset.customRatios);
            setOscillatorType(newType);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getCurve = (data: any, start: number, end: number) => {
                if (!data) return undefined;
                return data.isAdvanced && data.points
                    ? generateMSEGArray(data.points)
                    : (data.handle1 && data.handle2 ? generateBezierArray(start, end, data.handle1, data.handle2) : undefined);
            };

            updateChannelConfig(PLAYGROUND_CHANNEL_ID, {
                oscillatorType: newType,
                partials: preset.partials,
                envelope: preset.attack ? {
                    attack: Math.max(0.001, preset.attack.time / 1000),
                    decay: Math.max(0.001, preset.decay.time / 1000),
                    sustain: 0,
                    release: Math.max(0.001, preset.release.time / 1000),
                    attackCurve: getCurve(preset.attack, 0.0, 1.0),
                    decayCurve: getCurve(preset.decay, 1.0, 0.0),
                    releaseCurve: getCurve(preset.release, 1.0, 0.0)
                } : undefined,
                customRatios: preset.customRatios,
                lfo: preset.lfo,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                noiseLayer: preset.noiseLayer as any,
                keyTracking: preset.keyTracking,
                filter: preset.filter ? {
                    type: preset.filter.type,
                    cutoff: preset.filter.cutoff,
                    envelopeAmount: preset.filter.envelopeAmount,
                    velocitySensitivity: preset.filter.velocitySensitivity,
                    attack: Math.max(0.001, preset.filter.attack.time / 1000),
                    decay: Math.max(0.001, preset.filter.decay.time / 1000),
                    attackCurve: getCurve(preset.filter.attack, 0.0, 1.0),
                    decayCurve: getCurve(preset.filter.decay, 1.0, 0.0)
                } : undefined
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

    const handlePhaseChange = (newPhase: number) => {
        setPhase(newPhase);
        updateChannelConfig(PLAYGROUND_CHANNEL_ID, {phase: newPhase});
    }

    const handlePlay = async () => {
        playNote(PLAYGROUND_CHANNEL_ID, frequency, 1.0);
        setIsPlaying(true);
    };

    const handleStop = () => {
        releaseNote(PLAYGROUND_CHANNEL_ID, frequency);
        setIsPlaying(false);
    };

    const currentWaves: WaveDefinition[] = [
        {
            id: 'wave',
            label: presets.find(p => p.id === selectedPresetId)?.name || t('common.custom_wave'),
            type: oscillatorType,
            frequency: frequency,
            amplitude: amplitude,
            phase: phase,
            color: 'yellow',
            partials: partials,
            customRatios: customRatios
        }
    ]

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div className={styles.titleRow}>
                    <MdShowChart className={styles.titleIcon}/>
                    <h2 className={styles.title}>{t('playground.title')}</h2>
                </div>
                <p className={styles.description}>{t('playground.description')}</p>
            </div>

            <div className={styles.layout}>
                <div className={styles.visualizerCol}>
                    <WaveformVisualizer waves={currentWaves} height={300}/>
                </div>

                <div className={styles.controlsCol}>
                    <Card elevation={4} className={styles.controlsCard}>
                        <Card.Header>
                            <h3 className={clsx(styles.cardHeader, styles.controlsHeader)}><MdTune/>{t('playground.controls')}</h3>
                        </Card.Header>

                        <Card.Body className={styles.controlsBody}>
                            <WaveformConfiguration
                                color="cyan"
                                presetId={selectedPresetId}
                                onPresetChange={handlePresetChange}
                                frequency={frequency}
                                onFrequencyChange={handleFrequencyChange}
                                amplitude={amplitude}
                                onAmplitudeChange={handleAmplitudeChange}
                                phase={phase}
                                onPhaseChange={handlePhaseChange}
                            />

                            <div className={styles.actionButtons}>
                                <Button
                                    className={styles.actionBtn}
                                    color="green"
                                    variant={isPlaying ? 'active' : 'default'}
                                    icon={<MdPlayArrow/>}
                                    disabled={isPlaying}
                                    onClick={handlePlay}
                                >
                                    {t('common.play')}
                                </Button>
                                <Button
                                    className={styles.actionBtn}
                                    color="red"
                                    variant={!isPlaying ? 'active' : 'default'}
                                    icon={<MdStop/>}
                                    disabled={!isPlaying}
                                    onClick={handleStop}
                                >
                                    {t('common.stop')}
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