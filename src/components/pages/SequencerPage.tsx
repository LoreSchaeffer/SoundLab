import styles from './SequencerPage.module.css';
import {useTranslation} from "react-i18next";
import {Sequencer, type SequencerRef} from "../Sequencer.tsx";
import {Button, Col, Container, Dropdown, Form, Row} from "react-bootstrap";
import {ImageButton} from "../ImageButton.tsx";
import {type Color, colors} from "../../utils/colors.ts";
import {type Dispatch, type SetStateAction, useEffect, useRef, useState} from "react";
import {debounce} from "lodash";
import {downloadData, loadFromStorage, saveToStorage, type SequencerData, type StorageData, uploadData} from "../../utils/storage.ts";
import type {Example} from "../../utils/types.ts";
import {DropdownSubmenu} from "../DropdownSubmenu.tsx";

export function SequencerPage() {
    const {t} = useTranslation();

    const [sequencers, setSequencers] = useState<{ name: string, color: Color }[]>([{name: 'seq1', color: colors.blue}]);
    const [tempo, setTempo] = useState(120);
    const [isPlaying, setIsPlaying] = useState(false);
    const [importedData, setImportedData] = useState<StorageData | null>(null);
    const [examples, setExamples] = useState<Example[]>([]);

    const storageDataRef = useRef<StorageData | null>(null);
    const sequencersRef = useRef<(SequencerRef | null)[]>([]);
    const debouncedSetTempo = useRef(
        debounce((value: number, setTempo: Dispatch<SetStateAction<number>>) => {
            setTempo(value);
        }, 1)
    ).current;

    useEffect(() => {
        const storedData = loadFromStorage();
        if (storedData) importData(storedData);

        fetch('/examples/examples.json')
            .then(res => res.json())
            .then(data => {
                setExamples(data);
            })
            .catch(err => {
                console.error('Failed to load examples:', err);
            });
    }, []);

    useEffect(() => {
        sequencersRef.current.forEach((seq) => {
            if (seq) seq.changeTempo(tempo);
        });
    }, [tempo, sequencersRef]);

    useEffect(() => {
        if (sequencers.length === 0) setSequencers([{name: 'seq1', color: colors.blue}]);
    }, [sequencers]);

    useEffect(() => {
        if (!importedData) return;

        sequencersRef.current.forEach((seq, index) => {
            if (!seq) return;

            seq.importData(importedData.sequencers.find(s => s.index === index) as SequencerData);
        });

        setImportedData(null);
    }, [sequencers, importedData]);

    const handlePlay = () => {
        if (sequencers.length === 0) return;

        let maxCols = 0;
        sequencersRef.current.forEach(seq => {
            if (!seq) return;

            const cols = seq.getCols();
            if (cols > maxCols) maxCols = cols;
        });

        sequencersRef.current.forEach(seq => {
            if (!seq) return;

            seq.setMaxCols(maxCols);
            seq.play();
        });

        setIsPlaying(true);
    };

    const handleStop = () => {
        sequencersRef.current.forEach(seq => {
            if (!seq) return;

            seq.stop();
            seq.setMaxCols(null);
        });

        setIsPlaying(false);
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
        sequencersRef.current = sequencersRef.current.filter((_, i) => i !== index);
    };

    const handleSequencerChange = (data: SequencerData, index: number, color: Color) => {
        if (!storageDataRef.current) {
            storageDataRef.current = {
                tempo: tempo,
                sequencers: []
            };
        }

        if (storageDataRef.current.sequencers.find(seq => seq.index === index)) {
            const existingSeqIndex = storageDataRef.current.sequencers.findIndex(seq => seq.index === index);
            storageDataRef.current.sequencers[existingSeqIndex] = {
                ...data,
                index: index,
                color: color
            };
        } else {
            storageDataRef.current.sequencers.push({
                ...data,
                index: index,
                color: color
            })
        }

        saveToStorage(storageDataRef.current);
    };

    const handleDownload = () => {
        if (!storageDataRef.current) {
            alert(t('sequencer.no_data'));
            return;
        }

        downloadData(storageDataRef.current);
    };

    const importData = (data: StorageData | null) => {
        if (!data) {
            alert(t('sequencer.upload_failed'));
            return;
        }

        storageDataRef.current = data;
        setTempo(data.tempo);
        setSequencers(data.sequencers.map(seq => ({
            name: `seq${seq.index + 1}`,
            color: seq.color
        })));

        setImportedData(data);
    };

    const handleUpload = async () => {
        importData(await uploadData());
    };

    const handleImportExample = (example: Example) => {
        fetch(`/examples/${example.file}`)
            .then(res => res.json())
            .then(data => importData(data))
            .catch(err => {
                console.error('Failed to import example:', err);
                alert(t('sequencer.import_failed', {name: example.name}));
            });
    }

    const handleClear = () => {
        handleStop();
        setSequencers([]);
        sequencersRef.current = [];
        debouncedSetTempo(120, setTempo);
        setIsPlaying(false);
        storageDataRef.current = null;
        saveToStorage(null);
    };

    return (
        <Container fluid className="py-4 nav-space">
            <div className={'page-title'}>
                <div className={'d-flex align-items-center gap-2 mb-3'}>
                    <img src={'/images/icons/sequencer.png'} alt={'alt.sequencer'}/>
                    <h2 className={'alternative-font'}>{t('sequencer.title')}</h2>
                </div>
                <p>{t('sequencer.description')}</p>
            </div>

            <div>
                <div className={`${styles.player} mb-4 p-2`}>
                    <Dropdown>
                        <Dropdown.Toggle className={styles.dropdownToggle}>
                            <img src={'/images/icons/menu.png'} alt={t('alt.menu')}/>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item className={styles.dropdownItem} onClick={handleClear}><img src={'/images/icons/clean.png'} alt={t('sequencer.menu.clear')}/>{t('sequencer.menu.clear')}</Dropdown.Item>
                            <Dropdown.Divider/>
                            <DropdownSubmenu toggle={
                                <>
                                    <img src={'/images/icons/examples.png'} alt={t('sequencer.menu.examples')}/>
                                    {t('sequencer.menu.examples')}
                                </>
                            }
                                             toggleClassName={styles.dropdownItem}
                            >
                                {examples.map((example) => (
                                    <Dropdown.Item
                                        key={example.file}
                                        className={styles.dropdownItem}
                                        onClick={() => handleImportExample(example)}
                                    >
                                        <img src={`/images/icons/${example.icon}.png`} alt={example.name} className={styles.exampleIcon}/>
                                        {example.name}
                                    </Dropdown.Item>
                                ))}
                            </DropdownSubmenu>
                            <Dropdown.Divider/>
                            <Dropdown.Item className={styles.dropdownItem} onClick={handleDownload}><img src={'/images/icons/download.png'} alt={t('sequencer.menu.export')}/>{t('sequencer.menu.export')}</Dropdown.Item>
                            <Dropdown.Item className={styles.dropdownItem} onClick={handleUpload}><img src={'/images/icons/upload.png'} alt={t('sequencer.menu.import')}/>{t('sequencer.menu.import')}</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>

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

                    <ImageButton
                        src={`/images/icons/${isPlaying ? 'stop' : 'play'}.png`}
                        alt={isPlaying ? t('alt.play') : t('alt.stop')}
                        onClick={isPlaying ? handleStop : handlePlay}
                        className={styles.playBtn}
                    />
                </div>

                <Row>
                    {sequencers.map((seq, index) =>
                        <Col className={'col-12 col-xl-6 mb-3'} key={index}>
                            <Sequencer
                                ref={ref => {
                                    sequencersRef.current[index] = ref;
                                }}
                                number={index + 1}
                                color={seq.color}
                                tempo={tempo}
                                onDelete={() => removeSequencer(index)}
                                onChange={(data) => handleSequencerChange(data, index, seq.color)}
                            />
                        </Col>
                    )}
                </Row>
            </div>

            <Button variant="primary" className={styles.addBtn} aria-label={t('aria.add_sequencer')} onClick={addSequencer}>+</Button>
        </Container>
    )
}