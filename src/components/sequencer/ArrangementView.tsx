import styles from './ArrangementView.module.css';
import TrackRow from './TrackRow.tsx';
import Button from '../elements/Button.tsx';
import {MdAdd} from 'react-icons/md';
import {useSequencer} from "../../contexts/SequencerContext.ts";
import TimelineRuler from './TimelineRuler.tsx';
import React, {type CSSProperties, useEffect, useRef, useState} from 'react';
import {useTranslation} from "react-i18next";
import {UI} from "../../utils/sequencer.ts";
import Cursor from "./Cursor.tsx";
import type {MidiParsedMessage} from "../../utils/midi.ts";
import {useSynth} from "../../contexts/SynthContext.ts";
import {useMidi} from "../../contexts/MidiContext.ts";

const ArrangementView = () => {
    const {t} = useTranslation();
    const {tracks, addTrack, playheadBeat, setActiveTool, togglePlay, setIsStepRecording, isStepRecording, snapResolution, selectedTrackId, addNotes, setPlayheadBeat} = useSequencer();
    const {addMidiListener, removeMidiListener} = useMidi();
    const {playNote, releaseNote} = useSynth();

    const tracksWrapperRef = useRef<HTMLDivElement>(null);
    const rulerScrollRef = useRef<HTMLDivElement>(null);

    const [ghostBeat, setGhostBeat] = useState<number | null>(null);

    const stateRef = useRef({selectedTrackId, isStepRecording, playheadBeat, snapResolution});

    useEffect(() => {
        stateRef.current = {selectedTrackId, isStepRecording, playheadBeat, snapResolution};
    }, [selectedTrackId, isStepRecording, playheadBeat, snapResolution]);

    const activeKeys = useRef<Set<string>>(new Set());
    const chordBuffer = useRef<Array<{ pitch: string, velocity: number }>>([]);

    useEffect(() => {
        const handleMidi = (msg: MidiParsedMessage) => {
            const {selectedTrackId, isStepRecording, playheadBeat, snapResolution} = stateRef.current;

            if (msg.type === 'noteon' && msg.note) {
                if (selectedTrackId) playNote(selectedTrackId, msg.note, msg.velocity || 0.8);

                activeKeys.current.add(msg.note);
                chordBuffer.current.push({pitch: msg.note, velocity: msg.velocity || 0.8});
            } else if (msg.type === 'noteoff' && msg.note) {
                if (selectedTrackId) releaseNote(selectedTrackId, msg.note);

                activeKeys.current.delete(msg.note);

                if (activeKeys.current.size === 0 && chordBuffer.current.length > 0) {
                    if (isStepRecording && selectedTrackId) {
                        const duration = snapResolution > 0 ? 1 / snapResolution : 0.25;

                        const newNotes = chordBuffer.current.map(n => ({
                            pitch: n.pitch,
                            velocity: n.velocity,
                            startBeat: playheadBeat,
                            durationBeats: duration
                        }));

                        addNotes(selectedTrackId, newNotes);
                        setPlayheadBeat(playheadBeat + duration);
                    }

                    chordBuffer.current = [];
                }
            }
        };

        addMidiListener(handleMidi);
        return () => removeMidiListener(handleMidi);
    }, [addMidiListener, removeMidiListener, playNote, releaseNote, addNotes, setPlayheadBeat]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }

            if (e.key.toLowerCase() === 'v') {
                setActiveTool('pointer');
            }

            if (e.key.toLowerCase() === 'c') {
                setActiveTool('split');
            }

            if (e.key.toLowerCase() === 'r') {
                setIsStepRecording(p => !p);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [togglePlay, setActiveTool, setIsStepRecording]);

    const handleTracksScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (rulerScrollRef.current) rulerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    };

    const layoutVars = {
        '--beat-width': `${UI.BEAT_WIDTH}px`,
        '--key-height': `${UI.KEY_HEIGHT}px`,
        '--track-header-width': `${UI.TRACK_HEADER_WIDTH}px`,
        '--piano-sidebar-width': `${UI.PIANO_SIDEBAR_WIDTH}px`,
        '--ruler-height': `${UI.TOP_RULER_HEIGHT}px`
    } as CSSProperties;

    return (
        <div className={styles.container} style={layoutVars}>
            <div className={styles.topRulerRow}>
                <div className={styles.rulerHeaderSpacer}/>

                <div
                    className={styles.rulerScrollContext}
                    ref={rulerScrollRef}
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
                        setGhostBeat(x / UI.BEAT_WIDTH);
                    }}
                    onMouseLeave={() => setGhostBeat(null)}
                >
                    <TimelineRuler ghostBeat={ghostBeat}/>
                </div>
            </div>

            <div
                className={styles.tracksWrapper}
                ref={tracksWrapperRef}
                onScroll={handleTracksScroll}
            >
                <div className={styles.tracksContent}>
                    <div
                        className={styles.tracksList}
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;

                            if (x >= UI.TRACK_HEADER_WIDTH) {
                                const gridX = x - UI.TRACK_HEADER_WIDTH;
                                setGhostBeat(Math.floor(gridX / UI.BEAT_WIDTH));
                            } else {
                                setGhostBeat(null);
                            }
                        }}
                        onMouseLeave={() => setGhostBeat(null)}
                    >
                        <Cursor beat={playheadBeat} variant="track"/>

                        {ghostBeat !== null && <Cursor beat={ghostBeat} isGhost variant="track"/>}

                        {tracks.map(track => (
                            <TrackRow key={track.id} track={track}/>
                        ))}
                    </div>

                    <div className={styles.addTrackContainer}>
                        <Button
                            variant="default"
                            color="cyan"
                            icon={<MdAdd/>}
                            onClick={addTrack}
                        >
                            {t('sequencer.add_track')}
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ArrangementView;