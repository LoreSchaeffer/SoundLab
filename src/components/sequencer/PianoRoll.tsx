import styles from './PianoRoll.module.css';
import React, {useRef} from 'react';
import VerticalPiano from './VerticalPiano.tsx';
import NoteGrid from './NoteGrid.tsx';
import type {Track} from "../../contexts/SequencerContext.ts";
import {BEAT_WIDTH, KEY_HEIGHT} from "../../utils/sequencer.ts";

type PianoRollProps = {
    track: Track;
};

const PianoRoll = ({track}: PianoRollProps) => {
    const pianoRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (pianoRef.current) pianoRef.current.scrollTop = e.currentTarget.scrollTop;
    };
    const handlePianoScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (gridRef.current) gridRef.current.scrollTop = e.currentTarget.scrollTop;
    };

    return (
        <div className={styles.container} style={{'--beat-width': `${BEAT_WIDTH}px`, '--key-height': `${KEY_HEIGHT}px`} as React.CSSProperties}>
            <div className={styles.pianoSidebar}>
                <VerticalPiano ref={pianoRef} onScroll={handlePianoScroll}/>
            </div>

            <div className={styles.gridWrapper} ref={gridRef} onScroll={handleGridScroll}>
                <NoteGrid track={track}/>
            </div>
        </div>
    );
};

export default PianoRoll;