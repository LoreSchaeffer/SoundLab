export const commonNotes = [
    {note: 'C', alteration: '4', frequency: 261.63},
    {note: 'D', alteration: '4', frequency: 293.66},
    {note: 'E', alteration: '4', frequency: 329.63},
    {note: 'F', alteration: '4', frequency: 349.23},
    {note: 'G', alteration: '4', frequency: 392.00},
    {note: 'A', alteration: '4', frequency: 440.00},
    {note: 'B', alteration: '4', frequency: 493.88},
    {note: 'C', alteration: '5', frequency: 523.25}
];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export type ScaleType = 'major' | 'minor' | 'chromatic' | 'pentatonic_major' | 'pentatonic_minor';

export const SCALES: Record<ScaleType, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    pentatonic_major: [0, 2, 4, 7, 9],
    pentatonic_minor: [0, 3, 5, 7, 10]
};

export const getNoteBaseIndex = (note: string) => {
    const cleanNote = note.replace(/\d+$/, '');
    return NOTE_NAMES.indexOf(cleanNote);
};

export const isNoteInScale = (note: string, root: string, scaleType: ScaleType) => {
    if (scaleType === 'chromatic') return true;

    const rootIdx = getNoteBaseIndex(root);
    const noteIdx = getNoteBaseIndex(note);
    if (rootIdx === -1 || noteIdx === -1) return true;

    const intervals = SCALES[scaleType];
    const relativeIdx = (noteIdx - rootIdx + 12) % 12;
    return intervals.includes(relativeIdx);
};