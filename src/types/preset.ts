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

export type InstrumentPreset = {
    id: string;
    name: string;
    isFactory?: boolean;
    oscillatorType: OscillatorType;
    partials: number[];
    attack: PhaseState;
    decay: PhaseState;
    release: PhaseState;
};