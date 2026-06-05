import type {InstrumentConfig} from "../types/audio.ts";

export const createDefaultInstrument = (id: string, name: string): InstrumentConfig => ({
    id,
    name,
    volume: 0.8,
    oscillatorType: 'sine',
    partials: [1.0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.5,
        release: 1.0
    }
});