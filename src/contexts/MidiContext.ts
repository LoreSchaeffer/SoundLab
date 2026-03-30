import {createContext, useContext, useEffect} from "react";

export type MidiListener = {
    onNoteOn: (note: string, velocity: number) => void;
    onNoteOff: (note: string) => void;
};

export type MidiContextType = {
    ready: boolean;
    subscribe: (listener: MidiListener) => () => void;
}

export const MidiContext = createContext<MidiContextType | null>(null);

export const useMidi = (
    onNoteOn?: (note: string, velocity: number) => void,
    onNoteOff?: (note: string) => void
) => {
    const context = useContext(MidiContext);
    if (!context) throw new Error("useMidi must be used within a MidiProvider");

    useEffect(() => {
        if (!onNoteOn && !onNoteOff) return;

        const listener: MidiListener = {
            onNoteOn: onNoteOn || (() => {
            }),
            onNoteOff: onNoteOff || (() => {
            })
        };

        return context.subscribe(listener);
    }, [context, onNoteOn, onNoteOff]);

    return context.ready;
};