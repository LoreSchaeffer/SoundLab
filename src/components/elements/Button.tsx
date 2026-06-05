import React, {type ReactNode, useCallback, useMemo} from 'react';
import styles from './Button.module.css';
import type {Color} from '../../types';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'active';
    color?: Color;
    icon?: ReactNode;
}

const Button = ({
                    variant = 'default',
                    color = 'blue',
                    icon,
                    children,
                    className,
                    style,
                    ...props
                }: ButtonProps) => {
    const getComputedColor = useCallback((colorName: Color) => {
        if (typeof window === 'undefined') return '#ffffff';
        return getComputedStyle(document.documentElement).getPropertyValue(`--${colorName}-500`).trim();
    }, []);

    const computedColor = useMemo(() => getComputedColor(color), [color, getComputedColor]);

    return (
        <button
            className={clsx(styles.btn, variant === 'active' && styles.active, className)}
            style={{'--btn-color': computedColor, ...style} as React.CSSProperties}
            {...props}
        >
            {icon && <span className={styles.icon}>{icon}</span>}
            {children && <span>{children}</span>}
        </button>
    );
};

export default Button;