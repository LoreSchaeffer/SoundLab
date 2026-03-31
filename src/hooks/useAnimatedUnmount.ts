import {type CSSProperties, useState} from "react";

type AnimationType = 'Fade' | 'Zoom';

type AnimationConfig = {
    duration?: number;
    type?: AnimationType;
    easing?: string;
}

export const useAnimatedUnmount = (show: boolean, config: AnimationConfig = {}) => {
    const {
        duration = 200,
        type = 'Fade',
        easing = 'ease-in-out'
    } = config;

    const [shouldRender, setShouldRender] = useState(show);
    const [phase, setPhase] = useState<'idle' | 'enter' | 'exit'>(show ? 'enter' : 'idle');
    const [prevShow, setPrevShow] = useState(show);

    if (show !== prevShow) {
        setPrevShow(show);
        if (show) {
            setShouldRender(true);
            setPhase('enter');
        } else {
            setPhase('exit');
        }
    }

    const handleAnimationEnd = () => {
        if (!show) {
            setShouldRender(false);
            setPhase('idle');
        }
    };

    const style: CSSProperties = phase !== 'idle' ? {
        animationName: phase === 'enter' ? `anim${type}In` : `anim${type}Out`,
        animationDuration: `${duration}ms`,
        animationTimingFunction: easing,
        animationFillMode: 'forwards'
    } : {};

    return {
        shouldRender,
        transitionProps: {
            style,
            onAnimationEnd: handleAnimationEnd
        }
    };
};