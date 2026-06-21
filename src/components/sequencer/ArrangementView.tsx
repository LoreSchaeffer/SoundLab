import styles from './ArrangementView.module.css';
import TrackRow from './TrackRow.tsx';
import Button from '../elements/Button.tsx';
import {MdAdd} from 'react-icons/md';
import {useSequencer} from "../../contexts/SequencerContext.ts";
import TimelineRuler from './TimelineRuler.tsx';
import React, {type CSSProperties, useRef, useState} from 'react';
import {useTranslation} from "react-i18next";
import {UI} from "../../utils/sequencer.ts";
import Cursor from "./Cursor.tsx";

const ArrangementView = () => {
    const {t} = useTranslation();
    const {tracks, addTrack, playheadBeat} = useSequencer();

    const containerRef = useRef<HTMLDivElement>(null);
    const tracksWrapperRef = useRef<HTMLDivElement>(null);
    const rulerScrollRef = useRef<HTMLDivElement>(null);
    const cursorScrollRef = useRef<HTMLDivElement>(null);

    const [ghostBeat, setGhostBeat] = useState<number | null>(null);

    const handleTracksScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;

        if (rulerScrollRef.current) rulerScrollRef.current.scrollLeft = scrollLeft;
        if (cursorScrollRef.current) cursorScrollRef.current.scrollLeft = scrollLeft;
    };

    const handleGlobalMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || !tracksWrapperRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        if (x >= UI.TRACK_HEADER_WIDTH) {
            const scrollLeft = tracksWrapperRef.current.scrollLeft;
            const gridX = x - UI.TRACK_HEADER_WIDTH + scrollLeft;
            const beat = Math.floor(gridX / UI.BEAT_WIDTH);

            if (beat !== ghostBeat) setGhostBeat(beat);
        } else {
            if (ghostBeat !== null) setGhostBeat(null);
        }
    };

    const handleGlobalMouseLeave = () => {
        if (ghostBeat !== null) setGhostBeat(null);
    };

    const layoutVars = {
        '--beat-width': `${UI.BEAT_WIDTH}px`,
        '--key-height': `${UI.KEY_HEIGHT}px`,
        '--header-width': `${UI.TRACK_HEADER_WIDTH}px`,
        '--piano-width': `${UI.PIANO_SIDEBAR_WIDTH}px`,
        '--ruler-height': `${UI.TOP_RULER_HEIGHT}px`
    } as CSSProperties;

    return (
        <div
            ref={containerRef}
            className={styles.container}
            style={layoutVars}
            onMouseMove={handleGlobalMouseMove}
            onMouseLeave={handleGlobalMouseLeave}
        >
            <div className={styles.globalCursorsLayer}>
                <div ref={cursorScrollRef} className={styles.cursorScrollSync}>
                    <Cursor beat={playheadBeat}/>
                    {ghostBeat !== null && <Cursor beat={ghostBeat} isGhost/>}
                </div>
            </div>

            <div className={styles.topRulerRow}>
                <div className={styles.rulerHeaderSpacer}/>
                <div className={styles.rulerScrollContext} ref={rulerScrollRef}>
                    <TimelineRuler/>
                </div>
            </div>

            <div
                className={styles.tracksWrapper}
                ref={tracksWrapperRef}
                onScroll={handleTracksScroll}
            >
                {tracks.map(track => (
                    <TrackRow key={track.id} track={track}/>
                ))}

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
    );
};

export default ArrangementView;