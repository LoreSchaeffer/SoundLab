import {type CSSProperties} from 'react';
import styles from './Cursor.module.css';
import clsx from 'clsx';
import {UI} from '../../utils/sequencer.ts';

type CursorProps = {
    beat: number;
    isGhost?: boolean;
};

const Cursor = ({
                    beat,
                    isGhost = false
                }: CursorProps) => {

    return (
        <div
            className={clsx(styles.cursorWrapper, isGhost ? styles.ghost : styles.playhead)}
            style={{
                transform: `translateX(${beat * UI.BEAT_WIDTH}px)`
            } as CSSProperties}
        >
            {!isGhost && <div className={styles.playheadTriangle}/>}
        </div>
    );
};

export default Cursor;