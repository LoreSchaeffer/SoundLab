import type {Color} from "./colors.ts";
import type {Coord} from "./index.ts";

export type PhaseState = {
    time: number;
    color: Color;
    handle1: Coord;
    handle2: Coord;
    isAdvanced: boolean;
    points: Coord[];
};

export type KeyTrackingPreset = {
    centerNote: string;
    decayScaling: number;
};

// --- 1. LFO ---
export type LFOPreset = {
    frequency: number;                                      // Velocity of modulation (e.g. 5Hz)
    amount: number;                                         // Cents of a semitone
    target: 'pitch' | 'filter' | 'volume';
    delay?: number;                                         // Vibrato starts after X ms
};

// --- 2. NOISE ---
export type NoisePreset = {
    type: 'white' | 'pink';
    volume: number;
    envelope: PhaseState;
    filterCutoff?: number;                                  // To harden the blow/click
};

export type InstrumentPreset = {
    id: string;
    name: string;
    isFactory?: boolean;
    oscillatorType: OscillatorType;
    partials: number[];
    attack: PhaseState;
    decay: PhaseState;
    release: PhaseState;
    customRatios?: { ratio: number; amplitude: number }[];  // If present, this override partials
    lfo?: LFOPreset;
    noiseLayer?: NoisePreset;
    filter?: {
        type: BiquadFilterType;                             // 'lowpass', 'highpass', etc.
        cutoff: number;                                     // Base Frequency (Hz)
        envelopeAmount: number;                             // Filter opens at Hz (e.g. +8000)
        attack: PhaseState;
        decay: PhaseState;
        velocitySensitivity?: number;                       // 0 = fixed, 1 = opens if played forte
    };
    keyTracking?: KeyTrackingPreset;
};