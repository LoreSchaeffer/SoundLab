import styles from "./GlowSpot.module.css";
import {type Color, getComputedColor} from "../../types";
import React, {type CSSProperties, useMemo} from "react";
import clsx from "clsx";

type Animation = {
    scale?: number;
    translateX?: number | string;
    translateY?: number | string;
    duration?: string;
}

type GlowSpotProps = {
    color: Color;
    size?: string;
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    animation?: Animation;
    className?: string;
    style?: CSSProperties;
}

function GlowSpot({
                      color,
                      size = '70vmax',
                      top = 'auto',
                      bottom = 'auto',
                      left = 'auto',
                      right = 'auto',
                      animation,
                      className,
                      style
                  }: GlowSpotProps) {
    const computedColor = useMemo(() => getComputedColor(color), [color]);

    const currentAnimation = {
        scale: 1.15,
        translateX: '10%',
        translateY: '5%',
        duration: '15s',
        ...animation
    };

    const customStyle = {
        ...style,
        top,
        bottom,
        left,
        right,
        width: size,
        height: size,
        opacity: 0.5,
        background: `radial-gradient(circle, color-mix(in srgb, ${computedColor} 40%, transparent) 0%, transparent 60%)`,
        filter: 'blur(120px)',
        '--trans-x': typeof currentAnimation.translateX === 'number' ? `${currentAnimation.translateX}px` : currentAnimation.translateX,
        '--trans-y': typeof currentAnimation.translateY === 'number' ? `${currentAnimation.translateY}px` : currentAnimation.translateY,
        '--scale': currentAnimation.scale,
        '--anim-duration': currentAnimation.duration,
    } as React.CSSProperties;

    return (
        <div
            className={clsx(styles.glowSpot, className)}
            style={customStyle}
        />
    );
}

export default GlowSpot;