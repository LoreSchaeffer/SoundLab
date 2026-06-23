import {NOTE_NAMES} from "../types";

export type MidiParsedMessage = {
    type: 'noteon' | 'noteoff' | 'cc' | 'pitchbend' | 'unknown';
    note?: string;
    velocity?: number;
    ccNumber?: number;
    ccValue?: number;
};

export const midiNoteToString = (midiNote: number): string => {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = NOTE_NAMES[midiNote % 12];
    return `${noteName}${octave}`;
};

export const parseMidiMessage = (data: Uint8Array): MidiParsedMessage => {
    const status = data[0] >> 4;
    const data1 = data[1];
    const data2 = data[2];

    switch (status) {
        case 9: // Note On
            if (data2 === 0) return {type: 'noteoff', note: midiNoteToString(data1)};
            else return {type: 'noteon', note: midiNoteToString(data1), velocity: data2 / 127};
        case 8: // Note Off
            return {type: 'noteoff', note: midiNoteToString(data1)};
        case 11: // Control Change (CC) - es. Pedale Sustain o Manopole
            return {type: 'cc', ccNumber: data1, ccValue: data2 / 127};
        case 14: // Pitch Bend
        {
            const bend = ((data2 << 7) + data1) / 8192 - 1;
            return {type: 'pitchbend', ccValue: bend};
        }
        default:
            return {type: 'unknown'};
    }
};