import styles from './Sequencer.module.css';
import {type Dispatch, forwardRef, Fragment, type RefObject, type SetStateAction, useEffect, useImperativeHandle, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {type Color, colors} from "../utils/colors.ts";
import {Button, ButtonGroup, Card, Form} from "react-bootstrap";
import {type WaveformType, waveformTypes} from "../utils/waveform.ts";
import {debounce} from "lodash";
import {PolySynth, Part, Synth, gainToDb} from "tone";
import * as Tone from 'tone';
import {type Note, notes, noteToString, sameNote, sequenceFromString, sequenceToString} from "../utils/music.ts";
import {ImageButton} from "./ImageButton.tsx";
import * as React from "react";
import type {SequencerData} from "../utils/storage.ts";

export type SequencerProps = {
    number: number;
    tempo: number;
    color?: Color;
    onDelete?: () => void;
    onChange?: (data: SequencerData) => void;
}

export type SequencerRef = {
    getColor: () => Color;
    play: () => void;
    stop: () => void;
    changeTempo: (newTempo: number) => void;
    getCols: () => number;
    setMaxCols: (newMaxCols: number | null) => void;
    exportData: () => SequencerData;
    importData: (data: SequencerData) => void;
}

const DURATION = '4n';

export const Sequencer = forwardRef<SequencerRef, SequencerProps>(
    (props, ref) => {
        const {
            number,
            tempo,
            color = colors.blue,
            onDelete,
            onChange
        } = props;

        const {t} = useTranslation();

        const [currentTempo, setCurrentTempo] = useState(Math.max(1, Math.min(tempo, 200)));
        const [waveform, setWaveform] = useState<WaveformType>(waveformTypes[0]);
        const [amplitude, setAmplitude] = useState(0.5);
        const [isPlaying, setIsPlaying] = useState(false);
        const [cols, setCols] = useState(16);
        const [sequence, setSequence] = useState<Record<number, Note[]>>({});
        const [isManaged, setIsManaged] = useState(false);
        const [hoveredCell, setHoveredCell] = useState<{note: Note, col: number} | null>(null);

        const containerRef = useRef<HTMLDivElement>(null);
        const selectorRef = useRef<HTMLDivElement>(null);
        const sequenceRef = useRef<Record<number, Note[]>>(sequence);
        const managedRef = useRef<boolean>(isManaged);
        const maxCols = useRef<number | null>(null);
        const synthRef = useRef<PolySynth>(null);
        const previewSynthRef = useRef<PolySynth>(null);
        const partRef = useRef<Part>(null);
        const schedulesRef = useRef<number[]>([]);

        const debouncedSetAmplitude = useRef(
            debounce((value: number, isPlaying: boolean, synthRef: RefObject<PolySynth | null>, setAmplitude: Dispatch<SetStateAction<number>>) => {
                setAmplitude(value);
                if (synthRef.current && isPlaying) {
                    synthRef.current.volume.value = Tone.gainToDb(value);
                }
            }, 1)
        ).current;

        useEffect(() => {
            synthRef.current = new PolySynth(Synth, {
                oscillator: {type: 'sine'},
                volume: gainToDb(0.5)
            }).toDestination();

            previewSynthRef.current = new PolySynth(Synth, {
                oscillator: {type: 'sine'},
                volume: gainToDb(0.5)
            }).toDestination();

            return () => {
                partRef.current?.stop();
                partRef.current?.dispose();

                Tone.getTransport().stop();
                synthRef.current?.dispose();
                previewSynthRef.current?.dispose();
            }
        }, []);

        useEffect(() => {
            sequenceRef.current = sequence;
        }, [sequence]);

        useEffect(() => {
            Tone.getTransport().bpm.value = currentTempo;
        }, [currentTempo]);

        useEffect(() => {
            if (synthRef.current) {
                synthRef.current.set({
                    oscillator: {type: waveform},
                    volume: Tone.gainToDb(amplitude)
                });
            }

            if (previewSynthRef.current) {
                previewSynthRef.current.set({
                    oscillator: {type: waveform},
                    volume: Tone.gainToDb(amplitude)
                });
            }
        }, [waveform, amplitude]);

        useEffect(() => {
            if (!onChange || Object.keys(sequence).length === 0) return;

            onChange({
                waveform: waveform,
                amplitude: amplitude,
                cols: cols,
                sequence: sequenceToString(sequence)
            });

        }, [waveform, amplitude, cols, sequence, onChange]);

        const resetSelectorPosition = (show: boolean) => {
            if (!selectorRef.current) return;

            selectorRef.current.style.left = '50px';
            if (show) selectorRef.current.style.display = 'block';
            else selectorRef.current.style.display = 'none';
        }

        const startPlaying = () => {
            resetSelectorPosition(true);

            if (schedulesRef.current.length > 0) {
                schedulesRef.current.forEach(id => Tone.getTransport().clear(id));
                schedulesRef.current = [];
            }

            partRef.current?.stop();
            partRef.current?.dispose();
            partRef.current = createPart();

            Tone.getTransport().stop();
            Tone.getTransport().position = 0;

            partRef.current.start(0);
            Tone.getTransport().start();

            setIsPlaying(true);
        }

        const createPart = () => {
            const events: [string, string[]][] = Object.entries(sequenceRef.current).map(([step, notes]) => [`0:${step}:0`, notes.map(noteToString)]);
            const part = new Part((time: number, notes: string[]) => synthRef.current?.triggerAttackRelease(notes, DURATION, time, 0.6), events);

            part.loop = false;
            part.loopEnd = Tone.Time(DURATION).toSeconds() * (managedRef.current ? maxCols.current || cols : cols);

            schedulesRef.current.push(Tone.getTransport().scheduleOnce(startPlaying, part.loopEnd));

            const thisLoopEnd = Tone.Time(DURATION).toSeconds() * cols;

            if (managedRef.current) schedulesRef.current.push(Tone.getTransport().scheduleOnce(() => {
                resetSelectorPosition(false);
            }, thisLoopEnd));
            schedulesRef.current.push(Tone.getTransport().scheduleRepeat((time) => {
                Tone.getDraw().schedule(() => {
                    if (!selectorRef.current) return;

                    const position = Tone.getTransport().seconds % (cols * Tone.Time(DURATION).toSeconds());
                    const colIndex = Math.floor(position / Tone.Time(DURATION).toSeconds());

                    selectorRef.current.style.left = `${50 + colIndex * 25}px`;

                    if (containerRef.current) {
                        const containerWidth = containerRef.current.clientWidth;
                        const selectorLeft = parseFloat(selectorRef.current.style.left);
                        const selectorWidth = selectorRef.current.clientWidth;

                        if (selectorLeft + selectorWidth > containerRef.current.scrollLeft + containerWidth) {
                            containerRef.current.scrollLeft = selectorLeft + selectorWidth - containerWidth;
                        } else if (selectorLeft < containerRef.current.scrollLeft) {
                            containerRef.current.scrollLeft = selectorLeft;
                        }
                    }
                }, time);
            }, DURATION, 0, thisLoopEnd));

            return part;
        }

        const handlePlay = async () => {
            if (isPlaying) return;
            if (!synthRef.current) return;

            await Tone.start();

            startPlaying();
        };

        const handleStop = () => {
            if (!isPlaying) return;

            if (schedulesRef.current.length > 0) {
                schedulesRef.current.forEach(id => Tone.getTransport().clear(id));
                schedulesRef.current = [];
            }

            if (partRef.current) {
                partRef.current.stop();
                partRef.current.dispose();
                partRef.current = null;
            }

            synthRef.current?.releaseAll();
            Tone.getTransport().stop();

            setIsPlaying(false);
            resetSelectorPosition(false);
        };

        const playNote = async (note: Note) => {
            previewSynthRef.current?.triggerAttackRelease(noteToString(note), '8n');
        }

        const handleMouseEnterCell = (e: React.MouseEvent<HTMLDivElement>, note: Note, idx: number) => {
            const target = e.target as HTMLDivElement;

            if (target.classList.contains(styles.cellDisabled)) return;
            const isActive = (sequence[idx] || []).some(n => sameNote(n, note));
            if (isActive) {
                target.style.backgroundColor = color.border;
            } else {
                target.style.backgroundColor = color.header;
            }

            setHoveredCell({note: note, col: idx});
        };

        const handleMouseLeaveCell = (e: React.MouseEvent<HTMLDivElement>, note: Note, idx: number) => {
            const target = e.target as HTMLDivElement;

            if (target.classList.contains(styles.cellDisabled)) return;
            const isActive = (sequence[idx] || []).some(n => sameNote(n, note));
            if (isActive) {
                target.style.backgroundColor = color.line;
            } else {
                target.style.backgroundColor = '';
            }

            setHoveredCell(null);
        };

        const handleCellClick = (e: React.MouseEvent<HTMLDivElement>, note: Note, idx: number) => {
            const target = e.target as HTMLDivElement;

            if (target.classList.contains(styles.cellDisabled)) return;

            playNote(note);

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

        const handleMouseEnterHeader = (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLDivElement;

            target.style.backgroundColor = color.header;
            target.style.color = color.text;
        };

        const handleMouseLeaveHeader = (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLDivElement;

            target.style.backgroundColor = '';
            target.style.color = '';
        };

        const handleHeaderClick = (idx: number) => {
            if (idx === cols) {
                setCols(prev => {
                    const next = prev + 1;
                    setTimeout(() => {
                        if (containerRef.current) {
                            containerRef.current.scrollLeft = containerRef.current.scrollWidth;
                        }
                    }, 0);
                    return next;
                });
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

                setCols(prev => Math.max(prev - 1, 1));
            }
        };

        const exportData = (): SequencerData => {
            return {
                waveform: waveform,
                amplitude: amplitude,
                cols: cols,
                sequence: sequenceToString(sequence)
            }
        }

        const importData = (data: SequencerData) => {
            handleStop();

            setWaveform(data.waveform);
            setAmplitude(data.amplitude);
            setCols(data.cols);
            setSequence(sequenceFromString(data.sequence));
            resetSelectorPosition(false);
        }

        useImperativeHandle(ref, () => ({
            getColor: () => color,
            play: () => {
                managedRef.current = true;
                setIsManaged(true);
                handlePlay();
            },
            stop: () => {
                managedRef.current = false;
                setIsManaged(false);
                handleStop();
            },
            changeTempo: (newTempo: number) => {
                newTempo = Math.max(1, Math.min(newTempo, 200));
                setCurrentTempo(newTempo);
            },
            getCols: () => cols,
            setMaxCols: (newMaxCols: number | null) => maxCols.current = newMaxCols || null,
            exportData: exportData,
            importData: importData
        }));

        const colHeaders = Array.from({length: cols}, (_, i) => '' + (i + 1));
        colHeaders.push('+');

        return (
            <Card className={'shadow-sm'} style={{borderColor: color.border}}>
                <Card.Header style={{backgroundColor: color.header, color: color.text, position: 'relative'}} className={'d-flex gap-5'}>
                    <div className={'d-flex align-items-center gap-2'}>
                        <img className={'card-header-icon'} src={'/images/icons/music_notes.png'} alt={t('alt.sequencer')}/>
                        <h3 className={'alternative-font'}>{t('sequencer.sequence_title') + ` ${number}`}</h3>
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
                        <Form.Label className={'fw-bold'}>{`${t('sequencer.amplitude_label')} ${amplitude}`}</Form.Label>
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
                        alt={isPlaying ? t('alt.play') : t('alt.stop')}
                        onClick={isPlaying ? handleStop : handlePlay}
                        disabled={isManaged}
                        className={styles.playBtn}
                    />

                    {onDelete && (
                        <button className={styles.closeBtn} onClick={onDelete} aria-label={t('delete_sequencer')} style={{color: color.text}}>
                            &times;
                        </button>
                    )}
                </Card.Header>
                <Card.Body>
                    <div ref={containerRef} className={`${styles.sequenceWrapper}`}>
                        <div className={styles.sequenceContainer} style={{gridTemplateColumns: `50px repeat(${cols + 1}, 25px)`,}}>
                            <div className={styles.sequenceHeader}></div>

                            {colHeaders.map((col, colIdx) => (
                                <div
                                    key={`col-${colIdx}`}
                                    className={`${styles.colHeader} ${colIdx === colHeaders.length - 1 ? styles.lastColHeader : ''}`}
                                    title={'Click to delete column'}
                                    style={{
                                        borderColor: color.border,
                                        backgroundColor: hoveredCell?.col === colIdx ? color.header : ''
                                }}
                                    onMouseEnter={handleMouseEnterHeader}
                                    onMouseLeave={handleMouseLeaveHeader}
                                    onClick={() => handleHeaderClick(colIdx)}
                                >
                                    {col}
                                </div>
                            ))}

                            {Object.values(notes).map((note, rowIdx) => (
                                <Fragment key={`row-${rowIdx}`}>
                                    <div
                                        className={`${styles.rowHeader} ${note.alteration === '' ? styles.whiteRow : styles.blackRow} ${rowIdx === Object.values(notes).length - 1 ? styles.lastRowHeader : ''}`}
                                        style={{
                                            borderColor: color.border,
                                            backgroundColor: hoveredCell?.note === note ? note.alteration === '' ? color.header : color.line : ''
                                    }}
                                    >
                                        {t(`notes.${note.note}`) + `${note.alteration}${note.octave}`}
                                    </div>

                                    {colHeaders.map((_col, colIdx) => (
                                        <div
                                            key={`cell-${rowIdx}-${colIdx}`}
                                            className={`${styles.cell} ${colIdx === 0 ? styles.firstColCell : ''} ${colIdx === colHeaders.length - 1 ? styles.cellDisabled : ''} ${rowIdx === Object.values(notes).length - 1 ? styles.lastRowCell : ''}`}
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
                        <div
                            ref={selectorRef}
                            className={styles.selector}
                            style={{
                                display: 'none',
                                left: '50px',
                                height: ((Object.keys(notes).length + 1) * 15 + 4) + 'px',
                                backgroundColor: color.header + '80',
                                borderColor: color.line
                            }}
                        ></div>
                    </div>
                </Card.Body>
            </Card>
        )
    }
);