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
    id: string;              // Unique identifier
    name: string;            // Default Name (Used if translation is not available)
    volume: number;          // Channel volume
    oscillatorType: OscillatorType;
    partials: number[];
    envelope: Envelope;
};