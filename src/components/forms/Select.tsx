import styles from './Select.module.css';
import React, {type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import {type Color, getComputedColor} from '../../types';
import clsx from 'clsx';
import {MdExpandMore} from 'react-icons/md';
import {useTranslation} from "react-i18next";
import {createPortal} from "react-dom";

export type SelectAction = {
    icon: React.ReactNode;
    onClick: (e: React.MouseEvent, optionValue: string) => void;
    title?: string;
    colorClass?: string;
}

export type SelectOption = {
    value: string;
    label: string;
    leftIcon?: React.ReactNode | string;
    rightActions?: SelectAction[];
    isAction?: boolean;
    onClick?: () => void;
}

export type SelectProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'color'> & {
    options: SelectOption[];
    value?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange?: (e: any) => void;
    color?: Color;
    icon?: React.ReactNode;
    compact?: boolean;
}

const Select = ({
                    options,
                    value,
                    onChange,
                    color = 'cyan',
                    icon,
                    compact,
                    className,
                    style,
                    ...props
                }: SelectProps) => {
    const {t} = useTranslation();
    const computedColor = useMemo(() => getComputedColor(color), [color]);

    const [isOpen, setIsOpen] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(() => options.find(o => o.value === value), [options, value]);

    const toggleOpen = () => {
        if (!isOpen && wrapperRef.current) setRect(wrapperRef.current.getBoundingClientRect());

        setIsOpen(!isOpen);
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (wrapperRef.current && !wrapperRef.current.contains(target) && dropdownRef.current && !dropdownRef.current.contains(target)) setIsOpen(false);
        };

        const handleScrollOrResize = (event: Event) => {
            const target = event.target as Node;
            if (dropdownRef.current && dropdownRef.current.contains(target)) return;

            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen]);

    const handleSelect = (optValue: string) => {
        if (onChange) onChange({target: {value: optValue}});

        setIsOpen(false);
    };

    const handleOptionClick = (opt: SelectOption) => {
        if (opt.onClick) opt.onClick();

        if (opt.isAction) setIsOpen(false);
        else handleSelect(opt.value);
    };

    const renderLeftIcon = (iconData?: ReactNode | string) => {
        if (!iconData) return null;
        if (typeof iconData === 'string') return <img src={iconData} alt="" className={styles.optionLeftImg}/>;

        return <span className={styles.optionLeftImgIcon}>{iconData}</span>;
    };

    return (
        <div
            ref={wrapperRef}
            className={clsx(
                styles.wrapper,
                isOpen && styles.open,
                compact && styles.compact,
                className
            )}
            style={{'--select-color': computedColor, ...style} as CSSProperties}
            {...props}
        >
            {icon && <span className={styles.icon}>{icon}</span>}

            <button
                type="button"
                className={clsx(styles.trigger, icon ? styles.hasIcon : styles.noIcon)}
                onClick={toggleOpen}
            >
                <div className={styles.triggerContent}>
                    {renderLeftIcon(selectedOption?.leftIcon)}
                    <span className={styles.triggerText}>
                        {selectedOption ? selectedOption.label : t('components.misc.select_placeholder')}
                    </span>
                </div>
            </button>

            <span className={clsx(styles.caret, isOpen && styles.open)}>
                <MdExpandMore/>
            </span>

            {isOpen && rect && createPortal(
                <div
                    ref={dropdownRef}
                    className={clsx(styles.dropdown, compact && styles.compact)}
                    style={{
                        top: `${rect.bottom + 4}px`,
                        left: `${rect.left}px`,
                        width: `${rect.width}px`,
                        '--select-color': computedColor
                    } as React.CSSProperties}
                >
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            className={clsx(
                                styles.option,
                                value === opt.value && !opt.isAction && styles.selected,
                                opt.isAction && styles.actionOption
                            )}
                            onClick={() => handleOptionClick(opt)}
                        >
                            <div className={styles.optionLeft}>
                                {renderLeftIcon(opt.leftIcon)}
                                <span>{opt.label}</span>
                            </div>

                            {opt.rightActions && opt.rightActions.length > 0 && (
                                <div className={styles.optionRight}>
                                    {opt.rightActions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className={styles.actionBtn}
                                            style={action.colorClass ? {color: action.colorClass} : undefined}
                                            title={action.title}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                action.onClick(e, opt.value);
                                                setIsOpen(false);
                                            }}
                                        >
                                            {action.icon}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

export default Select;