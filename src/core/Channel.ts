import type {InstrumentConfig} from "../types/audio.ts";
import {Gain} from "tone";
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
            if (newConfig.oscillatorType !== undefined) {
                v.oscillator.type = newConfig.oscillatorType;
                if (newConfig.oscillatorType === 'custom') v.oscillator.partials = [...this.config.partials];
            } else if (newConfig.partials !== undefined && this.config.oscillatorType === 'custom') {
                v.oscillator.partials = [...newConfig.partials];
            }

            if (newConfig.phase !== undefined) {
                v.oscillator.phase = ((newConfig.phase % 360) + 360) % 360;
            }
        });
    }

    public playNote(note: string | number, velocity: number = 1, time?: number) {
        if (this.voices.some(v => v.note === note && v.active)) return;

        // Round-Robin Voice Stealing
        let freeVoice = this.voices.find(v => !v.active);
        if (!freeVoice) {
            freeVoice = this.voices.shift()!;
            freeVoice.softKill();
            this.voices.push(freeVoice);
        } else {
            this.voices = this.voices.filter(v => v !== freeVoice);
            this.voices.push(freeVoice);
        }

        freeVoice.play(note, velocity, this.config.oscillatorType, this.config.partials, this.config.envelope, this.config.phase || 0, time);
    }

    public releaseNote(note: string | number) {
        const voice = this.voices.find(v => v.note === note && v.active);
        if (voice) voice.release(this.config.envelope);
    }

    public updateNoteFrequency(oldNote: string | number, newNote: string | number) {
        const voice = this.voices.find(v => v.note === oldNote && v.active);

        if (voice) {
            voice.note = newNote;
            voice.oscillator.frequency.rampTo(newNote as number, 0.05);
        }
    }

    public dispose() {
        this.voices.forEach(v => v.dispose());
        this.outputNode.dispose();
    }
}