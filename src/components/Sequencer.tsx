import styles from './Sequencer.module.css';
import {type Dispatch, forwardRef, Fragment, type RefObject, type SetStateAction, useEffect, useImperativeHandle, useRef, useState, MouseEvent} from "react";
import {useTranslation} from "react-i18next";
import {type Color, colors} from "../utils/colors.ts";
import {Button, ButtonGroup, Card, Form} from "react-bootstrap";
import {type WaveformType, waveformTypes} from "../utils/waveform.ts";
import {debounce} from "lodash";
import {PolySynth} from "tone";
import * as Tone from "tone";
import {type Note, notes, sameNote} from "../utils/music.ts";
import {ImageButton} from "./ImageButton.tsx";

export type SequencerProps = {
    number: number;
    tempo: number;
    color?: Color;
    onPlay?: () => void;
    onStop?: () => void;
    onDelete?: () => void;
    onChange?: (waveform: WaveformType, amplitude: number, cols: number, sequence: Record<number, Note[]>) => void;
}

export type SequencerRef = {
    getColor: () => Color;
    play: () => void;
    stop: () => void;
    changeTempo: (tempo: number) => void;
    setExternalManaged: (isManaged: boolean) => void;
    setData: (waveform: WaveformType, amplitude: number, cols: number, sequence: Record<number, Note[]>) => void;
    getData: () => {waveform: WaveformType, amplitude: number, cols: number, sequence: Record<number, Note[]>};
}

