import React, {useEffect, useState} from 'react';
import styles from './NoteGrid.module.css';
import {type Track, useSequencer} from '../../contexts/SequencerContext.ts';
import {BEAT_WIDTH, KEY_HEIGHT, PIANO_ROLL_HEIGHT, PIANO_ROLL_KEYS} from "../../utils/sequencer.ts";

type NoteGridProps = {
    track: Track;
};

const SNAP_RESOLUTION = 4;

const NoteGrid = ({track}: NoteGridProps) => {
    const {addNote, removeNote, updateNote, totalBeats, playheadBeat} = useSequencer();

    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize';
        noteId: string;
        startX: number;
        startY: number;
        origStartBeat: number;
        origDuration: number;
        origKeyIndex: number;
    } | null>(null);

    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;

            const deltaBeats = Math.round((deltaX / BEAT_WIDTH) * SNAP_RESOLUTION) / SNAP_RESOLUTION;
            const deltaKeys = Math.round(deltaY / KEY_HEIGHT);

            if (dragState.type === 'move') {
                const newStart = Math.max(0, dragState.origStartBeat + deltaBeats);
                const newKeyIdx = Math.max(0, Math.min(PIANO_ROLL_KEYS.length - 1, dragState.origKeyIndex + deltaKeys));

                updateNote(track.id, dragState.noteId, {
                    startBeat: newStart,
                    pitch: PIANO_ROLL_KEYS[newKeyIdx].note
                });
            } else if (dragState.type === 'resize') {
                const newDuration = Math.max(0.25, dragState.origDuration + deltaBeats);
                updateNote(track.id, dragState.noteId, {
                    durationBeats: newDuration
                });
            }
        };

        const handleMouseUp = () => setDragState(null);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, track.id, updateNote]);

    const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const beat = Math.floor((x / BEAT_WIDTH) * SNAP_RESOLUTION) / SNAP_RESOLUTION;
        const keyIndex = Math.floor(y / KEY_HEIGHT);
        const pitch = PIANO_ROLL_KEYS[keyIndex]?.note;

        if (pitch) {
            addNote(track.id, {pitch, startBeat: beat, durationBeats: 1, velocity: 0.8});
        }
    };

    const handleNoteMouseDown = (e: React.MouseEvent, noteId: string, isResize: boolean) => {
        e.stopPropagation();
        if (e.button !== 0) return;

        const note = track.notes.find(n => n.id === noteId);
        if (!note) return;

        const keyIndex = PIANO_ROLL_KEYS.findIndex(k => k.note === note.pitch);

        setDragState({
            type: isResize ? 'resize' : 'move',
            noteId: note.id,
            startX: e.clientX,
            startY: e.clientY,
            origStartBeat: note.startBeat,
            origDuration: note.durationBeats,
            origKeyIndex: keyIndex
        });
    };

    const handleNoteContextMenu = (e: React.MouseEvent, noteId: string) => {
        e.preventDefault();
        e.stopPropagation();
        removeNote(track.id, noteId);
    };

    return (
        <div
            className={styles.container}
            style={{
                width: `${totalBeats * BEAT_WIDTH}px`,
                height: `${PIANO_ROLL_HEIGHT}px`
            }}
            onMouseDown={handleGridClick}
            onContextMenu={(e) => e.preventDefault()}
        >
            {track.notes.map(note => {
                const keyIndex = PIANO_ROLL_KEYS.findIndex(k => k.note === note.pitch);
                if (keyIndex === -1) return null;

                return (
                    <div
                        key={note.id}
                        className={styles.noteBlock}
                        style={{
                            left: `${note.startBeat * BEAT_WIDTH}px`,
                            top: `${keyIndex * KEY_HEIGHT}px`,
                            width: `${note.durationBeats * BEAT_WIDTH}px`,
                            height: `${KEY_HEIGHT}px`
                        }}
                        onMouseDown={(e) => handleNoteMouseDown(e, note.id, false)}
                        onContextMenu={(e) => handleNoteContextMenu(e, note.id)}
                    >
                        <div
                            className={styles.resizeHandle}
                            onMouseDown={(e) => handleNoteMouseDown(e, note.id, true)}
                        />
                    </div>
                );
            })}

            <div
                className={styles.playhead}
                style={{transform: `translateX(${playheadBeat * BEAT_WIDTH}px)`}}
            />
        </div>
    );
};

export default NoteGrid;