import React, {type CSSProperties, useEffect, useRef, useState} from 'react';
import styles from './NoteGrid.module.css';
import {type Track, useSequencer} from '../../contexts/SequencerContext.ts';
import {PIANO_ROLL_HEIGHT, PIANO_ROLL_KEYS, UI} from "../../utils/sequencer.ts";
import clsx from "clsx";
import {isNoteInScale} from "../../types";

function useGridInteraction(
    track: Track,
    containerRef: React.RefObject<HTMLDivElement | null>,
    onPreviewNote?: (pitch: string) => void
) {
    const {addNote, addNotes, removeNote, updateNote, clipboard, setClipboard, snapResolution, activeTool, selectedNoteIds, setSelectedNoteIds, isPlaying} = useSequencer();

    const selectedIds = new Set(selectedNoteIds);
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

            const rawDeltaBeats = deltaX / UI.BEAT_WIDTH;
            const deltaBeats = snapResolution > 0
                ? Math.round(rawDeltaBeats * snapResolution) / snapResolution
                : rawDeltaBeats;

            const deltaKeys = Math.round(deltaY / UI.KEY_HEIGHT);

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
                    const newDuration = Math.max(0.125, orig.origDuration + deltaBeats);
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

        const handleMouseUp = (e: MouseEvent) => {
            if (!isPlaying && dragState.type === 'move' && dragState.notesOrig.length > 0) {
                const deltaY = e.clientY - dragState.startY;
                const deltaKeys = Math.round(deltaY / UI.KEY_HEIGHT);

                const firstOrig = dragState.notesOrig[0];
                const newKeyIdx = Math.max(0, Math.min(PIANO_ROLL_KEYS.length - 1, firstOrig.origKeyIndex + deltaKeys));

                onPreviewNote?.(PIANO_ROLL_KEYS[newKeyIdx].note);
            }

            setDragState(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, track.id, updateNote, snapResolution, isPlaying, onPreviewNote]);

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

            setSelectedNoteIds(e.shiftKey || e.metaKey || e.ctrlKey ? Array.from(new Set([...selectedIds, ...newSelected])) : Array.from(newSelected));
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            setBoxSelection(null);

            if (!hasMoved) {
                let beat = startX / UI.BEAT_WIDTH;
                if (snapResolution > 0) beat = Math.floor(beat * snapResolution) / snapResolution;

                const keyIndex = Math.floor(startY / UI.KEY_HEIGHT);
                const pitch = PIANO_ROLL_KEYS[keyIndex]?.note;

                if (pitch) {
                    addNote(
                        track.id,
                        {
                            pitch,
                            startBeat: beat,
                            durationBeats: snapResolution > 0 ? (1 / snapResolution) : 1,
                            velocity: 0.8
                        }
                    );

                    if (!isPlaying) onPreviewNote?.(pitch);
                }
                if (!e.shiftKey && !e.ctrlKey && !e.metaKey) setSelectedNoteIds([]);
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

        if (activeTool === 'split') {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            let splitBeat = x / UI.BEAT_WIDTH;

            if (snapResolution > 0) splitBeat = Math.round(splitBeat * snapResolution) / snapResolution;

            if (splitBeat > note.startBeat && splitBeat < note.startBeat + note.durationBeats) {
                const firstDuration = splitBeat - note.startBeat;
                const secondDuration = note.durationBeats - firstDuration;

                updateNote(track.id, note.id, {durationBeats: firstDuration});
                addNote(
                    track.id,
                    {
                        pitch: note.pitch,
                        startBeat: splitBeat,
                        durationBeats: secondDuration,
                        velocity: note.velocity
                    }
                );
            }
            return;
        }

        let newSelected = new Set(selectedIds);
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (newSelected.has(noteId)) newSelected.delete(noteId);
            else newSelected.add(noteId);

            setSelectedNoteIds(Array.from(newSelected));
        } else if (!newSelected.has(noteId)) {
            newSelected = new Set([noteId]);
            setSelectedNoteIds(Array.from(newSelected));
        }

        const notesOrig = track.notes.filter(n => newSelected.has(n.id)).map(n => ({
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
                setSelectedNoteIds([]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedNoteIds([]);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const step = snapResolution > 0 ? (1 / snapResolution) : 0.125;
                const delta = e.key === 'ArrowRight' ? step : -step;

                selectedIds.forEach(id => {
                    const n = track.notes.find(n => n.id === id);
                    if (n) {
                        updateNote(
                            track.id,
                            id,
                            {
                                startBeat: Math.max(0, n.startBeat + delta)
                            }
                        );
                    }
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

    const {totalBeats, removeNote, scaleType, scaleRoot} = useSequencer();
    const containerRef = useRef<HTMLDivElement>(null);

    const {selectedIds, boxSelection, hoverBeatRef, onGridMouseDown, onNoteMouseDown, onKeyDown} = useGridInteraction(track, containerRef, onPreviewNote);

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

            {scaleType !== 'chromatic' && PIANO_ROLL_KEYS.map((keyDef, idx) => {
                if (!isNoteInScale(keyDef.note, scaleRoot, scaleType)) {
                    return (
                        <div
                            key={`out-scale-${keyDef.note}`}
                            className={styles.outOfScale}
                            style={{top: `calc(var(--key-height) * ${idx})`} as CSSProperties}
                        />
                    );
                }
                return null;
            })}

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