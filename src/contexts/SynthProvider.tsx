import {type FC, type ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {Compressor, Gain, now, Oscillator, start} from "tone";
import {type Envelope, SynthContext} from "./SynthContext.ts";

const NUM_VOICES = 8;
const NUM_HARMONICS = 16;

type Voice = {
    oscillator: Oscillator;
    gainNode: Gain;
    active: boolean;
    note: string | null;
};

interface SynthProviderProps {
    children: ReactNode;
}

export const SynthProvider: FC<SynthProviderProps> = ({children}) => {
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [partials, setPartialsState] = useState<number[]>(() => {
        const initialPartials = new Array(NUM_HARMONICS).fill(0);
        initialPartials[0] = 1.0;
        return initialPartials;
    });

    const [envelope, setEnvelope] = useState<Envelope>({attack: 0.1, decay: 3.5, sustain: 0.0, release: 1.0});

    const voicesRef = useRef<Voice[]>([]);
    const compressorRef = useRef<Compressor | null>(null);

    const initAudio = useCallback(async () => {
        if (isAudioReady) return;

        await start();

        compressorRef.current = new Compressor(-20, 3).toDestination();

        const newVoices: Voice[] = [];
        for (let i = 0; i < NUM_VOICES; i++) {
            const gainNode = new Gain(0).connect(compressorRef.current);

            const oscillator = new Oscillator({
                type: "custom",
                partials: partials,
                volume: -10
            }).connect(gainNode).start();

            newVoices.push({oscillator, gainNode, active: false, note: null});
        }

        voicesRef.current = newVoices;
        setIsAudioReady(true);
    }, [isAudioReady, partials]);

    const playNote = useCallback((note: string, velocity: number = 1) => {
        if (!isAudioReady || voicesRef.current.length === 0) return;
        if (voicesRef.current.some(v => v.note === note && v.active)) return;

        const time = now() + 0.02;
        let freeVoiceIndex = voicesRef.current.findIndex(v => !v.active);

        if (freeVoiceIndex === -1) {
            freeVoiceIndex = 0;
            const voiceToSteal = voicesRef.current[freeVoiceIndex];
            const gainToSteal = voiceToSteal.gainNode.gain;

            const currentVal = gainToSteal.value;
            gainToSteal.cancelScheduledValues(time - 0.01);
            gainToSteal.setValueAtTime(currentVal, time - 0.01);
            gainToSteal.linearRampToValueAtTime(0, time - 0.005);
        }

        const voiceToPlay = voicesRef.current[freeVoiceIndex];

        voicesRef.current[freeVoiceIndex] = {
            ...voiceToPlay,
            active: true,
            note: note
        };

        const gainParam = voiceToPlay.gainNode.gain;

        voiceToPlay.oscillator.frequency.setValueAtTime(note, time);

        const currentGain = gainParam.value;
        gainParam.cancelScheduledValues(time);
        gainParam.setValueAtTime(currentGain, time);

        if (envelope.attackCurve && envelope.attackCurve.length > 0) {
            const attackValues = envelope.attackCurve.map(
                p => currentGain + p * (velocity - currentGain)
            );
            gainParam.setValueCurveAtTime(attackValues, time, envelope.attack);
        } else {
            gainParam.linearRampToValueAtTime(velocity, time + envelope.attack);
        }

        const decayStartTime = time + envelope.attack;
        if (envelope.decayCurve && envelope.decayCurve.length > 0) {
            const decayValues = envelope.decayCurve.map(v => v * velocity);
            gainParam.setValueCurveAtTime(decayValues, decayStartTime, envelope.decay);
        } else {
            gainParam.exponentialRampToValueAtTime(Math.max(envelope.sustain, 0.001), decayStartTime + envelope.decay);
        }
    }, [isAudioReady, envelope]);

    const releaseNote = useCallback((note: string) => {
        if (!isAudioReady || voicesRef.current.length === 0) return;

        const voiceIndex = voicesRef.current.findIndex(v => v.note === note && v.active);

        if (voiceIndex !== -1) {
            const voiceToRelease = voicesRef.current[voiceIndex];
            const gainParam = voiceToRelease.gainNode.gain;
            const time = now() + 0.02;
            const currentGain = gainParam.value;

            gainParam.cancelScheduledValues(time);
            gainParam.setValueAtTime(currentGain, time);

            if (envelope.releaseCurve && envelope.releaseCurve.length > 0) {
                const scaledRelease = envelope.releaseCurve.map(v => v * currentGain);
                gainParam.setValueCurveAtTime(scaledRelease, time, envelope.release);
            } else {
                gainParam.exponentialRampToValueAtTime(0.0001, time + envelope.release);
            }

            gainParam.setValueAtTime(0, time + envelope.release + 0.01);

            voicesRef.current[voiceIndex] = {
                ...voiceToRelease,
                active: false,
                note: null
            };
        }
    }, [isAudioReady, envelope]);

    const setPartials = useCallback((newPartials: number[]) => {
        setPartialsState(newPartials);
        if (voicesRef.current.length > 0) {
            voicesRef.current.forEach(v => {
                v.oscillator.partials = [...newPartials];
            });
        }
    }, []);

    const setEnvelopeCallback = useCallback((newEnvelope: Envelope) => {
        setEnvelope(newEnvelope);
    }, []);

    useEffect(() => {
        return () => {
            voicesRef.current.forEach(v => {
                v.oscillator.stop();
                v.oscillator.dispose();
                v.gainNode.dispose();
            });
            compressorRef.current?.dispose();
        };
    }, []);

    return (
        <SynthContext.Provider value={{
            isAudioReady,
            initAudio,
            playNote,
            releaseNote,
            partials,
            setPartials,
            envelope,
            setEnvelope: setEnvelopeCallback
        }}>
            {children}
        </SynthContext.Provider>
    );
};