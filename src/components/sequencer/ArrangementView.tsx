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

const ArrangementView = () => {
    const {t} = useTranslation();
    const {tracks, addTrack, playheadBeat, setActiveTool, togglePlay} = useSequencer();

    const tracksWrapperRef = useRef<HTMLDivElement>(null);
    const rulerScrollRef = useRef<HTMLDivElement>(null);

    const [ghostBeat, setGhostBeat] = useState<number | null>(null);

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
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [togglePlay, setActiveTool]);

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