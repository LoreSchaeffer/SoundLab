import React, {type CSSProperties, useRef} from 'react';
import styles from './TimelineRuler.module.css';
import {useSequencer} from '../../contexts/SequencerContext.ts';
import {UI} from "../../utils/sequencer.ts";
import Cursor from "./Cursor.tsx";

type TimelineRulerProps = {
    ghostBeat: number | null;
};

const TimelineRuler = ({ghostBeat}: TimelineRulerProps) => {
    const {
        totalBeats,
        playheadBeat,
        setPlayheadBeat
    } = useSequencer();

    const totalBars = Math.ceil(totalBeats / 4);
    const containerRef = useRef<HTMLDivElement>(null);

    const updatePlayhead = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;

        const beat = Math.max(0, Math.min(totalBeats, x / UI.BEAT_WIDTH));
        setPlayheadBeat(beat);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();

        updatePlayhead(e.clientX);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            updatePlayhead(moveEvent.clientX);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const direction = e.deltaY > 0 ? 1 : -1;
        const shiftMultiplier = e.shiftKey ? 1 : 0.25;

        setPlayheadBeat(prev => Math.max(0, Math.min(totalBeats, prev + direction * shiftMultiplier)));
    };

    return (
        <div
            ref={containerRef}
            className={styles.container}
            style={{width: `calc(var(--beat-width) * ${totalBeats})`} as CSSProperties}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
        >
            {Array.from({length: totalBars}).map((_, i) => (
                <div
                    key={i}
                    className={styles.barMarker}
                    style={{left: `calc(var(--beat-width) * ${i * 4})`} as CSSProperties}
                >
                    <span className={styles.barNumber}>{i + 1}</span>
                </div>
            ))}

            <Cursor beat={playheadBeat} variant="ruler"/>

            {ghostBeat !== null && (
                <Cursor beat={ghostBeat} isGhost variant="ruler"/>
            )}
        </div>
    );
};

export default TimelineRuler;