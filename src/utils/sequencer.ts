import {noteNames} from '../types';

export const BEAT_WIDTH = 30;
export const KEY_HEIGHT = 18;

export const PIANO_ROLL_START_NOTE = 'C3';
export const PIANO_ROLL_END_NOTE = 'C6';

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

        const noteIndex = noteNames.indexOf(noteName);
        if (noteIndex === 11) current = `C${octave + 1}`;
        else current = `${noteNames[noteIndex + 1]}${octave}`;

        if (keys.length > 88) break;
    }
    return keys;
};

export const PIANO_ROLL_KEYS = generateKeys(PIANO_ROLL_START_NOTE, PIANO_ROLL_END_NOTE).reverse();
export const PIANO_ROLL_HEIGHT = PIANO_ROLL_KEYS.length * KEY_HEIGHT;