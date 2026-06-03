import type {Color, Coord} from "../types";
import React, {createContext, useContext} from "react";

export type PhaseState = {
    time: number;
    color: Color;
    handle1: Coord;
    handle2: Coord;
    isAdvanced: boolean;
    points: Coord[];
}

export type InstrumentPreset = {
    name: string;
    partials: number[];
    attack: PhaseState;
    decay: PhaseState;
    release: PhaseState;
}

const presetModules = import.meta.glob('../assets/presets/*.json', {eager: true, import: 'default'});

export const PRESET_LIBRARY: InstrumentPreset[] = Object.values(presetModules) as InstrumentPreset[];
if (PRESET_LIBRARY.length === 0) {
    PRESET_LIBRARY.push(
        {
            name: 'Default',
            partials: [1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            attack: {
                time: 100,
                color: 'red',
                isAdvanced: false,
                handle1: {x: 0, y: 0},
                handle2: {x: 1, y: 1},
                points: [{x: 0, y: 0}, {x: 1, y: 1}]
            },
            decay: {
                time: 1000,
                color: 'yellow',
                isAdvanced: false,
                handle1: {x: 0, y: 1},
                handle2: {x: 1, y: 0},
                points: [{x: 0, y: 1}, {x: 1, y: 0}]
            },
            release: {
                time: 60,
                color: 'blue',
                isAdvanced: false,
                handle1: {x: 0, y: 1},
                handle2: {x: 1, y: 0},
                points: [{x: 0, y: 1}, {x: 1, y: 0}]
            }
        }
    )
}

export type PresetContextType = {
    presets: InstrumentPreset[];
    activePreset: InstrumentPreset | null;
    loadPreset: (name: string) => void;
    attackData: PhaseState;
    setAttackData: React.Dispatch<React.SetStateAction<PhaseState>>;
    decayData: PhaseState;
    setDecayData: React.Dispatch<React.SetStateAction<PhaseState>>;
    releaseData: PhaseState;
    setReleaseData: React.Dispatch<React.SetStateAction<PhaseState>>;
};

export const PresetContext = createContext<PresetContextType | null>(null);

export const usePreset = () => {
    const context = useContext(PresetContext);
    if (!context) throw new Error("usePreset must be used within a PresetProvider");
    return context;
};