export const Sequencer = forwardRef<SequencerRef, SequencerProps>(
    (props, ref) => {
        const {
            number,
            tempo,
            color = colors.blue,
            onPlay,
            onStop,
            onDelete,
            onChange
        } = props;

        const {t} = useTranslation();

        const [currentTempo, setCurrentTempo] = useState(Math.max(1, Math.min(tempo, 200)));
        const [waveform, setWaveform] = useState(waveformTypes[0]);
        const [amplitude, setAmplitude] = useState(0.5);
        const [isPlaying, setIsPlaying] = useState(false);
        const [cols, setCols] = useState(16);
        const [sequence, setSequence] = useState<Record<number, Note[]>>({});
        const [selectedCol, setSelectedCol] = useState<number | null>(null);
        const [isManaged, setIsManaged] = useState(false);

        const synthRef = useRef<PolySynth | null>(null);
        const loopIdRef = useRef<number | null>(null);
        const stepIndexRef = useRef(0);
        const sequenceRef = useRef(sequence);

        const debouncedSetAmplitude = useRef(
            debounce((value: number, isPlaying: boolean, synthRef: RefObject<PolySynth | null>, setAmplitude: Dispatch<SetStateAction<number>>) => {
                setAmplitude(value);
                if (synthRef.current && isPlaying) {
                    synthRef.current.volume.value = Tone.gainToDb(value);
                }
            }, 1)
        ).current;

        useEffect(() => {
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: {type: waveform},
                volume: Tone.gainToDb(amplitude)
            }).toDestination();

            synthRef.current = synth;

            return () => {
                synth.dispose();
                synthRef.current = null;
            };
        }, [waveform, amplitude]);

        useEffect(() => {
            if (isPlaying && onPlay) onPlay();
            else if (!isPlaying && onStop) onStop();
        }, [isPlaying, onPlay, onStop]);

        useEffect(() => {
            sequenceRef.current = sequence;
        }, [sequence]);

        useEffect(() => {
            if (!onChange || Object.keys(sequence).length === 0) return;
            onChange(waveform, amplitude, cols, sequence);
        }, [onChange, waveform, amplitude, cols, sequence])

        const getStepDuration = (bpm: number) => 60 / bpm / 4;

        const startLoop = () => {
            if (loopIdRef.current) clearInterval(loopIdRef.current);

            const stepDuration = getStepDuration(currentTempo) * 1000;
            stepIndexRef.current = 0;

            loopIdRef.current = window.setInterval(() => {
                const colIdx = stepIndexRef.current % cols;
                const notes = sequenceRef.current[colIdx] || [];

                if (synthRef.current) {
                    synthRef.current.releaseAll();
                }

                if (notes.length > 0) {
                    synthRef.current?.triggerAttackRelease(
                        notes.map((n) => n.frequency),
                        stepDuration / 1000
                    );
                }

                setSelectedCol(colIdx);
                stepIndexRef.current = (stepIndexRef.current + 1) % cols;
            }, stepDuration);
        };

        const handlePlay = () => {
            if (!synthRef.current) return;
            Tone.start();

            if (!isPlaying) {
                setIsPlaying(true);
                startLoop();
            }
        };

        const handleStop = () => {
            setIsPlaying(false);
            if (loopIdRef.current) {
                clearInterval(loopIdRef.current);
                loopIdRef.current = null;
            }
            setSelectedCol(null);
        };

        const handleMouseEnterCell = (e: MouseEvent<HTMLDivElement>, note: Note, idx: number) => {
            if (e.target.classList.contains(styles.cellDisabled)) return;
            const isActive = (sequence[idx] || []).some(n => sameNote(n, note));
            if (isActive) {
                e.target.style.backgroundColor = color.border;
            } else {
                e.target.style.backgroundColor = color.header;
            }
        };

        const handleMouseLeaveCell = (e: MouseEvent<HTMLDivElement>, note: Note, idx: number) => {
            if (e.target.classList.contains(styles.cellDisabled)) return;
            const isActive = (sequence[idx] || []).some(n => sameNote(n, note));
            if (isActive) {
                e.target.style.backgroundColor = color.line;
            } else {
                e.target.style.backgroundColor = '';
            }
        };

        const handleCellClick = (e: MouseEvent<HTMLDivElement>, note: Note, idx: number) => {
            if (e.target.classList.contains(styles.cellDisabled)) return;
            setSequence(prev => {
                const newSequence = {...prev};
                const notes = [...(newSequence[idx] || [])];
                const noteIndex = notes.findIndex(n => sameNote(n, note));
                if (noteIndex > -1) {
                    notes.splice(noteIndex, 1);
                    if (notes.length > 0) {
                        newSequence[idx] = notes;
                    } else {
                        delete newSequence[idx];
                    }
                } else {
                    notes.push(note);
                    newSequence[idx] = notes;
                }
                return newSequence;
            });
        };

        const handleMouseEnterHeader = (e: MouseEvent<HTMLDivElement>) => {
            e.target.style.backgroundColor = color.header;
            e.target.style.color = color.text;
        };

        const handleMouseLeaveHeader = (e: MouseEvent<HTMLDivElement>) => {
            e.target.style.backgroundColor = '';
            e.target.style.color = '';
        };

        const handleHeaderClick = (idx: number) => {
            if (idx === cols) {
                setCols(prev => prev + 1);
            } else {
                setSequence(prev => {
                    const newSequence: Record<number, Note[]> = {};
                    Object.keys(prev).forEach(key => {
                        const colIdx = parseInt(key);
                        if (colIdx < idx) {
                            newSequence[colIdx] = prev[colIdx];
                        } else if (colIdx > idx) {
                            newSequence[colIdx - 1] = prev[colIdx];
                        }
                    });
                    return newSequence;
                });

                setSelectedCol(null);
                setCols(prev => Math.max(prev - 1, 1));
            }
        };

        useImperativeHandle(ref, () => ({
            getColor: () => color,
            play: handlePlay,
            stop: handleStop,
            changeTempo: (newTempo: number) => {
                const safeTempo = Math.max(1, Math.min(newTempo, 200));
                setCurrentTempo(safeTempo);
                // TODO Change tempo
            },
            setExternalManaged: (isManaged: boolean) => setIsManaged(isManaged),
            getData: () => ({
                waveform,
                amplitude,
                cols,
                sequence
            }),
            setData: (newWaveform: WaveformType, newAmplitude: number, newCols: number, newSequence: Record<number, Note[]>) => {
                setWaveform(newWaveform);
                setAmplitude(newAmplitude);
                setCols(newCols);
                setSequence(newSequence);

                if (synthRef.current) {
                    synthRef.current.set({
                        oscillator: {type: newWaveform},
                        volume: Tone.gainToDb(newAmplitude)
                    });
                }
            }
        }));

        const colHeaders = Array.from({length: cols}, (_, i) => '' + (i + 1));
        colHeaders.push('+');

        return (
            <Card className={'shadow-sm'} style={{borderColor: color.border}}>
                <Card.Header style={{backgroundColor: color.header, color: color.text, position: 'relative'}} className={'d-flex gap-5'}>
                    <div className={'d-flex align-items-center gap-2'}>
                        <img className={'card-header-icon'} src={'/images/icons/music_notes.png'} alt={'Sequencer'}/>
                        <h3 className={'alternative-font'}>{t('mixer.oscillator_title') + ` ${number}`}</h3>
                    </div>

                    <div className={'d-flex flex-column align-items-center'}>
                        <Form.Label className={'fw-bold'}>{t('sequencer.wave_type_label')}</Form.Label>
                        <ButtonGroup className={'d-flex flex-wrap gap-2'}>
                            {waveformTypes.map((type) =>
                                <Button
                                    key={type}
                                    variant={waveform === type ? 'primary' : 'outline-primary'}
                                    onClick={() => setWaveform(type)}
                                    className={styles.formBtn + ' flex-grow-1 mb-2 btn-sm'}
                                    size={'lg'}
                                >
                                    {t(`waveforms.${type}`)}
                                </Button>
                            )}
                        </ButtonGroup>
                    </div>

                    <div className={styles.amplitudeContainer + ' d-flex flex-column align-items-center'}>
                        <Form.Label className={'fw-bold'}>{t('sequencer.amplitude_label')}</Form.Label>
                        <Form.Range
                            min={0}
                            max={1}
                            step={0.01}
                            value={amplitude}
                            onChange={(e) => debouncedSetAmplitude(Number(e.target.value), isPlaying, synthRef, setAmplitude)}
                            className={'fs-6'}
                        />
                        <div className="d-flex justify-content-between text-muted">
                            <small>{t('sequencer.low_volume')}</small>
                            <small>{t('sequencer.high_volume')}</small>
                        </div>
                    </div>

                    <ImageButton
                        src={`/images/icons/${isPlaying ? 'stop' : 'play'}.png`}
                        alt={isPlaying ? 'Play' : 'Stop'}
                        onclick={isPlaying ? handleStop : handlePlay}
                        disabled={isManaged}
                        className={styles.playBtn}
                    />

                    {onDelete && (
                        <button className={styles.closeBtn} onClick={onDelete} aria-label={t('delete_oscillator')} style={{color: color.text}}>
                            &times;
                        </button>
                    )}
                </Card.Header>
                <Card.Body>
                    <div className={`${styles.sequenceWrapper}`}>
                        <div className={styles.sequenceContainer} style={{gridTemplateColumns: `50px repeat(${cols + 1}, 25px)`,}}>
                            <div className={styles.sequenceHeader}></div>

                            {colHeaders.map((col, colIdx) => (
                                <div
                                    key={`col-${colIdx}`}
                                    className={`${styles.colHeader} ${colIdx === colHeaders.length - 1 ? styles.lastColHeader : ''} ${colIdx === selectedCol ? styles.selectedColHeader : ''}`}
                                    style={{borderColor: color.border}}
                                    onMouseEnter={handleMouseEnterHeader}
                                    onMouseLeave={handleMouseLeaveHeader}
                                    onClick={() => handleHeaderClick(colIdx)}
                                >
                                    {col}
                                </div>
                            ))}

                            {notes.map((note, rowIdx) => (
                                <Fragment key={`row-${rowIdx}`}>
                                    <div
                                        className={`${styles.rowHeader} ${note.alteration === '' ? styles.whiteRow : styles.blackRow} ${rowIdx === notes.length - 1 ? styles.lastRowHeader : ''}`}
                                        style={{borderColor: color.border}}
                                    >
                                        {t(`notes.${note.note}`) + `${note.alteration}${note.octave}`}
                                    </div>

                                    {colHeaders.map((col, colIdx) => (
                                        <div
                                            key={`cell-${rowIdx}-${colIdx}`}
                                            className={`${styles.cell} ${colIdx === 0 ? styles.firstColCell : ''} ${colIdx === colHeaders.length - 1 ? styles.cellDisabled : ''} ${selectedCol === colIdx ? styles.selectedCell : ''} ${rowIdx === notes.length - 1 ? styles.lastRowCell : ''}`}
                                            style={{
                                                backgroundColor: (sequence[colIdx] || []).find(n => sameNote(note, n)) ? color.line : '',
                                            }}
                                            onMouseEnter={e => handleMouseEnterCell(e, note, colIdx)}
                                            onMouseLeave={e => handleMouseLeaveCell(e, note, colIdx)}
                                            onClick={e => handleCellClick(e, note, colIdx)}
                                        ></div>
                                    ))}
                                </Fragment>
                            ))}
                        </div>
                        {selectedCol &&
                            <div
                                className={styles.selector}
                                style={{
                                    left: (50 + selectedCol * 25) + 'px',
                                    height: ((notes.length + 1) * 15 + 4) + 'px',
                                    backgroundColor: color.header + '80',
                                    borderColor: color.line
                                }}
                            ></div>
                        }
                    </div>
                </Card.Body>
            </Card>
        )
    }
);