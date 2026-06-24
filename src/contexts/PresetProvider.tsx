import {type ReactNode, useCallback, useEffect, useMemo, useState} from "react";
import {PresetContext} from "./PresetContext.ts";
import type {InstrumentPreset, PhaseState} from "../types";

const LOCAL_STORAGE_KEY = 'sl_user_presets';

const presetModules = import.meta.glob('../assets/presets/*.json', {eager: true, import: 'default'});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FACTORY_PRESETS: InstrumentPreset[] = Object.values(presetModules).map((p: any, index) => ({
    ...p,
    id: p.id || `factory-${index}`,
    isFactory: true
}));

if (FACTORY_PRESETS.length === 0) {
    FACTORY_PRESETS.push({
        id: 'factory-default',
        name: 'Default Synth',
        isFactory: true,
        oscillatorType: 'custom',
        partials: [1.0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        attack: {time: 100, color: 'red', isAdvanced: false, handle1: {x: 0, y: 0}, handle2: {x: 1, y: 1}, points: [{x: 0, y: 0}, {x: 1, y: 1}]},
        decay: {time: 1000, color: 'yellow', isAdvanced: false, handle1: {x: 0, y: 1}, handle2: {x: 1, y: 0}, points: [{x: 0, y: 1}, {x: 1, y: 0}]},
        release: {time: 60, color: 'blue', isAdvanced: false, handle1: {x: 0, y: 1}, handle2: {x: 1, y: 0}, points: [{x: 0, y: 1}, {x: 1, y: 0}]}
    });
}

export const PresetProvider = ({children}: { children: ReactNode }) => {
    const [userPresets, setUserPresets] = useState<InstrumentPreset[]>([]);
    const [activePreset, setActivePreset] = useState<InstrumentPreset | null>(null);

    const [attackData, setAttackData] = useState<PhaseState>(FACTORY_PRESETS[0].attack);
    const [decayData, setDecayData] = useState<PhaseState>(FACTORY_PRESETS[0].decay);
    const [releaseData, setReleaseData] = useState<PhaseState>(FACTORY_PRESETS[0].release);

    const allPresets = useMemo(() => {
        return [
            ...FACTORY_PRESETS,
            ...userPresets
        ];
    }, [userPresets]);

    const loadPreset = useCallback((id: string) => {
        const preset = allPresets.find(p => p.id === id);

        if (preset) {
            setActivePreset(preset);
            setAttackData(preset.attack);
            setDecayData(preset.decay);
            setReleaseData(preset.release);
        }
    }, [allPresets]);

    const saveUserPreset = useCallback((newPreset: InstrumentPreset) => {
        setUserPresets(prevPresets => {
            const filtered = prevPresets.filter(p => p.id !== newPreset.id);
            const updatedPresets = [...filtered, newPreset];

            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPresets));
            return updatedPresets;
        });

        loadPreset(newPreset.id);
    }, [loadPreset]);

    const deleteUserPreset = useCallback((id: string) => {
        const updatedPresets = userPresets.filter(p => p.id !== id);
        setUserPresets(updatedPresets);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPresets));

        if (activePreset?.id === id) loadPreset(FACTORY_PRESETS[0].id);
    }, [userPresets, activePreset, loadPreset]);

    const exportPresetToFile = useCallback((id: string) => {
        const preset = allPresets.find(p => p.id === id);
        if (!preset) return;

        const exportData = {...preset, id: undefined, isFactory: undefined};
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${preset.name.replace(/\s+/g, '_').toLowerCase()}_preset.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [allPresets]);

    const importPresetFromFile = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.name || !data.partials || !data.attack) throw new Error("Invalid preset format");

            const newPreset: InstrumentPreset = {
                ...data,
                id: crypto.randomUUID(),
                isFactory: false,
            };

            const updatedPresets = [...userPresets, newPreset];
            setUserPresets(updatedPresets);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPresets));
            loadPreset(newPreset.id);

        } catch (error) {
            console.error("Error during import:", error);
            alert("Impossibile importare il preset. Verifica che il file JSON sia corretto."); // TODO Replace with an alert or a notification
        }
    }, [userPresets, loadPreset]);

    useEffect(() => {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            try {
                setUserPresets(JSON.parse(stored));
            } catch (e) {
                console.error("Error during preset parsing:", e);
            }
        }

        loadPreset(FACTORY_PRESETS[0].id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <PresetContext.Provider value={{
            presets: allPresets,
            activePreset,
            loadPreset,

            attackData,
            setAttackData,
            decayData,
            setDecayData,
            releaseData,
            setReleaseData,

            saveUserPreset,
            deleteUserPreset,
            exportPresetToFile,
            importPresetFromFile
        }}>
            {children}
        </PresetContext.Provider>
    );
};