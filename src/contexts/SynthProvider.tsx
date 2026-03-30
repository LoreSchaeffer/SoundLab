import {type FC, type ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {Compressor, now, start, Synth} from "tone";
import {type Envelope, SynthContext} from "./SynthContext.ts";

const NUM_VOICES = 8;
const NUM_HARMONICS = 16;

type Voice = {
    synth: Synth;
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
            const synth = new Synth({
                oscillator: {type: "custom", partials: partials},
                envelope: {
                    attack: envelope.attack,
                    decay: envelope.decay,
                    sustain: envelope.sustain,
                    release: envelope.release
                },
                volume: -10
            }).connect(compressorRef.current);

            newVoices.push({synth, active: false, note: null});
        }

        voicesRef.current = newVoices;
        setIsAudioReady(true);
    }, [isAudioReady, partials, envelope]);

    const playNote = useCallback((note: string, velocity: number = 1) => {
        if (!isAudioReady || voicesRef.current.length === 0) return;
        if (voicesRef.current.some(v => v.note === note && v.active)) return;

        let freeVoiceIndex = voicesRef.current.findIndex(v => !v.active);

        if (freeVoiceIndex === -1) {
            freeVoiceIndex = 0;
            voicesRef.current[freeVoiceIndex].synth.triggerRelease();
        }

        const voiceToPlay = voicesRef.current[freeVoiceIndex];

        voicesRef.current[freeVoiceIndex] = {
            ...voiceToPlay,
            active: true,
            note: note
        };

        voiceToPlay.synth.triggerAttack(note, now(), velocity);
    }, [isAudioReady]);

    const releaseNote = useCallback((note: string) => {
        if (!isAudioReady || voicesRef.current.length === 0) return;

        const voiceIndex = voicesRef.current.findIndex(v => v.note === note && v.active);

        if (voiceIndex !== -1) {
            const voiceToRelease = voicesRef.current[voiceIndex];
            voiceToRelease.synth.triggerRelease();

            voicesRef.current[voiceIndex] = {
                ...voiceToRelease,
                active: false,
                note: null
            };
        }
    }, [isAudioReady]);

    const setPartials = useCallback((newPartials: number[]) => {
        setPartialsState(newPartials);

        if (voicesRef.current.length > 0) {
            voicesRef.current.forEach(v => v.synth.oscillator.partials = [...newPartials]);
        }
    }, []);

    const setAdsr = useCallback((newAdsr: Envelope) => {
        setEnvelope(newAdsr);

        if (voicesRef.current.length > 0) {
            voicesRef.current.forEach(v => {
                v.synth.envelope.attack = newAdsr.attack;
                v.synth.envelope.decay = newAdsr.decay;
                v.synth.envelope.sustain = newAdsr.sustain;
                v.synth.envelope.release = newAdsr.release;
            });
        }
    }, []);

    useEffect(() => {
        return () => {
            voicesRef.current.forEach(v => v.synth.dispose());
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
            envelope: envelope,
            setAdsr
        }}>
            {children}
        </SynthContext.Provider>
    );
};