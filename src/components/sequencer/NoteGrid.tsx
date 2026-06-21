import React, {useEffect, useRef, useState} from 'react';
import styles from './NoteGrid.module.css';
import {type Track, useSequencer} from '../../contexts/SequencerContext.ts';
import {PIANO_ROLL_HEIGHT, PIANO_ROLL_KEYS, UI} from "../../utils/sequencer.ts";
import clsx from "clsx";

const SNAP_RESOLUTION = 4;

function useGridInteraction(
    track: Track,
    onPreviewNote?: (pitch: string) => void
) {
    const {addNote, addNotes, removeNote, updateNote, clipboard, setClipboard} = useSequencer();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [boxSelection, setBoxSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize';
        startX: number;
        startY: number;
        notesOrig: { id: string; origStartBeat: number; origDuration: number; origKeyIndex: number; }[];
    } | null>(null);

    const hoverBeatRef = useRef<number>(0);

    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;
            const deltaBeats = Math.round((deltaX / UI.BEAT_WIDTH) * SNAP_RESOLUTION) / SNAP_RESOLUTION;
            const deltaKeys = Math.round(deltaY / UI.KEY_HEIGHT);

            dragState.notesOrig.forEach(orig => {
                if (dragState.type === 'move') {
                    const newStart = Math.max(0, orig.origStartBeat + deltaBeats);
                    const newKeyIdx = Math.max(0, Math.min(PIANO_ROLL_KEYS.length - 1, orig.origKeyIndex + deltaKeys));
                    updateNote(track.id, orig.id, {startBeat: newStart, pitch: PIANO_ROLL_KEYS[newKeyIdx].note});
                } else if (dragState.type === 'resize') {
                    const newDuration = Math.max(0.25, orig.origDuration + deltaBeats);
                    updateNote(track.id, orig.id, {durationBeats: newDuration});
                }
            });
        };

        const handleMouseUp = () => setDragState(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, track.id, updateNote]);

    const onGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const startY = e.clientY - rect.top;
        let hasMoved = false;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            hasMoved = true;
            const currentX = moveEvent.clientX - rect.left;
            const currentY = moveEvent.clientY - rect.top;

            const minX = Math.min(startX, currentX);
            const maxX = Math.max(startX, currentX);
            const minY = Math.min(startY, currentY);
            const maxY = Math.max(startY, currentY);

            setBoxSelection({x: minX, y: minY, w: maxX - minX, h: maxY - minY});

            const newSelected = new Set<string>();
            track.notes.forEach(note => {
                const keyIndex = PIANO_ROLL_KEYS.findIndex(k => k.note === note.pitch);
                const noteX1 = note.startBeat * UI.BEAT_WIDTH;
                const noteX2 = noteX1 + (note.durationBeats * UI.BEAT_WIDTH);
                const noteY1 = keyIndex * UI.KEY_HEIGHT;
                const noteY2 = noteY1 + UI.KEY_HEIGHT;

                if (!(maxX < noteX1 || minX > noteX2 || maxY < noteY1 || minY > noteY2)) {
                    newSelected.add(note.id);
                }
            });

            setSelectedIds(e.shiftKey || e.metaKey || e.ctrlKey ? new Set([...selectedIds, ...newSelected]) : newSelected);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            setBoxSelection(null);

            if (!hasMoved) {
                const beat = Math.floor(startX / UI.BEAT_WIDTH);
                const keyIndex = Math.floor(startY / UI.KEY_HEIGHT);
                const pitch = PIANO_ROLL_KEYS[keyIndex]?.note;

                if (pitch) {
                    addNote(track.id, {pitch, startBeat: beat, durationBeats: 1, velocity: 0.8});
                    onPreviewNote?.(pitch);
                }
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) setSelectedIds(new Set());
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const onNoteMouseDown = (e: React.MouseEvent, noteId: string, isResize: boolean) => {
        e.stopPropagation();
        if (e.button !== 0) return;

        const note = track.notes.find(n => n.id === noteId);
        if (!note) return;

        let newSelected = new Set(selectedIds);
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (newSelected.has(noteId)) newSelected.delete(noteId);
            else newSelected.add(noteId);

            setSelectedIds(newSelected);
        } else if (!newSelected.has(noteId)) {
            newSelected = new Set([noteId]);
            setSelectedIds(newSelected);
        }

        const notesOrig = track.notes.filter(n => newSelected.has(n.id)).map(n => ({
            id: n.id,
            origStartBeat: n.startBeat,
            origDuration: n.durationBeats,
            origKeyIndex: PIANO_ROLL_KEYS.findIndex(k => k.note === n.pitch)
        }));

        setDragState({type: isResize ? 'resize' : 'move', startX: e.clientX, startY: e.clientY, notesOrig});
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const isCtrl = e.ctrlKey || e.metaKey;

        if (isCtrl && e.key === 'c') {
            e.preventDefault();
            const notesToCopy = track.notes.filter(n => selectedIds.has(n.id));
            if (notesToCopy.length > 0) {
                const minBeat = Math.min(...notesToCopy.map(n => n.startBeat));
                setClipboard(notesToCopy.map(n => ({...n, startBeat: n.startBeat - minBeat})));
            }
        } else if (isCtrl && e.key === 'v') {
            e.preventDefault();
            if (clipboard && clipboard.length > 0) {
                const pasteBeat = hoverBeatRef.current;
                addNotes(track.id, clipboard.map(note => ({...note, startBeat: pasteBeat + note.startBeat})));
            }
        } else if (selectedIds.size > 0) {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                selectedIds.forEach(id => removeNote(track.id, id));
                setSelectedIds(new Set());
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedIds(new Set());
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const delta = e.key === 'ArrowRight' ? (1 / SNAP_RESOLUTION) : -(1 / SNAP_RESOLUTION);
                selectedIds.forEach(id => {
                    const n = track.notes.find(n => n.id === id);
                    if (n) updateNote(track.id, id, {startBeat: Math.max(0, n.startBeat + delta)});
                });
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const delta = e.key === 'ArrowUp' ? -1 : 1;
                selectedIds.forEach(id => {
                    const n = track.notes.find(n => n.id === id);
                    if (!n) return;
                    const origIdx = PIANO_ROLL_KEYS.findIndex(k => k.note === n.pitch);
                    if (origIdx !== -1) {
                        const newIdx = Math.max(0, Math.min(PIANO_ROLL_KEYS.length - 1, origIdx + delta));
                        updateNote(track.id, id, {pitch: PIANO_ROLL_KEYS[newIdx].note});
                    }
                });
            }
        }
    };

    return {selectedIds, boxSelection, hoverBeatRef, onGridMouseDown, onNoteMouseDown, onKeyDown};
}

