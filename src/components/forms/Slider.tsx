import styles from './Slider.module.css';
import React, {useMemo} from 'react';
import {type Color, getComputedColor} from '../../types';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'color'> {
    value: number;
    onChange: (value: number) => void;
    color?: Color;
    leftLabel?: string;
    rightLabel?: string;
}

const Slider: React.FC<SliderProps> = ({
                                           value,
                                           onChange,
                                           min = 0,
                                           max = 100,
                                           step = 1,
                                           color = 'cyan',
                                           leftLabel,
                                           rightLabel,
                                           className,
                                           style,
                                           ...props
                                       }) => {
    const computedColor = useMemo(() => getComputedColor(color), [color]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(Number(e.target.value));
    };

    const customStyle = {
        '--slider-color': computedColor,
        ...style
    } as React.CSSProperties;

    return (
        <div className={`${styles.sliderWrapper} ${className || ''}`} style={customStyle}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleChange}
                className={styles.slider}
                {...props}
            />
            {(leftLabel || rightLabel) && (
                <div className={styles.sliderLabels}>
                    <span>{leftLabel}</span>
                    <span>{rightLabel}</span>
                </div>
            )}
        </div>
    );
};

export default Slider;