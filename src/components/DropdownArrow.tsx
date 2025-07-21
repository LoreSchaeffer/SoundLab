import React from 'react';

export type DropdownArrowProps = {
    className?: string;
    color?: string;
    direction?: "up" | "down" | "left" | "right";
}

export function DropdownArrow({ className, color = 'white', direction = 'down' }: DropdownArrowProps) {
    let rotation = 0;
    switch (direction) {
        case 'up':
            rotation = 180;
            break;
        case 'left':
            rotation = 90;
            break;
        case 'right':
            rotation = -90;
            break;
        case 'down':
        default:
            rotation = 0;
    }
    return (
        <svg
            className={className}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: `rotate(${rotation}deg)` }}
        >
            <path
                d="M4 6L8 10L12 6"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}