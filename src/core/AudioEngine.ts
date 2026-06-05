import {Compressor, Limiter, Gain, start} from "tone";
import {Channel} from "./Channel";
import type {InstrumentConfig} from "../types/audio.ts";

class AudioEngineCore {
    private readonly masterVolumeNode: Gain;
    private readonly compressor: Compressor;
    private readonly limiter: Limiter;
    private channels: Map<string, Channel> = new Map();
    public isReady: boolean = false;

    constructor() {
        this.limiter = new Limiter(-1).toDestination();
        this.compressor = new Compressor({
            threshold: -18,
            ratio: 8,
            knee: 12,
            attack: 0.003,
            release: 0.25
        }).connect(this.limiter);
        this.masterVolumeNode = new Gain(1).connect(this.compressor);
    }

    public async init() {
        if (this.isReady) return;
        await start();
        this.isReady = true;
    }

    public setMasterVolume(volume: number) {
        this.masterVolumeNode.gain.rampTo(volume, 0.05);
    }

    public createChannel(config: InstrumentConfig): Channel {
        if (this.channels.has(config.id)) return this.channels.get(config.id)!;

        const channel = new Channel(config, this.masterVolumeNode, 8);
        this.channels.set(config.id, channel);
        return channel;
    }

    public getChannel(id: string): Channel | undefined {
        return this.channels.get(id);
    }

    public removeChannel(id: string) {
        const channel = this.channels.get(id);
        if (channel) {
            channel.dispose();
            this.channels.delete(id);
        }
    }
}

export const AudioEngine = new AudioEngineCore();