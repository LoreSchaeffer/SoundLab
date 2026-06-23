import styles from "./Piano.module.css";
import React, {useEffect, useMemo, useRef} from "react";
import clsx from "clsx";
import {NOTE_NAMES} from "../../types";

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

        const noteIndex = NOTE_NAMES.indexOf(noteName);
        if (noteIndex === 11) current = `C${octave + 1}`;
        else current = `${NOTE_NAMES[noteIndex + 1]}${octave}`;

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
        const handleGlobalPointerUp = () => isDragging.current = false;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

            const note = keyboardMap[e.key.toLowerCase()];
            if (note) playNote(note);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

            const note = keyboardMap[e.key.toLowerCase()];
            if (note) releaseNote(note);
        };

        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [playNote, releaseNote, keyboardMap]);

    const handlePointerDown = (note: string, e: React.PointerEvent) => {
        e.preventDefault();
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        isDragging.current = true;
        playNote(note);
    };

    const handlePointerEnter = (note: string, e: React.PointerEvent) => {
        if (isDragging.current || e.buttons > 0) {
            isDragging.current = true;
            playNote(note);
        }
    };

    const handlePointerLeave = (note: string) => {
        releaseNote(note);
    };

    const handlePointerUp = (note: string, e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
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
                            onPointerDown={(e) => handlePointerDown(note, e)}
                            onPointerEnter={(e) => handlePointerEnter(note, e)}
                            onPointerLeave={() => handlePointerLeave(note)}
                            onPointerUp={(e) => handlePointerUp(note, e)}
                            onPointerCancel={(e) => handlePointerUp(note, e)}
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