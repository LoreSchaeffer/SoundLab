import {type PropsWithChildren, useCallback, useState} from "react";
import {SynthContext} from "./SynthContext.ts";
import type {InstrumentConfig} from "../types/audio.ts";
import {AudioEngine} from "../core/AudioEngine.ts";

export const SynthProvider = ({children}: PropsWithChildren) => {
    const [channels, setChannelsState] = useState<Record<string, InstrumentConfig>>({});

    const registerChannel = useCallback((config: InstrumentConfig) => {
        AudioEngine.createChannel(config);
        setChannelsState(prev => ({...prev, [config.id]: config}));
    }, []);

    const unregisterChannel = useCallback((id: string) => {
        AudioEngine.removeChannel(id);
        setChannelsState(prev => {
            const newState = {...prev};
            delete newState[id];
            return newState;
        });
    }, []);

    const updateChannelConfig = useCallback((id: string, updates: Partial<InstrumentConfig>) => {
        const channel = AudioEngine.getChannel(id);
        if (channel) {
            if (updates.volume !== undefined) channel.setVolume(updates.volume);
            channel.updateConfig(updates);
            setChannelsState(prev => ({
                ...prev,
                [id]: {...prev[id], ...updates}
            }));
        }
    }, []);

    const playNote = useCallback((channelId: string, note: string | number, velocity: number = 1, time?: number) => {
        AudioEngine.getChannel(channelId)?.playNote(note, velocity, time);
    }, []);

    const releaseNote = useCallback((channelId: string, note: string | number) => {
        AudioEngine.getChannel(channelId)?.releaseNote(note);
    }, []);

    const updateNoteFrequency = useCallback((channelId: string, oldNote: string | number, newNote: string | number) => {
        const channel = AudioEngine.getChannel(channelId);
        if (channel) channel.updateNoteFrequency(oldNote, newNote);
    }, []);

    return (
        <SynthContext.Provider value={{
            channels,
            registerChannel,
            unregisterChannel,
            updateChannelConfig,
            playNote,
            releaseNote,
            updateNoteFrequency
        }}>
            {children}
        </SynthContext.Provider>
    );
};