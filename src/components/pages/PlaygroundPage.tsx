import styles from "./PlaygroundPage.module.css";
import {Button, ButtonGroup, Card, Col, Container, Form, Row} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import {type Dispatch, type RefObject, type SetStateAction, useCallback, useEffect, useRef, useState} from "react";
import {type WaveformType, waveformTypes} from "../../utils/waveform.ts";
import * as Tone from 'tone';
import {Oscillator} from "tone";
import {debounce} from 'lodash';
import {commonNotes} from "../../utils/music.ts";

export function PlaygroundPage() {
    const {t} = useTranslation();

    const [waveform, setWaveform] = useState<WaveformType>('sine');
    const [frequency, setFrequency] = useState(440);
    const [amplitude, setAmplitude] = useState(0.5);
    const [isPlaying, setIsPlaying] = useState(false);

    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const oscillatorRef = useRef<Oscillator | null>(null);
    const animationRef = useRef<number | null>(null);
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
            if (oscillatorRef.current) {
                oscillatorRef.current.dispose();
            }

            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }
    }, []);

    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        /* ========================== */
        /*      Draw grid lines       */
        /* ========================== */

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        // Horizontal lines
        for (let i = 0; i <= 4; i++) {
            const y = (i * height) / 4;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vertical lines
        for (let i = 0; i <= 8; i++) {
            const x = (i * width) / 8;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Zero line
        ctx.strokeStyle = '#6c757d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        /* ========================== */
        /*     Draw waveform line     */
        /* ========================== */
        ctx.strokeStyle = isPlaying ? '#1975d2' : '#08316d';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const baseFrequency = 440;
        const cycles = (frequency / baseFrequency) * 3;
        const points = width;

        for (let x = 0; x < points; x++) {
            const t = (x / points) * cycles * 2 * Math.PI;
            let y;
            switch (waveform) {
                case 'sine':
                    y = Math.sin(t);
                    break;
                case 'square':
                    y = Math.sign(Math.sin(t));
                    break;
                case 'triangle':
                    y = (2 / Math.PI) * Math.asin(Math.sin(t));
                    break;
                case 'sawtooth':
                    y = ((t % (2 * Math.PI)) / (2 * Math.PI)) * 2 - 1;
                    break;
                default:
                    y = 0;
            }

            const pixelY = centerY + y * amplitude * (height / 4) * 0.8;
            if (x === 0) ctx.moveTo(x, pixelY);
            else ctx.lineTo(x, pixelY);
        }

        ctx.stroke();

        if (isPlaying) animationRef.current = requestAnimationFrame(drawWaveform);
    }, [waveform, frequency, amplitude, isPlaying]);

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasContainerRef.current && canvasRef.current) {
                const style = getComputedStyle(canvasContainerRef.current);
                const paddingLeft = parseFloat(style.paddingLeft) || 0;
                const paddingRight = parseFloat(style.paddingRight) || 0;
                const paddingTop = parseFloat(style.paddingTop) || 0;
                const paddingBottom = parseFloat(style.paddingBottom) || 0;

                const width = canvasContainerRef.current.clientWidth - paddingLeft - paddingRight;
                const height = canvasContainerRef.current.clientHeight - paddingTop - paddingBottom;
                const dpr = window.devicePixelRatio || 1;

                canvasRef.current.width = width * dpr;
                canvasRef.current.height = height * dpr;
                canvasRef.current.style.width = width + 'px';
                canvasRef.current.style.height = height + 'px';

                drawWaveform();
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [drawWaveform]);

    useEffect(() => {
        drawWaveform();
    }, [drawWaveform, waveform, frequency, amplitude, isPlaying]);

    const updateWaveform = (type: WaveformType) => {
        setWaveform(type);
        if (oscillatorRef.current && isPlaying) {
            oscillatorRef.current.type = type;
        }
    };

    const handlePlay = async () => {
        try {
            if (Tone.getContext().state !== 'running') await Tone.start();
            if (oscillatorRef.current) oscillatorRef.current.dispose();

            oscillatorRef.current = new Oscillator({
                type: waveform,
                frequency: frequency,
                volume: Tone.gainToDb(amplitude)
            }).toDestination();

            oscillatorRef.current.start();
            setIsPlaying(true);
        } catch (error) {
            console.error('Error starting audio:', error);
        }
    };

    const handleStop = () => {
        if (oscillatorRef.current) {
            oscillatorRef.current.stop();
            oscillatorRef.current.dispose();
            oscillatorRef.current = null;
        }

        setIsPlaying(false);

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };

    return (
        <Container fluid className="py-4 nav-space">
            <div className={'page-title'}>
                <div className={'d-flex align-items-center gap-2 mb-3'}>
                    <img src={'/images/icons/wave.png'} alt={t('alt.playground')}/>
                    <h2 className={'alternative-font'}>{t('playground.title')}</h2>
                </div>
                <p>{t('playground.description')}</p>
            </div>
            <Row className={'h-100 align-items-stretch'}>
                <Col lg={8}>
                    <Card className={'shadow-sm h-100 b-info'}>
                        <Card.Header className={'info'}>
                            <img className={'card-header-icon'} src={"/images/icons/graph.png"} alt={t('alt.oscillator_wave')}/>
                            <h3 className={'alternative-font'}>{t('playground.visualizer_title')}</h3>
                        </Card.Header>
                        <Card.Body ref={canvasContainerRef}>
                            <canvas
                                ref={canvasRef}
                                className={styles.visualizer}
                                width={800}
                                height={300}
                            ></canvas>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={4}>
                    <Card className={'shadow-sm h-100 b-warning'}>
                        <Card.Header className={'warning'}>
                            <img className={'card-header-icon'} src={"/images/icons/tune.png"} alt={t('alt.oscillator_settings')}/>
                            <h3 className={'alternative-font'}>{t('playground.controls_title')}</h3>
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
                                    <img src={'/images/icons/music_notes.png'} alt={t('alt.oscillator_frequency')} className={styles.labelIcon}/>
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
                </Col>
            </Row>
        </Container>
    )
}