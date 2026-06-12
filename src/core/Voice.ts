import {Gain, now, Oscillator} from "tone";
import type {Envelope} from "../types/audio.ts";

export class Voice {
    public oscillator: Oscillator;
    public envelopeGain: Gain;
    public velocityGain: Gain;
    public active: boolean = false;
    public note: string | number | null = null;

    // Oscillator -> Envelope -> Velocity -> ChannelOut
    constructor(targetNode: Gain) {
        this.velocityGain = new Gain(0).connect(targetNode);
        this.envelopeGain = new Gain(0).connect(this.velocityGain);
        this.oscillator = new Oscillator({volume: -12}).connect(this.envelopeGain);
    }

    public play(noteToPlay: string | number, velocity: number, type: OscillatorType, partials: number[], env: Envelope, phase: number = 0, syncTime?: number) {
        this.active = true;
        this.note = noteToPlay;

        const time = syncTime !== undefined ? syncTime : now() + 0.02;

        if (type === 'sine') {
            this.oscillator.type = 'custom';
            this.oscillator.partials = [1];
        } else {
            this.oscillator.type = type;
            if (type === 'custom') this.oscillator.partials = [...partials];
        }

        this.oscillator.phase = ((phase % 360) + 360) % 360;
        this.oscillator.frequency.setValueAtTime(noteToPlay, time);

        if (this.oscillator.state === 'started') this.oscillator.stop(time);
        this.oscillator.start(time);

        this.velocityGain.gain.setValueAtTime(velocity, time);

        const envGain = this.envelopeGain.gain;
        const currentEnv = envGain.value;
        envGain.cancelScheduledValues(time);
        envGain.setValueAtTime(currentEnv, time);

        // Attack
        if (env.attackCurve && env.attackCurve.length > 0) {
            const attackValues = env.attackCurve.map(p => currentEnv + p * (1.0 - currentEnv));
            envGain.setValueCurveAtTime(attackValues, time, env.attack);
        } else {
            envGain.linearRampToValueAtTime(1.0, time + env.attack);
        }

        // Decay
        const decayStartTime = time + env.attack;
        if (env.decayCurve && env.decayCurve.length > 0) {
            envGain.setValueCurveAtTime(env.decayCurve, decayStartTime, env.decay);
        } else {
            envGain.exponentialRampToValueAtTime(Math.max(env.sustain, 0.0001), decayStartTime + env.decay);
        }
    }

    public release(env: Envelope) {
        const time = now() + 0.02;
        const envGain = this.envelopeGain.gain;
        const currentEnv = envGain.value;

        envGain.cancelScheduledValues(time);
        envGain.setValueAtTime(currentEnv, time);

        if (env.releaseCurve && env.releaseCurve.length > 0) {
            const scaledRelease = env.releaseCurve.map(v => v * currentEnv);
            envGain.setValueCurveAtTime(scaledRelease, time, env.release);
        } else {
            envGain.exponentialRampToValueAtTime(0.0001, time + env.release);
        }

        const stopTime = time + env.release + 0.01;
        envGain.setValueAtTime(0, stopTime);

        this.oscillator.stop(stopTime);

        this.active = false;
        this.note = null;
    }

    public softKill() {
        const time = now() + 0.01;
        const envGain = this.envelopeGain.gain;

        envGain.cancelScheduledValues(time);
        envGain.setValueAtTime(envGain.value, time);
        envGain.linearRampToValueAtTime(0, time + 0.005);

        this.oscillator.stop(time + 0.01);

        this.active = false;
        this.note = null;
    }

    public dispose() {
        this.oscillator.stop().dispose();
        this.envelopeGain.dispose();
        this.velocityGain.dispose();
    }
}