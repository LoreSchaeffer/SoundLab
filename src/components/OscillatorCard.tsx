import styles from "./OscillatorCard.module.css";
import {Button, ButtonGroup, Card, Form} from "react-bootstrap";
import {type WaveformType, waveformTypes} from "../utils/waveform.ts";
import {useTranslation} from "react-i18next";
import {type Dispatch, forwardRef, type RefObject, type SetStateAction, useEffect, useImperativeHandle, useRef, useState} from "react";
import * as Tone from 'tone';
import {Oscillator} from 'tone';
import {debounce} from "lodash";
import {commonNotes} from "../utils/music.ts";
import {type Color, colors} from "../utils/colors.ts";

export type OscillatorCardProps = {
    number: number;
    color?: Color;
    onWaveformChange?: (type: WaveformType) => void;
    onFrequencyChange?: (frequency: number) => void;
    onAmplitudeChange?: (amplitude: number) => void;
    onPlay?: () => void;
    onStop?: () => void;
    onDelete?: () => void;
}

export type OscillatorCardRef = {
    handlePlay: () => void;
    handleStop: () => void;
    getWaveform: () => WaveformType;
    getFrequency: () => number;
    getAmplitude: () => number;
    isPlaying: () => boolean;
    getColor: () => Color;
    play: () => void;
    stop: () => void;
}

