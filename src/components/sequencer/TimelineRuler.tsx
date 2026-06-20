import React, {useRef} from 'react';
import styles from './TimelineRuler.module.css';
import {useSequencer} from '../../contexts/SequencerContext.ts';
import {BEAT_WIDTH} from "../../utils/sequencer.ts";

const TimelineRuler = () => {
    const {totalBeats, playheadBeat, setPlayheadBeat} = useSequencer();
    const totalBars = Math.ceil(totalBeats / 4);
    const containerRef = useRef<HTMLDivElement>(null);

    const updatePlayhead = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;

        const beat = Math.max(0, Math.min(totalBeats, x / BEAT_WIDTH));
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
            style={{
                width: `${totalBeats * BEAT_WIDTH}px`,
                '--beat-width': `${BEAT_WIDTH}px`
            } as React.CSSProperties}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
        >
            {Array.from({length: totalBars}).map((_, i) => (
                <div key={i} className={styles.barMarker} style={{left: `${i * 4 * BEAT_WIDTH}px`}}>
                    <span className={styles.barNumber}>{i + 1}</span>
                </div>
            ))}

            <div className={styles.playheadMarker} style={{transform: `translateX(${playheadBeat * BEAT_WIDTH}px)`}}>
                <div className={styles.playheadTriangle}/>
            </div>
        </div>
    );
};

export default TimelineRuler;