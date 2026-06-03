import {type ReactNode, useCallback, useState} from "react";
import {useSynth} from "./SynthContext.ts";
import {type InstrumentPreset, type PhaseState, PRESET_LIBRARY, PresetContext} from "./PresetContext.ts";

export const PresetProvider = ({children}: { children: ReactNode }) => {
    const {setPartials} = useSynth();
    const [activePreset, setActivePreset] = useState<InstrumentPreset | null>(PRESET_LIBRARY[0]);

    const [attackData, setAttackData] = useState<PhaseState>(PRESET_LIBRARY[0].attack);
    const [decayData, setDecayData] = useState<PhaseState>(PRESET_LIBRARY[0].decay);
    const [releaseData, setReleaseData] = useState<PhaseState>(PRESET_LIBRARY[0].release);

    const loadPreset = useCallback((presetName: string) => {
        const preset = PRESET_LIBRARY.find(p => p.name === presetName);
        if (preset) {
            setActivePreset(preset);
            setAttackData(preset.attack);
            setDecayData(preset.decay);
            setReleaseData(preset.release);
            setPartials(preset.partials);
        }
    }, [setPartials]);

    return (
        <PresetContext.Provider value={{
            presets: PRESET_LIBRARY,
            activePreset,
            loadPreset,
            attackData, setAttackData,
            decayData, setDecayData,
            releaseData, setReleaseData
        }}>
            {children}
        </PresetContext.Provider>
    );
};