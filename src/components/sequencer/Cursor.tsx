import {type CSSProperties} from 'react';
import styles from './Cursor.module.css';
import clsx from 'clsx';

type CursorProps = {
    beat: number;
    isGhost?: boolean;
    variant?: 'ruler' | 'track';
};

const Cursor = ({beat, isGhost = false, variant = 'track'}: CursorProps) => {

    return (
        <div
            className={clsx(
                styles.cursorWrapper,
                isGhost ? styles.ghost : styles.playhead,
                variant === 'ruler' ? styles.rulerVariant : styles.trackVariant
            )}
            style={{
                transform: `translateX(calc(var(--beat-width) * ${beat}))`
            } as CSSProperties}
        >
            {variant === 'ruler' && (
                <div className={isGhost ? styles.ghostTriangle : styles.playheadTriangle}/>
            )}
        </div>
    );
};

export default Cursor;