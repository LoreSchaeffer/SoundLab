import styles from './VerticalPiano.module.css';
import React, {forwardRef} from 'react';
import clsx from 'clsx';
import {KEY_HEIGHT, PIANO_ROLL_KEYS} from "../../utils/sequencer.ts";

type VerticalPianoProps = {
    playingNotes?: Set<string>;
    hoveredNote?: string | null;
    onNotePlay?: (note: string) => void;
    onNoteRelease?: (note: string) => void;
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const VerticalPiano = forwardRef<HTMLDivElement, VerticalPianoProps>((({
                                                                           playingNotes = new Set(),
                                                                           hoveredNote,
                                                                           onNotePlay,
                                                                           onNoteRelease,
                                                                           onScroll
                                                                       }, ref) => {

    return (
        <div
            className={styles.container}
            ref={ref}
            onScroll={onScroll}
            style={{'--key-height': `${KEY_HEIGHT}px`} as React.CSSProperties}
        >
            {PIANO_ROLL_KEYS.map(({note, type}) => {
                const isActive = playingNotes.has(note);
                const isHovered = hoveredNote === note;

                return (
                    <div
                        key={note}
                        className={clsx(
                            styles.key,
                            type === 'white' ? styles.keyWhite : styles.keyBlack,
                            isActive && styles.active,
                            !isActive && isHovered && (type === 'white' ? styles.hoveredWhite : styles.hoveredBlack)
                        )}
                        onMouseDown={() => onNotePlay?.(note)}
                        onMouseUp={() => onNoteRelease?.(note)}
                        onMouseLeave={() => onNoteRelease?.(note)}
                    >
                        {note.includes('C') && !note.includes('#') ? note : ''}
                    </div>
                );
            })}
        </div>
    );
}));

export default VerticalPiano;