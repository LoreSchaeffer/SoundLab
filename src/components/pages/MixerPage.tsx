import styles from './MixerPage.module.css';
import {useTranslation} from "react-i18next";
import {Button, Card, Col, Row} from "react-bootstrap";
import {useCallback, useEffect, useRef, useState} from "react";
import {OscillatorCard, type OscillatorCardRef} from "../OscillatorCard.tsx";
import {type Color, colors} from "../../utils/colors.ts";

export function MixerPage() {
    const {t} = useTranslation();

    const [oscillators, setOscillators] = useState<{name: string, color: Color}[]>([{name: 'osc1', color: colors.blue}]);

    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const oscillatorRefs = useRef<(OscillatorCardRef | null)[]>([]);

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }
    }, []);

    const drawWaveforms = useCallback(() => {
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
        /*    Draw waveform lines     */
        /* ========================== */

        let isPlaying = false;

        oscillators.forEach((_oscillator, idx) => {
            const ref = oscillatorRefs.current[idx];
            if (!ref) return;

            ctx.strokeStyle = ref.isPlaying() ? ref.getColor().line || '#1975d2' : ref.getColor().header || '#08316d';
            ctx.lineWidth = 2;
            ctx.beginPath();

            const baseFrequency = 440;
            const cycles = (ref.getFrequency() / baseFrequency) * 3;
            const points = width;

            for (let x = 0; x < points; x++) {
                const t = (x / points) * cycles * 2 * Math.PI;

                let y;
                switch (ref.getWaveform()) {
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

                const pixelY = centerY + y * (ref.getAmplitude() + 0.5) * (height / 4) * 0.8;
                if (x === 0) ctx.moveTo(x, pixelY);
                else ctx.lineTo(x, pixelY);
            }

            ctx.stroke();

            if (ref.isPlaying()) isPlaying = true;
        });

        // Draw summed waveform
        if (oscillators.length > 1) {
            ctx.save();
            ctx.strokeStyle = '#212121';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const baseFrequency = 440;
            const points = width;

            for (let x = 0; x < points; x++) {
                let sumY = 0;
                oscillators.forEach((_oscillator, idx) => {
                    const ref = oscillatorRefs.current[idx];
                    if (!ref) return;

                    const cycles = (ref.getFrequency() / baseFrequency) * 3;
                    const t = (x / points) * cycles * 2 * Math.PI;

                    let y;
                    switch (ref.getWaveform()) {
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
                    sumY += y * (ref.getAmplitude() + 0.5);
                });

                sumY = sumY / oscillators.length;
                const pixelY = centerY + sumY * (height / 4) * 0.8;
                if (x === 0) ctx.moveTo(x, pixelY);
                else ctx.lineTo(x, pixelY);
            }

            ctx.stroke();
            ctx.restore();
        }

        if (isPlaying) animationRef.current = requestAnimationFrame(drawWaveforms);
    }, [oscillators]);

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

                drawWaveforms();
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [drawWaveforms]);

    useEffect(() => {
        drawWaveforms();
    }, [drawWaveforms, oscillators]);

    const addOscillator = () => {
        const colorKeys = Object.keys(colors);
        const nextIndex = oscillators.length % colorKeys.length;

        setOscillators([...oscillators, {name: `osc${oscillators.length + 1}`, color: colors[colorKeys[nextIndex]]}]);
    };

    const stopAllOscillators = () => {
        oscillatorRefs.current.forEach(ref => {
            if (ref) ref.stop();
        });
    }

    return (
        <>
            <div className={'page-title'}>
                <div className={'d-flex align-items-center gap-2 mb-3'}>
                    <img src={'/images/icons/mixer.png'} alt={'Mixer Icon'}/>
                    <h2 className={'alternative-font'}>{t('mixer.title')}</h2>
                </div>
                <p>{t('mixer.description')}</p>
            </div>
            <Card className={'shadow-sm b-info'}>
                <Card.Header className={'info'}>
                    <img className={'card-header-icon'} src={"/images/icons/graph.png"} alt={"Wave Icon"}/>
                    <h3 className={'alternative-font'}>{t('playground.visualizer_title')}</h3>
                    <img className={styles.stopAll} src={"/images/icons/stop.png"} alt={"Stop All Icon"} onClick={stopAllOscillators} />
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
            <Row className={'h-100 mt-4 align-items-stretch'}>
                {oscillators.map((osc, index) =>
                    <Col className={'col-12 col-md-6 col-lg-4 mb-3'} key={index}>
                        <OscillatorCard
                            ref={ref => oscillatorRefs.current[index] = ref}
                            number={index + 1}
                            color={osc.color}
                            onDelete={() => {
                                setOscillators(oscillators.filter((_, i) => i !== index));
                                oscillatorRefs.current[index] = null;
                            }}
                            onWaveformChange={drawWaveforms}
                            onFrequencyChange={drawWaveforms}
                            onAmplitudeChange={drawWaveforms}
                            onPlay={drawWaveforms}
                            onStop={drawWaveforms}
                        />
                    </Col>
                )}
            </Row>

            <Button variant="primary" className={styles.addBtn} aria-label={t('aria.add_oscillator')} onClick={addOscillator}>+</Button>
        </>
    )
}