export const OscillatorCard = forwardRef<OscillatorCardRef, OscillatorCardProps>(
    (props, ref) => {
        const {
            number,
            color = colors.blue,
            onWaveformChange,
            onFrequencyChange,
            onAmplitudeChange,
            onPlay,
            onStop,
            onDelete
        } = props;

        const {t} = useTranslation();
        const [waveform, setWaveform] = useState<WaveformType>('sine');
        const [frequency, setFrequency] = useState(440);
        const [amplitude, setAmplitude] = useState(0.1);
        const [isPlaying, setIsPlaying] = useState(false);

        const oscillatorRef = useRef<Oscillator | null>(null);
        const debouncedSetFrequency = useRef(
            debounce((value: number, isPlaying: boolean, oscillatorRef: RefObject<Oscillator | null>, setFrequency: Dispatch<SetStateAction<number>>) => {
                setFrequency(value);
                if (oscillatorRef.current && isPlaying) {
                    oscillatorRef.current.frequency.value = value;
                }
            }, 1)
        ).current;
        const debouncedSetAmplitude = useRef(
            debounce((value: number, isPlaying: boolean, oscillatorRef: RefObject<Oscillator | null>, setAmplitude: Dispatch<SetStateAction<number>>) => {
                setAmplitude(value);
                if (oscillatorRef.current && isPlaying) {
                    oscillatorRef.current.volume.value = Tone.gainToDb(value);
                }
            }, 1)
        ).current;

        useEffect(() => {
            return () => {
                if (oscillatorRef.current) oscillatorRef.current.dispose();
            }
        }, []);

        useEffect(() => {
            if (onWaveformChange) onWaveformChange(waveform);
        }, [waveform, onWaveformChange]);

        useEffect(() => {
            if (onFrequencyChange) onFrequencyChange(frequency);
        }, [frequency, onFrequencyChange]);

        useEffect(() => {
            if (onAmplitudeChange) onAmplitudeChange(amplitude);
        }, [amplitude, onAmplitudeChange]);

        useEffect(() => {
            if (isPlaying && onPlay) onPlay();
            else if (!isPlaying && onStop) onStop();
        }, [isPlaying, onPlay, onStop]);

        const updateWaveform = (type: WaveformType) => {
            setWaveform(type);
            if (oscillatorRef.current) {
                oscillatorRef.current.type = type;
            }
        };

        const handlePlay = () => {
            if (oscillatorRef.current) {
                oscillatorRef.current.start();
            } else {
                oscillatorRef.current = new Oscillator({
                    type: waveform,
                    frequency: frequency,
                    volume: Tone.gainToDb(amplitude)
                }).toDestination();
                oscillatorRef.current.start();
            }
            setIsPlaying(true);
        };

        const handleStop = () => {
            if (oscillatorRef.current) {
                oscillatorRef.current.stop();
                oscillatorRef.current.dispose();
                oscillatorRef.current = null;
            }
            setIsPlaying(false);
        };

        useImperativeHandle(ref, () => ({
            handlePlay: handlePlay,
            handleStop: handleStop,
            getWaveform: () => waveform,
            getFrequency: () => frequency,
            getAmplitude: () => amplitude,
            isPlaying: () => isPlaying,
            getColor: () => color,
            play: handlePlay,
            stop: handleStop
        }));

        return (
            <Card className={'shadow-sm h-100'} style={{borderColor: color.border}}>
                <Card.Header style={{backgroundColor: color.header, color: color.text, position: 'relative'}}>
                    <img className={'card-header-icon'} src={'/images/icons/tune.png'} alt={t('alt.oscillator_settings')}/>
                    <h3 className={'alternative-font'}>{t('mixer.oscillator_title') + ` ${number}`}</h3>

                    {onDelete && (
                        <button className={styles.closeBtn} onClick={onDelete} aria-label={t('delete_oscillator')} style={{color: color.text}}>
                            &times;
                        </button>
                    )}
                </Card.Header>
                <Card.Body>
                    <div className={'mb-4'}>
                        <Form.Label className={'fs-5 fw-bold'}>
                            <img src={'/images/icons/shapes.png'} alt={t('alt.oscillator_waveform')} className={styles.labelIcon}/>
                            {t('playground.controls.wave_type_label')}
                        </Form.Label>
                        <ButtonGroup className={'d-flex flex-wrap gap-2'}>
                            {waveformTypes.map((type) =>
                                <Button
                                    key={type}
                                    variant={waveform === type ? 'primary' : 'outline-primary'}
                                    onClick={() => updateWaveform(type)}
                                    className={styles.formBtn + ' flex-grow-1 mb-2'}
                                    size={'lg'}
                                >
                                    {t(`waveforms.${type}`)}
                                </Button>
                            )}
                        </ButtonGroup>
                    </div>

                    <div className={'mb-4'}>
                        <Form.Label className={'fs-5 fw-bold'}>
                            <img src={'/images/icons/music_notes.png'} alt={t('oscillator_frequency')} className={styles.labelIcon}/>
                            {t('playground.controls.frequency_label') + ` ${frequency} Hz`}
                        </Form.Label>
                        <Form.Range
                            min={100}
                            max={1000}
                            value={frequency}
                            onChange={(e) => debouncedSetFrequency(Number(e.target.value), isPlaying, oscillatorRef, setFrequency)}
                            className={'fs-6'}
                        />
                        <div className="d-flex justify-content-between text-muted">
                            <small>{t('playground.controls.low_pitch')}</small>
                            <small>{t('playground.controls.high_pitch')}</small>
                        </div>

                        <Form.Label className={'fs-5 fw-bold mt-3'}>
                            <img src={'/images/icons/music_note.png'} alt={t('alt.oscillator_notes')} className={styles.labelIcon}/>
                            {t('playground.controls.common_notes')}
                        </Form.Label>

                        <ButtonGroup className={'d-flex flex-wrap gap-2'}>
                            {commonNotes.map((note, idx) =>
                                <Button
                                    key={note.note + '_' + idx}
                                    variant={frequency === note.frequency ? 'primary' : 'outline-primary'}
                                    onClick={() => debouncedSetFrequency(note.frequency, isPlaying, oscillatorRef, setFrequency)}
                                    className={styles.formBtn + ' flex-grow-1 mb-2'}
                                    size={'lg'}
                                >
                                    {t(`notes.${note.note}`) + note.alteration}
                                </Button>
                            )}
                        </ButtonGroup>
                    </div>

                    <div className={'mb-4'}>
                        <Form.Label className={'fs-5 fw-bold'}>
                            <img src={'/images/icons/audio.png'} alt={t('alt.oscillator_amplitude')} className={styles.labelIcon}/>
                            {t('playground.controls.amplitude_label') + ` ${Math.round(amplitude * 100)} %`}
                        </Form.Label>
                        <Form.Range
                            min={0}
                            max={1}
                            step={0.01}
                            value={amplitude}
                            onChange={(e) => debouncedSetAmplitude(Number(e.target.value), isPlaying, oscillatorRef, setAmplitude)}
                            className={'fs-6'}
                        />
                        <div className="d-flex justify-content-between text-muted">
                            <small>{t('playground.controls.low_volume')}</small>
                            <small>{t('playground.controls.high_volume')}</small>
                        </div>
                    </div>

                    <div className={'d-flex gap-2'}>
                        <Button
                            variant="success"
                            size="lg"
                            onClick={handlePlay}
                            disabled={isPlaying}
                            className={styles.formBtn + ' fw-bold fs-4 flex-fill'}
                        >
                            <img src={'/images/icons/play.png'} alt={t('alt.play')} className={styles.labelIcon}/>
                            Play
                        </Button>
                        <Button
                            variant="danger"
                            size="lg"
                            onClick={handleStop}
                            disabled={!isPlaying}
                            className={styles.formBtn + ' fw-bold fs-4 flex-fill'}
                        >
                            <img src={'/images/icons/stop.png'} alt={t('alt.stop')} className={styles.labelIcon}/>
                            Stop
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        )
    });