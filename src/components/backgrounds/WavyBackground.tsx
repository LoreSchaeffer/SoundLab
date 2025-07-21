"use client";
import React, {useEffect, useRef, useState} from "react";
import {createNoise3D} from "simplex-noise";
import classNames from "classnames";

interface WavyBackgroundProps {
    children?: React.ReactNode;
    className?: string;
    containerClassName?: string;
    colors?: string[];
    waveWidth?: number;
    backgroundFill?: string;
    blur?: number;
    speed?: "slow" | "fast";
    waveOpacity?: number;

    [key: string]: any;
}

export const WavyBackground: React.FC<WavyBackgroundProps> = ({
                                                                  children,
                                                                  className,
                                                                  containerClassName,
                                                                  colors,
                                                                  waveWidth,
                                                                  backgroundFill,
                                                                  blur = 10,
                                                                  speed = "fast",
                                                                  waveOpacity = 0.5,
                                                                  ...props
                                                              }) => {
    const noise = createNoise3D();
    let w: number;
    let h: number;
    let nt: number;
    let i: number;
    let x: number;
    let ctx: CanvasRenderingContext2D | null;
    let canvas: HTMLCanvasElement | null;

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const getSpeed = (): number => {
        switch (speed) {
            case "slow":
                return 0.001;
            case "fast":
                return 0.002;
            default:
                return 0.001;
        }
    };

    const init = () => {
        canvas = canvasRef.current;
        if (!canvas) return;

        ctx = canvas.getContext("2d");
        if (!ctx) return;

        w = (ctx.canvas.width = window.innerWidth);
        h = (ctx.canvas.height = window.innerHeight);
        ctx.filter = `blur(${blur}px)`;
        nt = 0;

        window.onresize = function () {
            if (!ctx || !canvas) return;
            w = (ctx.canvas.width = window.innerWidth);
            h = (ctx.canvas.height = window.innerHeight);
            ctx.filter = `blur(${blur}px)`;
        };
        render();
    };

    const waveColors = colors ?? [
        "#38bdf8",
        "#818cf8",
        "#c084fc",
        "#e879f9",
        "#22d3ee",
    ];

    const drawWave = (n: number) => {
        if (!ctx) return;
        nt += getSpeed();
        for (i = 0; i < n; i++) {
            ctx.beginPath();
            ctx.lineWidth = waveWidth || 50;
            ctx.strokeStyle = waveColors[i % waveColors.length];
            for (x = 0; x < w; x += 5) {
                const y = noise(x / 800, 0.3 * i, nt) * 100;
                ctx.lineTo(x, y + h * 0.5);
            }
            ctx.stroke();
            ctx.closePath();
        }
    };

    let animationId: number;
    const render = () => {
        if (!ctx) return;

        ctx.clearRect(0, 0, w, h);
        if (backgroundFill && backgroundFill !== "transparent") {
            ctx.fillStyle = backgroundFill;
            ctx.globalAlpha = waveOpacity || 0.5;
            ctx.fillRect(0, 0, w, h);
        }
        drawWave(5);
        animationId = requestAnimationFrame(render);
    };

    useEffect(() => {
        init();
        return () => cancelAnimationFrame(animationId);
    }, []);

    const [isSafari, setIsSafari] = useState(false);
    useEffect(() => {
        setIsSafari(
            typeof window !== "undefined" &&
            navigator.userAgent.includes("Safari") &&
            !navigator.userAgent.includes("Chrome")
        );
    }, []);

    return (
        <div className={classNames("position-relative d-flex flex-column align-items-center justify-content-center", containerClassName)}>
            <canvas
                className="position-absolute top-0 start-0 w-100 h-100"
                ref={canvasRef}
                id="canvas"
                style={{
                    ...(isSafari ? {filter: `blur(${blur}px)`} : {}),
                }}
            ></canvas>
            <div className={classNames("position-relative", className)} {...props}>
                {children}
            </div>
        </div>
    );
};
