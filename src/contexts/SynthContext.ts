import {createContext, useContext} from 'react';
import type {InstrumentConfig} from "../types/audio.ts";

export type SynthContextType = {
    isAudioReady: boolean;
    initAudio: () => Promise<void>;

    masterVolume: number;
    setMasterVolume: (vol: number) => void;

    channels: Record<string, InstrumentConfig>;
    registerChannel: (config: InstrumentConfig) => void;
    unregisterChannel: (id: string) => void;
    updateChannelConfig: (id: string, configUpdates: Partial<InstrumentConfig>) => void;

    playNote: (channelId: string, note: string | number, velocity?: number) => void;
    releaseNote: (channelId: string, note: string | number) => void;
    updateNoteFrequency: (channelId: string, oldNote: string | number, newNote: string | number) => void;
}

export const SynthContext = createContext<SynthContextType | null>(null);

export const useSynth = () => {
    const context = useContext(SynthContext);
    if (!context) throw new Error("useSynth must be used within a SynthProvider");
    return context;
};