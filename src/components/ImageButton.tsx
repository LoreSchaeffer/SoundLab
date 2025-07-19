import styles from './ImageButton.module.css';
import {type HTMLAttributes, useState} from "react";

export type ImageButtonProps = HTMLAttributes<HTMLButtonElement> & {
    src: string;
    size?: number;
    alt?: string;
    animate?: boolean;
    animation?: 'zoom' | 'shake';
    disabled?: boolean;
}

export function ImageButton({className, src, size = 50, alt = 'Button', animate = true, animation = 'zoom', onClick, disabled = false}: ImageButtonProps) {
    const [animClass, setAnimClass] = useState('');

    const getAnimationClass = () => {
        switch (animation) {
            case 'zoom':
                return styles.zoom;
            case 'shake':
                return styles.shake;
            default:
                return '';
        }
    }

    const onEnter = () => {
        if (!animate || disabled) return;
        setAnimClass(getAnimationClass());
    }

    const onLeave = () => {
        if (!animate || disabled) return;
        setAnimClass('');
    }

    return (
        <button className={`${styles.imageBtn} ${disabled ? styles.disabled : ''} ${className || ''}`} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick} disabled={disabled}>
            <img src={src} alt={alt} style={{width: size + 'px', height: size + 'px'}} className={animClass}/>
        </button>
    )
}