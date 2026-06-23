import React, {forwardRef} from 'react';
import styles from './Input.module.css';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    textAlign?: 'left' | 'center' | 'right';
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
                                                            className,
                                                            style,
                                                            textAlign = 'left',
                                                            ...props
                                                        }, ref) => {
    return (
        <div className={styles.wrapper} style={style}>
            <input
                ref={ref}
                className={clsx(styles.input, className)}
                style={{textAlign} as React.CSSProperties}
                {...props}
            />
        </div>
    );
});

Input.displayName = 'Input';

export default Input;