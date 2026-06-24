import {Filter, Frequency, Gain, LFO, Noise, now, Oscillator} from "tone";
import type {InstrumentConfig} from "../types";

export class Voice {
    public oscillators: Oscillator[] = [];
    public filter: Filter;
    public envelopeGain: Gain;
    public velocityGain: Gain;
    public noise: Noise;
    public noiseFilter: Filter;
    public noiseEnvelope: Gain;
    public lfo: LFO;
    public lfoVolumeGain: Gain;

    public active: boolean = false;
    public note: string | number | null = null;

    private currentScaledRelease: number = 0;
    private currentNoiseRelease: number = 0;

    constructor(targetNode: Gain) {
        // MAIN SIGNAL CHAIN: Oscillators -> Filter -> LFO Volume -> Envelope -> Velocity -> Output
        this.velocityGain = new Gain(0).connect(targetNode);
        this.envelopeGain = new Gain(0).connect(this.velocityGain);
        this.lfoVolumeGain = new Gain(1).connect(this.envelopeGain);
        this.filter = new Filter(20000, "lowpass").connect(this.lfoVolumeGain);

        // NOISE SIGNAL CHAIN: Noise -> NoiseFilter -> NoiseEnvelope -> Velocity -> Output
        this.noiseEnvelope = new Gain(0).connect(this.velocityGain);
        this.noiseFilter = new Filter(20000, "lowpass").connect(this.noiseEnvelope);
        this.noise = new Noise("white").connect(this.noiseFilter);

        // LFO MODULE
        this.lfo = new LFO(5, 0, 1);
    }

    private setupOscillators(count: number) {
        while (this.oscillators.length < count) {
            this.oscillators.push(new Oscillator({volume: -12}).connect(this.filter));
        }
    }

