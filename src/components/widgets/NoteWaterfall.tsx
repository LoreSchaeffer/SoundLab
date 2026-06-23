import styles from './NoteWaterfall.module.css';
import React, {useEffect, useMemo, useRef} from 'react';
import {type Color, NOTE_NAMES} from '../../types';
import clsx from 'clsx';

export type WaterfallColorMode = Color | 'rainbow' | 'per_note' | 'random';

export type WaterfallNote = {
    id: string;
    pitch: string;
    startTime: number;
    endTime?: number;
    velocity: number;
};

type NoteWaterfallProps = {
    notes: WaterfallNote[];
    startNote?: string;
    endNote?: string;
    speed?: number;
    colorMode?: WaterfallColorMode;
};

const generateKeys = (start: string, end: string) => {
    const keys = [];
    let current = start;

    while (true) {
        const noteName = current.slice(0, -1);
        const octave = parseInt(current.slice(-1));

        keys.push({
            note: current,
            type: noteName.includes('#') ? 'black' : 'white'
        });

        if (current === end) break;

        const noteIndex = NOTE_NAMES.indexOf(noteName);
        if (noteIndex === 11) current = `C${octave + 1}`;
        else current = `${NOTE_NAMES[noteIndex + 1]}${octave}`;

        if (keys.length > 100) break;
    }
    return keys;
};

const getNoteColor = (pitch: string, mode: WaterfallColorMode, noteId: string, laneIndex: number, totalLanes: number) => {
    if (mode === 'per_note') {
        const hues: Record<string, number> = {
            'C': 0, 'C#': 30, 'D': 60, 'D#': 90, 'E': 120,
            'F': 150, 'F#': 180, 'G': 210, 'G#': 240, 'A': 270,
            'A#': 300, 'B': 330
        };
        const name = pitch.replace(/[0-9]/g, '');
        return `hsl(${hues[name] || 0}, 80%, 50%)`;

    } else if (mode === 'rainbow') {
        const hue = Math.floor((laneIndex / Math.max(1, totalLanes - 1)) * 300);
        return `hsl(${hue}, 80%, 50%)`;

    } else if (mode === 'random') {
        let hash = 0;
        for (let i = 0; i < noteId.length; i++) {
            hash = noteId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 80%, 50%)`;
    }

    return `var(--${mode}-500)`;
};

const NoteWaterfall = ({notes, startNote = 'A0', endNote = 'C8', speed = 0.3, colorMode = 'cyan'}: NoteWaterfallProps) => {
    const lanes = useMemo(() => generateKeys(startNote, endNote), [startNote, endNote]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let rafId: number;

        const animate = () => {
            if (!containerRef.current) return;
            const now = performance.now();
            const noteElements = containerRef.current.querySelectorAll(`.${styles.waterfallNote}`);

            noteElements.forEach(el => {
                const htmlEl = el as HTMLElement;
                const start = parseFloat(htmlEl.dataset.start || '0');
                const endAttr = htmlEl.dataset.end;
                const end = endAttr ? parseFloat(endAttr) : now;

                const height = Math.max(10, (end - start) * speed);
                const bottom = (now - end) * speed;

                if (bottom > 2000) {
                    htmlEl.style.display = 'none';
                } else {
                    htmlEl.style.height = `${height}px`;
                    htmlEl.style.bottom = `${bottom}px`;
                }
            });

            rafId = requestAnimationFrame(animate);
        };

        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [speed]);

    return (
        <div className={styles.container} ref={containerRef}>
            {lanes.map((lane, laneIndex) => (
                <div
                    key={`lane-${lane.note}`}
                    className={clsx(styles.lane, lane.type === 'white' ? styles.laneWhite : styles.laneBlack)}
                >
                    {notes
                        .filter(n => n.pitch === lane.note)
                        .map(n => (
                            <div
                                key={n.id}
                                className={styles.waterfallNote}
                                data-start={n.startTime}
                                data-end={n.endTime || ''}
                                style={{
                                    opacity: Math.max(0.4, n.velocity),
                                    '--note-color': getNoteColor(n.pitch, colorMode, n.id, laneIndex, lanes.length)
                                } as React.CSSProperties}
                            />
                        ))}
                </div>
            ))}
        </div>
    );
};

export default NoteWaterfall;