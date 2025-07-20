export type Note = {
    note: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';
    octave: number;
    alteration: '' | '♯' | '♭';
    frequency: number;
}

export const notes: Record<string, Note> = {
    'C3': {note: 'c', octave: 3, alteration: '', frequency: 130.81},
    'C#3': {note: 'c', octave: 3, alteration: '♯', frequency: 138.59},
    'D3': {note: 'd', octave: 3, alteration: '', frequency: 146.83},
    'Eb3': {note: 'e', octave: 3, alteration: '♭', frequency: 155.56},
    'E3': {note: 'e', octave: 3, alteration: '', frequency: 164.81},
    'F3': {note: 'f', octave: 3, alteration: '', frequency: 174.61},
    'F#3': {note: 'f', octave: 3, alteration: '♯', frequency: 185.00},
    'G3': {note: 'g', octave: 3, alteration: '', frequency: 196.00},
    'G#3': {note: 'g', octave: 3, alteration: '♯', frequency: 207.65},
    'A3': {note: 'a', octave: 3, alteration: '', frequency: 220.00},
    'Bb3': {note: 'b', octave: 3, alteration: '♭', frequency: 233.08},
    'B3': {note: 'b', octave: 3, alteration: '', frequency: 246.94},
    'C4': {note: 'c', octave: 4, alteration: '', frequency: 261.63},
    'C#4': {note: 'c', octave: 4, alteration: '♯', frequency: 277.18},
    'D4': {note: 'd', octave: 4, alteration: '', frequency: 293.66},
    'Eb4': {note: 'e', octave: 4, alteration: '♭', frequency: 311.13},
    'E4': {note: 'e', octave: 4, alteration: '', frequency: 329.63},
    'F4': {note: 'f', octave: 4, alteration: '', frequency: 349.23},
    'F#4': {note: 'f', octave: 4, alteration: '♯', frequency: 369.99},
    'G4': {note: 'g', octave: 4, alteration: '', frequency: 392.00},
    'G#4': {note: 'g', octave: 4, alteration: '♯', frequency: 415.30},
    'A4': {note: 'a', octave: 4, alteration: '', frequency: 440.00},
    'Bb4': {note: 'b', octave: 4, alteration: '♭', frequency: 466.16},
    'B4': {note: 'b', octave: 4, alteration: '', frequency: 493.88},
    'C5': {note: 'c', octave: 5, alteration: '', frequency: 523.25},
    'C#5': {note: 'c', octave: 5, alteration: '♯', frequency: 554.37},
    'D5': {note: 'd', octave: 5, alteration: '', frequency: 587.33},
    'Eb5': {note: 'e', octave: 5, alteration: '♭', frequency: 622.25},
    'E5': {note: 'e', octave: 5, alteration: '', frequency: 659.25},
    'F5': {note: 'f', octave: 5, alteration: '', frequency: 698.46},
    'F#5': {note: 'f', octave: 5, alteration: '♯', frequency: 739.99},
    'G5': {note: 'g', octave: 5, alteration: '', frequency: 783.99},
    'G#5': {note: 'g', octave: 5, alteration: '♯', frequency: 830.61},
    'A5': {note: 'a', octave: 5, alteration: '', frequency: 880.00},
    'Bb5': {note: 'b', octave: 5, alteration: '♭', frequency: 932.33},
    'B5': {note: 'b', octave: 5, alteration: '', frequency: 987.77},
    'C6': {note: 'c', octave: 6, alteration: '', frequency: 1046.50},
    'C#6': {note: 'c', octave: 6, alteration: '♯', frequency: 1108.73},
    'D6': {note: 'd', octave: 6, alteration: '', frequency: 1174.66},
    'Eb6': {note: 'e', octave: 6, alteration: '♭', frequency: 1244.51},
    'E6': {note: 'e', octave: 6, alteration: '', frequency: 1318.51},
    'F6': {note: 'f', octave: 6, alteration: '', frequency: 1396.91},
    'F#6': {note: 'f', octave: 6, alteration: '♯', frequency: 1479.98},
    'G6': {note: 'g', octave: 6, alteration: '', frequency: 1568.00},
    'G#6': {note: 'g', octave: 6, alteration: '♯', frequency: 1661.22},
    'A6': {note: 'a', octave: 6, alteration: '', frequency: 1760.00},
    'Bb6': {note: 'b', octave: 6, alteration: '♭', frequency: 1864.66},
    'B6': {note: 'b', octave: 6, alteration: '', frequency: 1975.53},
    'C7': {note: 'c', octave: 7, alteration: '', frequency: 2093.00}
}

export const commonNotes: Note[] = [
    notes.C4,
    notes.D4,
    notes.E4,
    notes.F4,
    notes.G4,
    notes.A4,
    notes.B4,
    notes.C5,
];

export function sameNote(n1: Note, n2: Note): boolean {
    return n1.note === n2.note && n1.octave === n2.octave && n1.alteration === n2.alteration;
}

export function noteToString(note: Note): string {
    const alteration = note.alteration !== '' ? note.alteration === '♯' ? '#' : 'b' : '';
    return `${note.note.toUpperCase()}${alteration}${note.octave}`;
}

export function noteFromString(note: string): Note | null {
    const match = note.match(/^([A-Ga-g])([#b]?)(\d)$/);
    if (!match) return null;

    const noteName = match[1].toLowerCase();
    const alteration = match[2] === '#' ? '♯' : (match[2] === 'b' ? '♭' : '');
    const octave = parseInt(match[3], 10);

    if (!notes[`${noteName.toUpperCase()}${alteration}${octave}`]) return null;

    return {
        note: noteName as Note['note'],
        octave,
        alteration,
        frequency: notes[`${noteName.toUpperCase()}${alteration}${octave}`].frequency
    };
}

export function sequenceToString(sequence: Record<number, Note[]>): Record<number, string[]> {
    const result: Record<number, string[]> = {};
    for (const [key, notesArray] of Object.entries(sequence)) {
        result[parseInt(key)] = notesArray.map(note => noteToString(note));
    }
    return result;
}

export function sequenceFromString(sequence: Record<number, string[]>): Record<number, Note[]> {
    const result: Record<number, Note[]> = {};
    for (const [key, notesArray] of Object.entries(sequence)) {
        result[parseInt(key)] = notesArray.map(noteStr => noteFromString(noteStr)).filter(note => note !== null) as Note[];
    }
    return result;
}