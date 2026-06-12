import {type PropsWithChildren, useCallback, useState} from "react";
import {AudioContext} from "./AudioContext.ts";
import {AudioEngine} from "../core/AudioEngine.ts";

export const AudioProvider = ({children}: PropsWithChildren) => {
    const [isAudioReady, setIsAudioReady] = useState(AudioEngine.isReady);
    const [masterVolume, setMasterVolumeState] = useState(0.8);

    const initAudio = useCallback(async () => {
        await AudioEngine.init();
        setIsAudioReady(true);
    }, []);

    const setMasterVolume = useCallback((vol: number) => {
        setMasterVolumeState(vol);
        AudioEngine.setMasterVolume(vol);
    }, []);

    return (
        <AudioContext.Provider value={{
            isAudioReady,
            initAudio,
            masterVolume,
            setMasterVolume
        }}>
            {children}
        </AudioContext.Provider>
    );
};