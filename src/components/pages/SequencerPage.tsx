import styles from './SequencerPage.module.css';
import {useTranslation} from "react-i18next";
import {Sequencer, type SequencerRef} from "../Sequencer.tsx";
import {Button, Col, Form, Row} from "react-bootstrap";
import {ImageButton} from "../ImageButton.tsx";
import {type Color, colors} from "../../utils/colors.ts";
import {type Dispatch, type SetStateAction, useEffect, useRef, useState} from "react";
import {debounce} from "lodash";
import type {WaveformType} from "../../utils/waveform.ts";
import type {Note} from "../../utils/music.ts";
import {loadFromStorage, saveToStorage, type StorageData} from "../../utils/storage.ts";

export function SequencerPage() {
    const {t} = useTranslation();

    const [sequencers, setSequencers] = useState<{ name: string, color: Color }[]>([{name: 'seq1', color: colors.blue}]);
    const [tempo, setTempo] = useState(60);
    const [isPlaying, setIsPlaying] = useState(false);
    const [storageData, setStorageData] = useState<StorageData | null>(null);

    const sequencerRefs = useRef<(SequencerRef | null)[]>([]);
    const debouncedSetTempo = useRef(
        debounce((value: number, setTempo: Dispatch<SetStateAction<number>>) => {
            setTempo(value);
            setStorageData(prev => {
                if (!prev) return prev;
                prev.tempo = value;
                return {...prev};

            })
        }, 1)
    ).current;

    useEffect(() => {
        // const storedData = loadFromStorage();
        // if (!storedData) return;
        //
        // setStorageData(storedData);
        // setTempo(storedData.tempo);
        // setSequencers(
        //     storedData.sequencers.map(seq => ({
        //         name: `seq${seq.index + 1}`,
        //         color: seq.color,
        //         index: seq.index
        //     }))
        // );
    }, []);

    useEffect(() => {
        // if (!storageData) return;
        // if (!sequencerRefs.current || sequencerRefs.current.length === 0) return;
        // if (!sequencers || sequencers.length === 0) return;
        //
        // storageData.sequencers.forEach((seq, i) => {
        //     const ref = sequencerRefs.current[i];
        //     if (!ref) return;
        //
        //     ref.setData(seq.waveform, seq.amplitude, seq.cols, seq.sequence);
        // });
    }, [storageData, sequencers]);

    useEffect(() => {
        // if (storageData) {
        //
        //     saveToStorage({
        //         tempo,
        //         sequencers: sequencers.map((seq, i) => {
        //             const ref = sequencerRefs.current[i];
        //             let waveform, amplitude, cols, sequence;
        //             if (ref && ref.getData) {
        //                 ({waveform, amplitude, cols, sequence} = ref.getData());
        //             }
        //             return {
        //                 index: i,
        //                 color: seq.color,
        //                 waveform,
        //                 amplitude,
        //                 cols,
        //                 sequence
        //             };
        //         })
        //     });
        //     console.log('Saved sequencers to storage');
        // }
    }, [storageData, tempo, sequencers]);

    const handlePlay = () => {
        if (sequencers.length === 0) return;

        sequencerRefs.current.forEach(seq => {
            if (!seq) return;

            seq.play();
            seq.setExternalManaged(true);
        });
        setIsPlaying(true);
    };

    const handleStop = () => {
        sequencerRefs.current.forEach(seq => {
            if (!seq) return;

            seq.stop();
            seq.setExternalManaged(false);
        });
        setIsPlaying(false);
    };

    const handleSequencerChange = (index: number, waveform: WaveformType, amplitude: number, cols: number, sequence: Record<number, Note[]>) => {
        setStorageData(prev => {
            if (!prev) prev = {tempo, sequencers: []};

            if (!prev.sequencers.find(s => s.index === index)) {
                prev.sequencers.push({
                    index,
                    color: sequencers[index].color,
                    waveform,
                    amplitude,
                    cols,
                    sequence
                });
            } else {
                const sequencer = prev.sequencers.find(s => s.index === index);
                if (sequencer) {
                    sequencer.waveform = waveform;
                    sequencer.amplitude = amplitude;
                    sequencer.cols = cols;
                    sequencer.sequence = sequence;
                }
            }

            return {...prev};
        });
    };

    const addSequencer = () => {
        handleStop();
        const colorKeys = Object.keys(colors);
        const nextIndex = sequencers.length % colorKeys.length;

        setSequencers([...sequencers, {name: `seq${sequencers.length + 1}`, color: colors[colorKeys[nextIndex]]}]);
    };

    const removeSequencer = (index: number) => {
        handleStop();
        setSequencers(sequencers.filter((_, i) => i !== index));
        sequencerRefs.current[index] = null;
    }

    const handleDownload = () => {

    }

    const handleUpload = () => {

    }

    const handleClear = () => {
        handleStop();
        setSequencers([]);
        sequencerRefs.current = [];
        setTempo(60);
        setTimeout(() => {
            setSequencers([{name: 'seq1', color: colors.blue}]);
            sequencerRefs.current = [null];
        }, 0);
    }

    return (
        <>
            <div className={'page-title'}>
                <div className={'d-flex align-items-center gap-2 mb-3'}>
                    <img src={'/images/icons/sequencer.png'} alt={'Sequencer Icon'}/>
                    <h2 className={'alternative-font'}>{t('sequencer.title')}</h2>
                </div>
                <p>{t('sequencer.description')}</p>
            </div>
            <div>
                <div className={`${styles.player} mb-4 p-2`}>
                    <div className={styles.tempoContainer + ' d-flex flex-column align-items-center'}>
                        <Form.Label className={'fw-bold'}>{`${t('sequencer.tempo_label')} ${tempo} BPM`}</Form.Label>
                        <Form.Range
                            min={1}
                            max={200}
                            value={tempo}
                            onChange={(e) => debouncedSetTempo(Number(e.target.value), setTempo)}
                            className={'fs-6'}
                        />
                        <div className="d-flex justify-content-between text-muted">
                            <small>{t('sequencer.slow')}</small>
                            <small>{t('sequencer.fast')}</small>
                        </div>
                    </div>

                    <div className={styles.statusBtn}>
                        <ImageButton
                            src={'/images/icons/download.png'}
                            alt={t('sequencer.download')}
                            size={40}
                            onClick={() => handleDownload()}
                        />
                        <span className={'fw-bold'}>Save</span>
                    </div>
                    <div className={styles.statusBtn}>
                        <ImageButton
                            src={'/images/icons/upload.png'}
                            alt={t('sequencer.upload')}
                            size={40}
                            onClick={() => handleUpload()}
                        />
                        <span className={'fw-bold'}>Load</span>
                    </div>
                    <div className={styles.statusBtn}>
                        <ImageButton
                            src={'/images/icons/clean.png'}
                            alt={t('sequencer.clean')}
                            size={40}
                            onClick={() => handleClear()}
                        />
                        <span className={'fw-bold'}>Clear</span>
                    </div>

                    <ImageButton
                        src={`/images/icons/${isPlaying ? 'stop' : 'play'}.png`}
                        alt={isPlaying ? 'Play' : 'Stop'}
                        onClick={isPlaying ? handleStop : handlePlay}
                        className={styles.playBtn}
                    />
                </div>

                <Row>
                    {sequencers.map((seq, index) =>
                        <Col className={'col-12 col-lg-6 mb-3'} key={index}>
                            <Sequencer
                                ref={ref => sequencerRefs.current[index] = ref}
                                number={index + 1}
                                color={seq.color}
                                name={seq.name}
                                tempo={tempo}
                                onDelete={() => removeSequencer(index)}
                                onChange={(waveform, amplitude, cols, sequence) => handleSequencerChange(index, waveform, amplitude, cols, sequence)}
                            />
                        </Col>
                    )}
                </Row>
            </div>

            <Button variant="primary" className={styles.addBtn} aria-label={t('aria.add_sequencer')} onClick={addSequencer}>+</Button>
        </>
    )
}