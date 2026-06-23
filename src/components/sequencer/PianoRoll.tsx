import styles from './PianoRoll.module.css';
import React, {useEffect, useRef, useState} from 'react';
import VerticalPiano from './VerticalPiano.tsx';
import NoteGrid from './NoteGrid.tsx';
import type {Track} from "../../contexts/SequencerContext.ts";
import {PIANO_ROLL_KEYS, UI} from "../../utils/sequencer.ts";
import {useSynth} from "../../contexts/SynthContext.ts";
import InspectorSidebar from "./InspectorSidebar.tsx";

type PianoRollProps = {
    track: Track;
};

const PianoRoll = ({track}: PianoRollProps) => {
    const pianoRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const {playNote, releaseNote} = useSynth();

    const [previewNotes, setPreviewNotes] = useState<Set<string>>(new Set());
    const [hoveredNote, setHoveredNote] = useState<string | null>(null);

    useEffect(() => {
        if (gridRef.current && pianoRef.current) {
            const c4Index = PIANO_ROLL_KEYS.findIndex(k => k.note === 'C4');
            if (c4Index !== -1) {
                const clientHeight = gridRef.current.clientHeight;
                const scrollPos = (c4Index * UI.KEY_HEIGHT) - clientHeight + (UI.KEY_HEIGHT * 2);

                gridRef.current.scrollTop = scrollPos;
                pianoRef.current.scrollTop = scrollPos;
            }
        }
    }, []);

    const handlePianoPlay = (pitch: string) => {
        if (!track.presetId) return;
        playNote(track.id, pitch, 0.8);
        setPreviewNotes(prev => new Set(prev).add(pitch));
    };

    const handlePianoRelease = (pitch: string) => {
        if (!track.presetId) return;
        releaseNote(track.id, pitch);
        setPreviewNotes(prev => {
            const next = new Set(prev);
            next.delete(pitch);
            return next;
        });
    };

    const handleNotePreview = (pitch: string) => {
        handlePianoPlay(pitch);
        setTimeout(() => handlePianoRelease(pitch), 350);
    };

    const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (pianoRef.current) pianoRef.current.scrollTop = e.currentTarget.scrollTop;
    };

    const handlePianoScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (gridRef.current) gridRef.current.scrollTop = e.currentTarget.scrollTop;
    };

    return (
        <div className={styles.container}>
            <div className={styles.pianoSidebar}>
                <InspectorSidebar track={track}/>
                <VerticalPiano
                    ref={pianoRef}
                    onScroll={handlePianoScroll}
                    playingNotes={previewNotes}
                    hoveredNote={hoveredNote}
                    onNotePlay={handlePianoPlay}
                    onNoteRelease={handlePianoRelease}
                />
            </div>

            <div
                className={styles.gridWrapper}
                ref={gridRef}
                onScroll={handleGridScroll}
            >
                <NoteGrid
                    track={track}
                    hoveredNote={hoveredNote}
                    onPreviewNote={handleNotePreview}
                    onHoverNote={setHoveredNote}
                />
            </div>
        </div>
    );
};

export default PianoRoll;