type NoteGridProps = {
    track: Track;
    hoveredNote?: string | null;
    onPreviewNote?: (pitch: string) => void;
    onHoverNote?: (pitch: string | null) => void;
};

const NoteGrid = ({
                      track,
                      hoveredNote,
                      onPreviewNote,
                      onHoverNote
                  }: NoteGridProps) => {

    const {totalBeats, removeNote} = useSequencer();
    const containerRef = useRef<HTMLDivElement>(null);

    const {selectedIds, boxSelection, hoverBeatRef, onGridMouseDown, onNoteMouseDown, onKeyDown} = useGridInteraction(track, onPreviewNote);

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            className={styles.container}
            style={{
                width: `${totalBeats * UI.BEAT_WIDTH}px`,
                height: `${PIANO_ROLL_HEIGHT}px`
            } as React.CSSProperties}
            onMouseDown={(e) => {
                containerRef.current?.focus();
                onGridMouseDown(e);
            }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                hoverBeatRef.current = Math.floor((e.clientX - rect.left) / UI.BEAT_WIDTH);
                onHoverNote?.(PIANO_ROLL_KEYS[Math.floor((e.clientY - rect.top) / UI.KEY_HEIGHT)]?.note || null);
            }}
            onMouseLeave={() => onHoverNote?.(null)}
            onKeyDown={onKeyDown}
        >

            {hoveredNote && (
                <div
                    className={styles.hoveredRow}
                    style={{
                        top: `${PIANO_ROLL_KEYS.findIndex(k => k.note === hoveredNote) * UI.KEY_HEIGHT}px`,
                        height: `var(--key-height)`
                    } as React.CSSProperties}
                />
            )}

            {boxSelection && (
                <div
                    className={styles.selectionBox}
                    style={{
                        left: `${boxSelection.x}px`,
                        top: `${boxSelection.y}px`,
                        width: `${boxSelection.w}px`,
                        height: `${boxSelection.h}px`
                    } as React.CSSProperties}
                />
            )}

            {track.notes.map(note => {
                const keyIndex = PIANO_ROLL_KEYS.findIndex(k => k.note === note.pitch);
                if (keyIndex === -1) return null;

                return (
                    <div
                        key={note.id}
                        className={clsx(styles.noteBlock, selectedIds.has(note.id) && styles.selected)}
                        style={{
                            left: `${note.startBeat * UI.BEAT_WIDTH}px`,
                            top: `${keyIndex * UI.KEY_HEIGHT}px`,
                            width: `${note.durationBeats * UI.BEAT_WIDTH}px`,
                            height: `var(--key-height)`
                        } as React.CSSProperties}
                        onMouseDown={(e) => onNoteMouseDown(e, note.id, false)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeNote(track.id, note.id);
                        }}
                    >
                        <div
                            className={styles.resizeHandle}
                            onMouseDown={(e) => onNoteMouseDown(e, note.id, true)}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default NoteGrid;