import React, {useMemo} from 'react';
import styles from './Select.module.css';
import {type Color, getComputedColor} from '../../types';
import clsx from 'clsx';
import {MdExpandMore} from 'react-icons/md';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'color'> {
    options: SelectOption[];
    color?: Color;
    icon?: React.ReactNode;
}

const Select = ({
                    options,
                    color = 'blue',
                    icon,
                    className,
                    style,
                    ...props
                }: SelectProps) => {

    const computedColor = useMemo(() => getComputedColor(color), [color]);

    return (
        <div
            className={clsx(styles.wrapper, className)}
            style={{'--select-color': computedColor, ...style} as React.CSSProperties}
        >
            {icon && <span className={styles.icon}>{icon}</span>}

            <select
                className={clsx(styles.select, icon ? styles.hasIcon : styles.noIcon)}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            <span className={styles.caret}>
                <MdExpandMore/>
            </span>
        </div>
    );
};

export default Select;