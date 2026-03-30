import {createContext, useContext} from 'react';

export type Envelope = {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
};

export type SynthContextType = {
    isAudioReady: boolean;
    initAudio: () => Promise<void>;
    playNote: (note: string, velocity?: number) => void;
    releaseNote: (note: string) => void;
    partials: number[];
    setPartials: (newPartials: number[]) => void;
    envelope: Envelope;
    setAdsr: (newAdsr: Envelope) => void;
}

export const SynthContext = createContext<SynthContextType | null>(null);

export const useSynth = () => {
    const context = useContext(SynthContext);
    if (!context) {
        throw new Error("useSynth must be used within a SynthProvider");
    }
    return context;
};