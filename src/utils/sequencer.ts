import {NOTE_NAMES} from '../types';

export const UI = {
    BEAT_WIDTH: 30,
    KEY_HEIGHT: 16,
    TRACK_HEADER_WIDTH: 260,
    PIANO_SIDEBAR_WIDTH: 80,
    TOP_RULER_HEIGHT: 32
};

export const PIANO_ROLL_START_NOTE = 'C2';
export const PIANO_ROLL_END_NOTE = 'C7';

export type NoteDef = {
    note: string;
    type: 'white' | 'black';
};

export const generateKeys = (start: string, end: string): NoteDef[] => {
    const keys: NoteDef[] = [];
    let current = start;

    while (true) {
        const noteName = current.slice(0, -1);
        const octave = parseInt(current.slice(-1));

        keys.push({
            note: current,
            type: noteName.includes('#') ? 'black' : 'white'
        });

        if (current === end) break;

        const noteIndex = NOTE_NAMES.indexOf(noteName);
        if (noteIndex === 11) current = `C${octave + 1}`;
        else current = `${NOTE_NAMES[noteIndex + 1]}${octave}`;

        if (keys.length > 88) break;
    }
    return keys;
};

export const PIANO_ROLL_KEYS = generateKeys(PIANO_ROLL_START_NOTE, PIANO_ROLL_END_NOTE).reverse();
export const PIANO_ROLL_HEIGHT = PIANO_ROLL_KEYS.length * UI.KEY_HEIGHT;