    public play(noteToPlay: string | number, velocity: number, config: InstrumentConfig, syncTime?: number) {
        this.active = true;
        this.note = noteToPlay;

        const time = syncTime !== undefined ? syncTime : now() + 0.02;

        // KEY TRACKING (Acoustic Damping Physics)
        let timeMultiplier = 1.0;
        if (config.keyTracking && config.keyTracking.decayScaling > 0 && config.keyTracking.centerNote) {
            try {
                const playedMidi = Frequency(noteToPlay).toMidi();
                const centerMidi = Frequency(config.keyTracking.centerNote).toMidi();
                const octavesDistance = (playedMidi - centerMidi) / 12;
                timeMultiplier = Math.pow(config.keyTracking.decayScaling, octavesDistance);
            } catch {
                // Ignored
            }
        }

        const env = config.envelope;
        const envDecaySecs = typeof env.decay === 'object' ? (env.decay as any).time / 1000 : env.decay;
        const envReleaseSecs = typeof env.release === 'object' ? (env.release as any).time / 1000 : env.release;

        const scaledDecay = Math.max(0.001, envDecaySecs * timeMultiplier);
        const scaledRelease = Math.max(0.001, envReleaseSecs * timeMultiplier);
        this.currentScaledRelease = scaledRelease;

        // MULTI-OSCILLATORS & INHARMONICITY
        const baseFreq = Frequency(noteToPlay).toFrequency();

        if (config.customRatios && config.customRatios.length > 0) {
            // Complex Mode: One sine oscillator per inharmonic partial (e.g., Celesta, Bells)
            this.setupOscillators(config.customRatios.length);
            this.oscillators.forEach((osc, idx) => {
                if (idx < config.customRatios!.length) {
                    const ratioData = config.customRatios![idx];
                    osc.type = 'sine';
                    const ampDb = ratioData.amplitude > 0.001 ? 20 * Math.log10(ratioData.amplitude) : -100;
                    osc.volume.value = -12 + ampDb;
                    osc.frequency.setValueAtTime(baseFreq * ratioData.ratio, time);
                    osc.phase = (((config.phase || 0) % 360) + 360) % 360;
                    osc.start(time);
                } else {
                    osc.stop(time);
                }
            });
        } else {
            // Standard Mode: Single additive oscillator (e.g., Flute, Brass, standard Piano)
            this.setupOscillators(1);
            const osc = this.oscillators[0];
            if (config.oscillatorType === 'sine') {
                osc.type = 'custom';
                osc.partials = [1];
            } else {
                osc.type = config.oscillatorType;
                if (config.oscillatorType === 'custom') osc.partials = [...config.partials];
            }
            osc.volume.value = -12;
            osc.frequency.setValueAtTime(noteToPlay, time);
            osc.phase = (((config.phase || 0) % 360) + 360) % 360;
            osc.start(time);

            for (let i = 1; i < this.oscillators.length; i++) {
                this.oscillators[i].stop(time);
            }
        }

        // FILTER WITH VELOCITY SENSITIVITY
        if (config.filter) {
            this.filter.type = config.filter.type;
            const baseCutoff = Math.max(10, Math.min(22000, config.filter.cutoff));

            const velSense = config.filter.velocitySensitivity ?? 0;
            const dynamicAmount = config.filter.envelopeAmount * (1 - velSense + (velocity * velSense));
            const peakCutoff = Math.max(10, Math.min(22000, baseCutoff + dynamicAmount));

            const rawFAttack = config.filter.attack;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filterAttackSecs = typeof rawFAttack === 'object' ? (rawFAttack as any).time / 1000 : rawFAttack;

            const rawFDecay = config.filter.decay;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filterDecaySecs = typeof rawFDecay === 'object' ? (rawFDecay as any).time / 1000 : rawFDecay;

            const finalFAttack = Math.max(0.001, filterAttackSecs);
            const finalFDecay = Math.max(0.001, filterDecaySecs * timeMultiplier);

            this.filter.frequency.setValueAtTime(baseCutoff, time);
            this.filter.frequency.linearRampToValueAtTime(peakCutoff, time + finalFAttack);
            this.filter.frequency.exponentialRampToValueAtTime(baseCutoff, time + finalFAttack + finalFDecay);
        } else {
            this.filter.frequency.setValueAtTime(20000, time);
        }

        // TRANSIENT NOISE LAYER
        if (config.noiseLayer) {
            this.noise.type = config.noiseLayer.type;
            this.noiseFilter.frequency.setValueAtTime(config.noiseLayer.filterCutoff ?? 20000, time);

            const noiseDb = config.noiseLayer.volume > 0.001 ? 20 * Math.log10(config.noiseLayer.volume) : -100;
            this.noise.volume.value = noiseDb;

            const nEnv = config.noiseLayer.envelope;
            this.currentNoiseRelease = nEnv.release;
            const nEnvGain = this.noiseEnvelope.gain;

            nEnvGain.cancelScheduledValues(time);
            nEnvGain.setValueAtTime(0, time);

            if (nEnv.attackCurve && nEnv.attackCurve.length > 0) nEnvGain.setValueCurveAtTime(nEnv.attackCurve, time, nEnv.attack);
            else nEnvGain.linearRampToValueAtTime(1, time + nEnv.attack);

            const nDecayStart = time + nEnv.attack;
            if (nEnv.decayCurve && nEnv.decayCurve.length > 0) {
                const scaled = nEnv.decayCurve.map(v => v * (1 - nEnv.sustain) + nEnv.sustain);
                nEnvGain.setValueCurveAtTime(scaled, nDecayStart, nEnv.decay);
            } else {
                nEnvGain.exponentialRampToValueAtTime(Math.max(nEnv.sustain, 0.0001), nDecayStart + nEnv.decay);
            }

            this.noise.start(time);
        } else {
            this.noise.stop(time);
        }

        // LFO MODULATION
        this.lfo.disconnect();
        this.lfoVolumeGain.gain.value = 1;

        if (config.lfo && config.lfo.amount > 0) {
            this.lfo.frequency.value = config.lfo.frequency;
            const delay = (config.lfo.delay || 0) / 1000;

            if (config.lfo.target === 'pitch') {
                this.lfo.min = -config.lfo.amount;
                this.lfo.max = config.lfo.amount;
                this.oscillators.forEach(osc => this.lfo.connect(osc.detune));
            } else if (config.lfo.target === 'filter') {
                this.lfo.min = -config.lfo.amount;
                this.lfo.max = config.lfo.amount;
                this.lfo.connect(this.filter.detune);
            } else if (config.lfo.target === 'volume') {
                this.lfo.min = Math.max(0, 1 - config.lfo.amount);
                this.lfo.max = 1;
                this.lfo.connect(this.lfoVolumeGain.gain);
            }
            this.lfo.start(time + delay);
        } else {
            this.lfo.stop(time);
        }

        // MAIN VOLUME ENVELOPE
        const envGain = this.envelopeGain.gain;
        this.velocityGain.gain.setValueAtTime(velocity, time);

        envGain.cancelScheduledValues(time);
        envGain.setValueAtTime(0, time);

        if (env.attackCurve && env.attackCurve.length > 0) envGain.setValueCurveAtTime(env.attackCurve, time, env.attack);
        else envGain.linearRampToValueAtTime(1, time + env.attack);

        const decayStartTime = time + env.attack;
        if (env.decayCurve && env.decayCurve.length > 0) {
            const scaledCurve = env.decayCurve.map(v => v * (1 - env.sustain) + env.sustain);
            envGain.setValueCurveAtTime(scaledCurve, decayStartTime, scaledDecay);
        } else {
            envGain.exponentialRampToValueAtTime(Math.max(env.sustain, 0.0001), decayStartTime + scaledDecay);
        }
    }

