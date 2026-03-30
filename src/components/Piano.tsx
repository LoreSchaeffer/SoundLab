import styles from "./Piano.module.css";
import React, {useEffect, useMemo, useRef} from "react";
import clsx from "clsx";

type KeyType = 'white' | 'black';

type NoteDef = {
    note: string;
    type: KeyType;
}

type PianoProps = {
    playNote: (note: string) => void;
    releaseNote: (note: string) => void;
    activeNotes: Set<string>;
    startNote?: string;
    endNote?: string;
    showNotes?: boolean;
    showKeys?: boolean;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const generateKeys = (start: string, end: string): NoteDef[] => {
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

        const noteIndex = NOTES.indexOf(noteName);
        if (noteIndex === 11) current = `C${octave + 1}`;
        else current = `${NOTES[noteIndex + 1]}${octave}`;

        if (keys.length > 88) break;
    }
    return keys;
};

const Piano = ({
                   playNote,
                   releaseNote,
                   activeNotes,
                   startNote = 'C4',
                   endNote = 'C5',
                   showNotes = true,
                   showKeys = true
               }: PianoProps) => {
    const isDragging = useRef(false);

    const {pianoKeys, keyboardMap, reverseKeyboardMap} = useMemo(() => {
        const generatedKeys = generateKeys(startNote, endNote);

        const WHITE_CHARS = "zxcvbnm,.-qwertyuiopè+";
        const BLACK_CHARS = "asdfhjklòàù1234567890";

        const map: Record<string, string> = {};
        const reverseMap: Record<string, string> = {};

        let wIndex = 0;
        let bIndex = 0;

        generatedKeys.forEach(key => {
            if (key.type === 'white' && wIndex < WHITE_CHARS.length) {
                const char = WHITE_CHARS[wIndex];
                map[char] = key.note;
                reverseMap[key.note] = char.toUpperCase();
                wIndex++;
            } else if (key.type === 'black' && bIndex < BLACK_CHARS.length) {
                const char = BLACK_CHARS[bIndex];
                map[char] = key.note;
                reverseMap[key.note] = char.toUpperCase();
                bIndex++;
            }
        });

        return {
            pianoKeys: generatedKeys,
            keyboardMap: map,
            reverseKeyboardMap: reverseMap
        };
    }, [startNote, endNote]);

    useEffect(() => {
        const handleGlobalMouseUp = () => isDragging.current = false;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const note = keyboardMap[e.key.toLowerCase()];
            if (note) playNote(note);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const note = keyboardMap[e.key.toLowerCase()];
            if (note) releaseNote(note);
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [playNote, releaseNote, keyboardMap]);

    const handleMouseDown = (note: string, e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        isDragging.current = true;
        playNote(note);
    };

    const handleMouseEnter = (note: string) => {
        if (isDragging.current) playNote(note);
    };

    const handleMouseLeave = (note: string) => {
        releaseNote(note);
    };

    const handleMouseUp = (note: string, e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        releaseNote(note);
    };

    return (
        <div className={styles.container}>
            <div className={styles.keyboardWrapper}>
                {pianoKeys.map(({note, type}) => {
                    const isActive = activeNotes.has(note);
                    const isWhite = type === 'white';
                    const keyChar = reverseKeyboardMap[note];

                    return (
                        <div
                            key={note}
                            className={clsx(
                                styles.key,
                                isWhite ? styles.keyWhite : styles.keyBlack,
                                isActive && styles.active
                            )}
                            onMouseDown={(e) => handleMouseDown(note, e)}
                            onMouseEnter={() => handleMouseEnter(note)}
                            onMouseLeave={() => handleMouseLeave(note)}
                            onMouseUp={(e) => handleMouseUp(note, e)}
                            onTouchStart={(e) => handleMouseDown(note, e)}
                            onTouchEnd={(e) => handleMouseUp(note, e)}
                        >
                            {showKeys && keyChar && <span className={styles.labelTop}>{keyChar}</span>}
                            {showNotes && <span className={styles.labelBottom}>{note}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Piano;