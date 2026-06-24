import type {InstrumentConfig} from "../types";

export const createDefaultInstrument = (id: string, name: string): InstrumentConfig => ({
    id,
    name,
    volume: 0.8,
    oscillatorType: 'sine',
    partials: [1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.5,
        release: 1.0
    },
    filter: {
        type: 'lowpass',
        cutoff: 20000,
        envelopeAmount: 0,
        attack: 0.01,
        decay: 0.1
    },
    keyTracking: {
        centerNote: 'A4',
        decayScaling: 0
    }
});