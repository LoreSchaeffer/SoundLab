import React, {useEffect, useRef, useState} from 'react';
import styles from './NoteGrid.module.css';
import {type Track, useSequencer} from '../../contexts/SequencerContext.ts';
import {BEAT_WIDTH, KEY_HEIGHT, PIANO_ROLL_HEIGHT, PIANO_ROLL_KEYS} from "../../utils/sequencer.ts";
import clsx from "clsx";

type NoteGridProps = {
    track: Track;
    hoveredNote?: string | null;
    onPreviewNote?: (pitch: string) => void;
    onHoverNote?: (pitch: string | null) => void;
};

const SNAP_RESOLUTION = 4;

const NoteGrid = ({
                      track,
                      hoveredNote,
                      onPreviewNote,
                      onHoverNote
                  }: NoteGridProps) => {
    const {
        addNote,
        addNotes,
        removeNote,
        updateNote,
        totalBeats,
        playheadBeat,
        clipboard,
        setClipboard
    } = useSequencer();

    const containerRef = useRef<HTMLDivElement>(null);
    const hoverBeatRef = useRef<number>(0);

    const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
    const [boxSelection, setBoxSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize';
        startX: number;
        startY: number;
        notesOrig: { id: string; origStartBeat: number; origDuration: number; origKeyIndex: number; }[];
    } | null>(null);

    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;
            const deltaBeats = Math.round((deltaX / BEAT_WIDTH) * SNAP_RESOLUTION) / SNAP_RESOLUTION;
            const deltaKeys = Math.round(deltaY / KEY_HEIGHT);

            dragState.notesOrig.forEach(orig => {
                if (dragState.type === 'move') {
                    const newStart = Math.max(0, orig.origStartBeat + deltaBeats);
                    const newKeyIdx = Math.max(0, Math.min(PIANO_ROLL_KEYS.length - 1, orig.origKeyIndex + deltaKeys));
                    updateNote(
                        track.id,
                        orig.id,
                        {
                            startBeat: newStart,
                            pitch: PIANO_ROLL_KEYS[newKeyIdx].note
                        }
                    );
                } else if (dragState.type === 'resize') {
                    const newDuration = Math.max(0.25, orig.origDuration + deltaBeats);
                    updateNote(
                        track.id,
                        orig.id,
                        {
                            durationBeats: newDuration
                        }
                    );
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

    const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        containerRef.current?.focus();
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
                const noteX1 = note.startBeat * BEAT_WIDTH;
                const noteX2 = noteX1 + (note.durationBeats * BEAT_WIDTH);
                const noteY1 = keyIndex * KEY_HEIGHT;
                const noteY2 = noteY1 + KEY_HEIGHT;

                if (!(maxX < noteX1 || minX > noteX2 || maxY < noteY1 || minY > noteY2)) {
                    newSelected.add(note.id);
                }
            });

            if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
                setSelectedNoteIds(newSelected);
            } else {
                setSelectedNoteIds(new Set([...selectedNoteIds, ...newSelected]));
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            setBoxSelection(null);

            if (!hasMoved) {
                const beat = Math.floor(startX / BEAT_WIDTH);
                const keyIndex = Math.floor(startY / KEY_HEIGHT);
                const pitch = PIANO_ROLL_KEYS[keyIndex]?.note;

                if (pitch) {
                    addNote(
                        track.id,
                        {
                            pitch,
                            startBeat: beat,
                            durationBeats: 1,
                            velocity: 0.8
                        }
                    );
                    onPreviewNote?.(pitch);
                }
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    setSelectedNoteIds(new Set());
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        hoverBeatRef.current = Math.floor(x / BEAT_WIDTH);

        const keyIndex = Math.floor(y / KEY_HEIGHT);
        const pitch = PIANO_ROLL_KEYS[keyIndex]?.note || null;
        onHoverNote?.(pitch);
    };

    const handleGridMouseLeave = () => {
        onHoverNote?.(null);
    };

    const handleNoteMouseDown = (e: React.MouseEvent, noteId: string, isResize: boolean) => {
        e.stopPropagation();
        containerRef.current?.focus();
        if (e.button !== 0) return;

        const note = track.notes.find(n => n.id === noteId);
        if (!note) return;

        let newSelected = new Set(selectedNoteIds);
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (newSelected.has(noteId)) newSelected.delete(noteId);
            else newSelected.add(noteId);
            setSelectedNoteIds(newSelected);
        } else {
            if (!newSelected.has(noteId)) {
                newSelected = new Set([noteId]);
                setSelectedNoteIds(newSelected);
            }
        }

        const notesOrig = track.notes
            .filter(n => newSelected.has(n.id))
            .map(n => ({
                id: n.id,
                origStartBeat: n.startBeat,
                origDuration: n.durationBeats,
                origKeyIndex: PIANO_ROLL_KEYS.findIndex(k => k.note === n.pitch)
            }));

        setDragState({
            type: isResize ? 'resize' : 'move',
            startX: e.clientX,
            startY: e.clientY,
            notesOrig
        });
    };

    const handleNoteContextMenu = (e: React.MouseEvent, noteId: string) => {
        e.preventDefault();
        e.stopPropagation();
        removeNote(track.id, noteId);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const isCtrl = e.ctrlKey || e.metaKey;

        if (isCtrl && e.key === 'c') {
            e.preventDefault();
            const notesToCopy = track.notes.filter(n => selectedNoteIds.has(n.id));
            if (notesToCopy.length > 0) {
                const minBeat = Math.min(...notesToCopy.map(n => n.startBeat));
                const copied = notesToCopy.map(n => ({
                    pitch: n.pitch,
                    startBeat: n.startBeat - minBeat,
                    durationBeats: n.durationBeats,
                    velocity: n.velocity
                }));
                setClipboard(copied);
            }
        } else if (isCtrl && e.key === 'v') {
            e.preventDefault();
            if (clipboard && clipboard.length > 0) {
                const pasteBeat = hoverBeatRef.current;
                const newNotes = clipboard.map(note => ({
                    ...note,
                    startBeat: pasteBeat + note.startBeat
                }));
                addNotes(track.id, newNotes);
            }
        }

        if (selectedNoteIds.size === 0) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            selectedNoteIds.forEach(id => removeNote(track.id, id));
            setSelectedNoteIds(new Set());
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setSelectedNoteIds(new Set());
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const deltaBeats = e.key === 'ArrowRight' ? (1 / SNAP_RESOLUTION) : -(1 / SNAP_RESOLUTION);
            selectedNoteIds.forEach(id => {
                const note = track.notes.find(n => n.id === id);
                if (note) {
                    updateNote(
                        track.id,
                        id,
                        {
                            startBeat: Math.max(0, note.startBeat + deltaBeats)
                        }
                    );
                }
            });
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const deltaKeys = e.key === 'ArrowUp' ? -1 : 1;
            selectedNoteIds.forEach(id => {
                const note = track.notes.find(n => n.id === id);
                if (!note) return;
                const origKeyIndex = PIANO_ROLL_KEYS.findIndex(k => k.note === note.pitch);
                if (origKeyIndex !== -1) {
                    const newKeyIdx = Math.max(0, Math.min(PIANO_ROLL_KEYS.length - 1, origKeyIndex + deltaKeys));
                    updateNote(
                        track.id,
                        id,
                        {
                            pitch: PIANO_ROLL_KEYS[newKeyIdx].note
                        }
                    );
                }
            });
        }
    };

    return (
        <div
            ref={containerRef}
            tabIndex={0}
            className={styles.container}
            style={{
                width: `${totalBeats * BEAT_WIDTH}px`,
                height: `${PIANO_ROLL_HEIGHT}px`
            } as React.CSSProperties}
            onMouseDown={handleGridMouseDown}
            onContextMenu={(e) => e.preventDefault()}
            onMouseMove={handleGridMouseMove}
            onMouseLeave={handleGridMouseLeave}
            onKeyDown={handleKeyDown}
        >
            {hoveredNote && (
                <div
                    className={styles.hoveredRow}
                    style={{
                        top: `${PIANO_ROLL_KEYS.findIndex(k => k.note === hoveredNote) * KEY_HEIGHT}px`,
                        height: `${KEY_HEIGHT}px`
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

                const isSelected = selectedNoteIds.has(note.id);

                return (
                    <div
                        key={note.id}
                        className={clsx(styles.noteBlock, isSelected && styles.selected)}
                        style={{
                            left: `${note.startBeat * BEAT_WIDTH}px`,
                            top: `${keyIndex * KEY_HEIGHT}px`,
                            width: `${note.durationBeats * BEAT_WIDTH}px`,
                            height: `${KEY_HEIGHT}px`
                        } as React.CSSProperties}
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
                style={{
                    transform: `translateX(${playheadBeat * BEAT_WIDTH}px)`
                } as React.CSSProperties}
            />
        </div>
    );
};

export default NoteGrid;