export type OscillatorType = 'custom' | 'sine' | 'square' | 'triangle' | 'sawtooth';

export type Envelope = {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    attackCurve?: number[];
    decayCurve?: number[];
    releaseCurve?: number[];
};

export type InstrumentConfig = {
    id: string;
    name: string;
    volume: number;
    oscillatorType: OscillatorType;
    partials: number[];
    envelope: {
        attack: number; decay: number; sustain: number; release: number;
        attackCurve?: number[]; decayCurve?: number[]; releaseCurve?: number[];
    };
    phase?: number;
    customRatios?: { ratio: number; amplitude: number }[];
    lfo?: {
        frequency: number;
        amount: number;
        target: 'pitch' | 'filter' | 'volume';
        delay?: number;
    };
    noiseLayer?: {
        type: 'white' | 'pink';
        volume: number;
        envelope: {
            attack: number; decay: number; sustain: number; release: number;
            attackCurve?: number[]; decayCurve?: number[]; releaseCurve?: number[];
        };
        filterCutoff?: number;
    };
    filter?: {
        type: BiquadFilterType;
        cutoff: number;
        envelopeAmount: number;
        attack: number;
        decay: number;
        attackCurve?: number[];
        decayCurve?: number[];
        velocitySensitivity?: number;
    };
    keyTracking?: {
        centerNote: string;
        decayScaling: number;
    };
};