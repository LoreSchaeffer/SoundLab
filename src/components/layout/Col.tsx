import styles from './Col.module.css';
import type {HTMLAttributes, PropsWithChildren} from "react";
import {clsx} from "clsx";

type ColProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & {
    size?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    align?: 'start' | 'center' | 'end';
}

const Col = ({size, align, children, className, ...props}: ColProps) => {
    return (
        <div
            className={clsx(
                size ? styles[`col-${size}`] : styles.col,
                align ? styles[`align-${align}`] : null,
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export default Col;