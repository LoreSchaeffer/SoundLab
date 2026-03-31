import styles from './Row.module.css';
import type {CSSProperties, HTMLAttributes, PropsWithChildren} from "react";
import {clsx} from "clsx";

type RowProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
    stretch?: boolean;
    noGap?: boolean;
}

const Row = ({stretch = false, noGap, className, style, children}: RowProps) => {
    const styleCombined: CSSProperties = {...style};
    if (noGap) styleCombined.gap = 'unset';

    return (
        <div
            className={clsx(styles.row, stretch && styles.stretch, className)}
            style={styleCombined}
        >
            {children}
        </div>
    )
}

export default Row;