    public release(config: InstrumentConfig) {
        const time = now() + 0.02;

        // Main Envelope Release
        const envGain = this.envelopeGain.gain;
        const currentEnv = envGain.value;
        const releaseTime = this.currentScaledRelease || config.envelope.release;

        envGain.cancelScheduledValues(time);
        envGain.setValueAtTime(currentEnv, time);

        if (config.envelope.releaseCurve && config.envelope.releaseCurve.length > 0) {
            const scaledRelease = config.envelope.releaseCurve.map(v => v * currentEnv);
            envGain.setValueCurveAtTime(scaledRelease, time, releaseTime);
        } else {
            envGain.exponentialRampToValueAtTime(0.0001, time + releaseTime);
        }

        const stopTime = time + releaseTime + 0.01;
        envGain.setValueAtTime(0, stopTime);

        this.oscillators.forEach(osc => osc.stop(stopTime));
        this.lfo.stop(stopTime);

        // Noise Envelope Release
        if (config.noiseLayer) {
            const nEnvGain = this.noiseEnvelope.gain;
            const nRelease = this.currentNoiseRelease;
            const currentNoiseEnv = nEnvGain.value;

            nEnvGain.cancelScheduledValues(time);
            nEnvGain.setValueAtTime(currentNoiseEnv, time);

            const nEnvConfig = config.noiseLayer.envelope;
            if (nEnvConfig.releaseCurve && nEnvConfig.releaseCurve.length > 0) {
                const scaled = nEnvConfig.releaseCurve.map(v => v * currentNoiseEnv);
                nEnvGain.setValueCurveAtTime(scaled, time, nRelease);
            } else {
                nEnvGain.exponentialRampToValueAtTime(0.0001, time + nRelease);
            }
            this.noise.stop(time + nRelease + 0.01);
        } else {
            this.noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
            this.noise.stop(time + 0.11);
        }

        this.active = false;
        this.note = null;
    }

    public softKill() {
        const time = now() + 0.01;
        const envGain = this.envelopeGain.gain;

        envGain.cancelScheduledValues(time);
        envGain.setValueAtTime(envGain.value, time);
        envGain.exponentialRampToValueAtTime(0.0001, time + 0.05);

        const stopTime = time + 0.06;
        this.oscillators.forEach(osc => osc.stop(stopTime));
        this.lfo.stop(stopTime);
        this.noise.stop(stopTime);

        this.active = false;
        this.note = null;
    }

    public dispose() {
        this.oscillators.forEach(osc => {
            osc.stop();
            osc.dispose();
        });
        this.oscillators = [];

        this.filter.dispose();
        this.envelopeGain.dispose();
        this.velocityGain.dispose();

        this.noise.stop();
        this.noise.dispose();
        this.noiseFilter.dispose();
        this.noiseEnvelope.dispose();

        this.lfo.stop();
        this.lfo.dispose();
        this.lfoVolumeGain.dispose();
    }
}