import React, {useCallback, useEffect, useRef, useState} from "react";
import styles from "./DraggableBadge.module.css";
import clsx from "clsx";
import type {Color} from "../../types";
import {useTranslation} from "react-i18next";

export type DraggableBadgeProps = {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    step?: number;
    dragMultiplier?: number;
    unit?: string;
    color?: Color;
    centered?: boolean
    className?: string;
};

const DraggableBadge: React.FC<DraggableBadgeProps> = ({
                                                           value,
                                                           onChange,
                                                           min = -Infinity,
                                                           max = Infinity,
                                                           step = 1,
                                                           dragMultiplier = 1,
                                                           unit = "",
                                                           color = "cyan",
                                                           centered = false,
                                                           className
                                                       }) => {
    const {t} = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [tempVal, setTempVal] = useState("");

    const badgeRef = useRef<HTMLSpanElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const startVal = useRef(0);
    const hasDragged = useRef(false);

    const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDragging.current) return;
        if ('touches' in e && e.cancelable) e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const deltaX = clientX - startX.current;

        if (Math.abs(deltaX) > 2) {
            hasDragged.current = true;

            const shiftMultiplier = e.shiftKey ? 4 : 1;
            let newVal = startVal.current + (deltaX * dragMultiplier * shiftMultiplier);
            newVal = Math.max(min, Math.min(max, newVal));

            if (step >= 1) newVal = Math.round(newVal / step) * step;
            else {
                const inv = 1 / step;
                newVal = Math.round(newVal * inv) / inv;
            }

            onChange(newVal);
        }
    }, [min, max, step, dragMultiplier, onChange]);

    useEffect(() => {
        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            if (badgeRef.current) badgeRef.current.style.cursor = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleMouseMove, {passive: false});
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [handleMouseMove]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (isEditing) return;
        if ('touches' in e && e.cancelable) e.preventDefault();

        isDragging.current = true;
        hasDragged.current = false;
        startX.current = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        startVal.current = value;

        document.body.style.cursor = 'ew-resize';
        if (badgeRef.current) badgeRef.current.style.cursor = 'ew-resize';
    };

    const handleMouseUp = () => {
        if (!hasDragged.current && !isEditing) {
            setTempVal(value.toString());
            setIsEditing(true);
        }

        isDragging.current = false;
        document.body.style.cursor = '';
        if (badgeRef.current) badgeRef.current.style.cursor = '';
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (isEditing) return;
        e.preventDefault();

        const direction = e.deltaY < 0 ? 1 : -1;
        const shiftMultiplier = e.shiftKey ? 10 : 1;

        let newVal = value + (direction * step * shiftMultiplier);
        newVal = Math.max(min, Math.min(max, newVal));
        onChange(newVal);
    };

    const commitEdit = () => {
        setIsEditing(false);

        const parsed = parseFloat(tempVal);
        if (!isNaN(parsed)) {
            const bounded = Math.max(min, Math.min(max, parsed));
            onChange(bounded);
        }
    };

    return (
        <span
            ref={badgeRef}
            className={clsx(styles.badge, centered && styles.centered, className)}
            style={{color: `var(--${color}-400)`}}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
            title={t('components.draggable_badge.title')}
        >
            <div className={styles.contentWrapper}>
                {isEditing ? (
                    <div className={styles.inputContainer}>
                        <input
                            ref={inputRef}
                            type="number"
                            value={tempVal}
                            onChange={(e) => setTempVal(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit();
                                else if (e.key === 'Escape') setIsEditing(false);
                            }}
                            onBlur={commitEdit}
                            className={styles.input}
                            style={{color: `var(--${color}-400)`}}
                        />
                        {unit && <span className={styles.unit}>{unit}</span>}
                    </div>
                ) : (
                    <div className={styles.textContainer}>
                        <span className={styles.value}>{value}</span>
                        {unit && <span className={styles.unit}>{unit}</span>}
                    </div>
                )}
            </div>
        </span>
    );
};

export default DraggableBadge;