import React, {createContext, useContext} from "react";
import type {InstrumentPreset, PhaseState} from "../types";

export type PresetContextType = {
    presets: InstrumentPreset[];
    activePreset: InstrumentPreset | null;
    loadPreset: (id: string) => void;

    attackData: PhaseState;
    setAttackData: React.Dispatch<React.SetStateAction<PhaseState>>;
    decayData: PhaseState;
    setDecayData: React.Dispatch<React.SetStateAction<PhaseState>>;
    releaseData: PhaseState;
    setReleaseData: React.Dispatch<React.SetStateAction<PhaseState>>;

    saveUserPreset: (id: string, name: string, partials: number[]) => void;
    deleteUserPreset: (id: string) => void;
    exportPresetToFile: (id: string) => void;
    importPresetFromFile: (file: File) => Promise<void>;
};

export const PresetContext = createContext<PresetContextType | null>(null);

export const usePreset = () => {
    const context = useContext(PresetContext);
    if (!context) throw new Error("usePreset must be used within a PresetProvider");
    return context;
};