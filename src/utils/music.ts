export type Note = {
    note: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';
    octave: number;
    alteration: '' | '♯' | '♭';
    frequency: number;
}

export const notes: Note[] = [
    {note: 'c', octave: 3, alteration: '', frequency: 130.81},
    {note: 'c', octave: 3, alteration: '♯', frequency: 138.59},
    {note: 'd', octave: 3, alteration: '', frequency: 146.83},
    {note: 'e', octave: 3, alteration: '♭', frequency: 155.56},
    {note: 'e', octave: 3, alteration: '', frequency: 164.81},
    {note: 'f', octave: 3, alteration: '', frequency: 174.61},
    {note: 'f', octave: 3, alteration: '♯', frequency: 185.00},
    {note: 'g', octave: 3, alteration: '', frequency: 196.00},
    {note: 'g', octave: 3, alteration: '♯', frequency: 207.65},
    {note: 'a', octave: 3, alteration: '', frequency: 220.00},
    {note: 'b', octave: 3, alteration: '♭', frequency: 233.08},
    {note: 'b', octave: 3, alteration: '', frequency: 246.94},
    {note: 'c', octave: 4, alteration: '', frequency: 261.63},
    {note: 'c', octave: 4, alteration: '♯', frequency: 277.18},
    {note: 'd', octave: 4, alteration: '', frequency: 293.66},
    {note: 'e', octave: 4, alteration: '♭', frequency: 311.13},
    {note: 'e', octave: 4, alteration: '', frequency: 329.63},
    {note: 'f', octave: 4, alteration: '', frequency: 349.23},
    {note: 'f', octave: 4, alteration: '♯', frequency: 369.99},
    {note: 'g', octave: 4, alteration: '', frequency: 392.00},
    {note: 'g', octave: 4, alteration: '♯', frequency: 415.30},
    {note: 'a', octave: 4, alteration: '', frequency: 440.00},
    {note: 'b', octave: 4, alteration: '♭', frequency: 466.16},
    {note: 'b', octave: 4, alteration: '', frequency: 493.88},
    {note: 'c', octave: 5, alteration: '', frequency: 523.25},
    {note: 'c', octave: 5, alteration: '♯', frequency: 554.37},
    {note: 'd', octave: 5, alteration: '', frequency: 587.33},
    {note: 'e', octave: 5, alteration: '♭', frequency: 622.25},
    {note: 'e', octave: 5, alteration: '', frequency: 659.25},
    {note: 'f', octave: 5, alteration: '', frequency: 698.46},
    {note: 'f', octave: 5, alteration: '♯', frequency: 739.99},
    {note: 'g', octave: 5, alteration: '', frequency: 783.99},
    {note: 'g', octave: 5, alteration: '♯', frequency: 830.61},
    {note: 'a', octave: 5, alteration: '', frequency: 880.00},
    {note: 'b', octave: 5, alteration: '♭', frequency: 932.33},
    {note: 'b', octave: 5, alteration: '', frequency: 987.77},
    {note: 'c', octave: 6, alteration: '', frequency: 1046.50},
    {note: 'c', octave: 6, alteration: '♯', frequency: 1108.73},
    {note: 'd', octave: 6, alteration: '', frequency: 1174.66},
    {note: 'e', octave: 6, alteration: '♭', frequency: 1244.51},
    {note: 'e', octave: 6, alteration: '', frequency: 1318.51},
    {note: 'f', octave: 6, alteration: '', frequency: 1396.91},
    {note: 'f', octave: 6, alteration: '♯', frequency: 1479.98},
    {note: 'g', octave: 6, alteration: '', frequency: 1568.00},
    {note: 'g', octave: 6, alteration: '♯', frequency: 1661.22},
    {note: 'a', octave: 6, alteration: '', frequency: 1760.00},
    {note: 'b', octave: 6, alteration: '♭', frequency: 1864.66},
    {note: 'b', octave: 6, alteration: '', frequency: 1975.53},
    {note: 'c', octave: 7, alteration: '', frequency: 2093.00}
]

export const commonNotes: Note[] = [
    notes[12], // c4
    notes[14], // d4
    notes[16], // e4
    notes[17], // f4
    notes[19], // g4
    notes[21], // a4
    notes[23], // b4
    notes[24], // c5
];

export function sameNote(n1: Note, n2: Note): boolean {
    return n1.note === n2.note && n1.octave === n2.octave && n1.alteration === n2.alteration;
}