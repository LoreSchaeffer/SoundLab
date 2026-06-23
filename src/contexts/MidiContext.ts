import {createContext, useContext} from 'react';
import type {MidiParsedMessage} from '../utils/midi.ts';

export type MidiDevice = {
    id: string;
    name: string;
    manufacturer: string;
    state: 'connected' | 'disconnected';
};

export type MidiContextType = {
    isSupported: boolean;
    hasPermission: boolean;
    inputs: MidiDevice[];
    outputs: MidiDevice[];
    activeInputId: string | null;
    setActiveInputId: (id: string | null) => void;

    ccMappings: Record<string, number>;
    setCcMapping: (actionId: string, cc: number | null) => void;

    addMidiListener: (callback: (msg: MidiParsedMessage) => void) => void;
    removeMidiListener: (callback: (msg: MidiParsedMessage) => void) => void;
};

export const MidiContext = createContext<MidiContextType | null>(null);

export const useMidi = () => {
    const context = useContext(MidiContext);
    if (!context) throw new Error("useMidi must be used within a MidiProvider");
    return context;
};