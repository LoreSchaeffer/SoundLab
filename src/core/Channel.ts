import type {InstrumentConfig} from "../types";
import {Frequency, Gain} from "tone";
import {Voice} from "./Voice.ts";

export class Channel {
    public id: string;
    public config: InstrumentConfig;
    public outputNode: Gain;
    private voices: Voice[] = [];

    constructor(config: InstrumentConfig, destination: Gain, polyphony: number) {
        this.id = config.id;
        this.config = config;
        this.outputNode = new Gain(config.volume).connect(destination);

        for (let i = 0; i < polyphony; i++) {
            this.voices.push(new Voice(this.outputNode));
        }
    }

    public setVolume(volume: number) {
        this.config.volume = volume;
        this.outputNode.gain.rampTo(volume, 0.05);
    }

    public updateConfig(newConfig: Partial<InstrumentConfig>) {
        this.config = {
            ...this.config,
            ...newConfig
        };

        this.voices.forEach(v => {
            if (v.oscillators.length > 0) {
                if (!this.config.customRatios || this.config.customRatios.length === 0) {
                    const mainOsc = v.oscillators[0];

                    if (newConfig.oscillatorType !== undefined) {
                        mainOsc.type = newConfig.oscillatorType === 'sine' ? 'custom' : newConfig.oscillatorType;
                        if (newConfig.oscillatorType === 'custom') mainOsc.partials = [...this.config.partials];
                        if (newConfig.oscillatorType === 'sine') mainOsc.partials = [1];
                    } else if (newConfig.partials !== undefined && (this.config.oscillatorType === 'custom' || this.config.oscillatorType === 'sine')) {
                        mainOsc.partials = [...newConfig.partials];
                    }
                }

                if (newConfig.phase !== undefined) {
                    const newPhase = ((newConfig.phase % 360) + 360) % 360;
                    v.oscillators.forEach(osc => osc.phase = newPhase);
                }
            }
        });
    }

    public playNote(note: string | number, velocity: number = 1, time?: number) {
        if (this.voices.some(v => v.note === note && v.active)) return;

        let freeVoice = this.voices.find(v => !v.active);
        if (!freeVoice) {
            freeVoice = this.voices.shift()!;
            freeVoice.softKill();
            this.voices.push(freeVoice);
        } else {
            this.voices = this.voices.filter(v => v !== freeVoice);
            this.voices.push(freeVoice);
        }

        freeVoice.play(note, velocity, this.config, time);
    }

    public releaseNote(note: string | number) {
        const voice = this.voices.find(v => v.note === note && v.active);
        if (voice) voice.release(this.config);
    }

    public updateNoteFrequency(oldNote: string | number, newNote: string | number) {
        const voice = this.voices.find(v => v.note === oldNote && v.active);
        if (voice) {
            voice.note = newNote;
            const baseFreq = Frequency(newNote).toFrequency();

            if (this.config.customRatios && this.config.customRatios.length > 0) {
                voice.oscillators.forEach((osc, idx) => {
                    if (idx < this.config.customRatios!.length) {
                        osc.frequency.rampTo(baseFreq * this.config.customRatios![idx].ratio, 0.1);
                    }
                });
            } else if (voice.oscillators.length > 0) {
                voice.oscillators[0].frequency.rampTo(newNote, 0.1);
            }
        }
    }

    public dispose() {
        this.voices.forEach(voice => voice.dispose());
        this.voices = [];
        this.outputNode.dispose();
    }
}