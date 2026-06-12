import {createContext, useContext} from 'react';

export type AudioContextType = {
    isAudioReady: boolean;
    initAudio: () => Promise<void>;
    masterVolume: number;
    setMasterVolume: (vol: number) => void;
};

export const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) throw new Error("useAudio must be used within an AudioProvider");
    return context;
};