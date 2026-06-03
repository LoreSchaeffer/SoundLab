import type {Coord} from "../types";

export type AudioAnalysisResult = {
    partials: number[];
    attackTime: number;
    decayTime: number;
    decayPoints: Coord[];
    fundamentalFreq: number;
};

export const analyzeSample = async (buffer: AudioBuffer): Promise<AudioAnalysisResult> => {
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    const totalSamples = channelData.length;

    const windowSize = Math.floor(sampleRate * 0.01);
    const amplitudeCurve: number[] = [];

    let maxAmplitude = 0;
    let peakWindowIndex = 0;

    for (let i = 0; i < totalSamples; i += windowSize) {
        let maxInWindow = 0;
        const end = Math.min(i + windowSize, totalSamples);

        for (let j = i; j < end; j++) {
            const absVal = Math.abs(channelData[j]);
            if (absVal > maxInWindow) maxInWindow = absVal;
        }

        amplitudeCurve.push(maxInWindow);

        if (maxInWindow > maxAmplitude) {
            maxAmplitude = maxInWindow;
            peakWindowIndex = amplitudeCurve.length - 1;
        }
    }

    const attackTimeMs = (peakWindowIndex * 10) || 1;

    const decayCurve = amplitudeCurve.slice(peakWindowIndex);
    const decayDurationMs = decayCurve.length * 10;

    const p1: Coord = {x: 0.0, y: 1.0};

    const midIndex1 = Math.floor(decayCurve.length * 0.2);
    const p2: Coord = {
        x: 0.2,
        y: Math.max(0.01, decayCurve[midIndex1] / maxAmplitude)
    };

    const midIndex2 = Math.floor(decayCurve.length * 0.6);
    const p3: Coord = {
        x: 0.6,
        y: Math.max(0.01, decayCurve[midIndex2] / maxAmplitude)
    };

    const p4: Coord = {x: 1.0, y: 0.0};

    const decayPoints = [p1, p2, p3, p4];

    const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;

    const analyser = offlineCtx.createAnalyser();
    analyser.fftSize = 32768;
    analyser.smoothingTimeConstant = 0.0;

    source.connect(analyser);
    analyser.connect(offlineCtx.destination);

    source.start(0);

    const peakTimeSeconds = attackTimeMs / 1000;

    return new Promise((resolve) => {
        offlineCtx.suspend(peakTimeSeconds + 0.05).then(() => {
            const freqs = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(freqs);

            const hzPerBin = (sampleRate / 2) / analyser.frequencyBinCount;

            let maxDb = -Infinity;
            let fundamentalBin = 0;
            const minBin = Math.floor(50 / hzPerBin);
            const maxBin = Math.floor(2000 / hzPerBin);

            for (let i = minBin; i < maxBin; i++) {
                if (freqs[i] > maxDb) {
                    maxDb = freqs[i];
                    fundamentalBin = i;
                }
            }

            const f0 = fundamentalBin * hzPerBin;

            const partials = new Array(16).fill(0);

            for (let harmonic = 1; harmonic <= 16; harmonic++) {
                const targetFreq = f0 * harmonic;
                const targetBin = Math.round(targetFreq / hzPerBin);

                let localMaxDb = -1000;
                const searchRadius = 3;

                for (let j = targetBin - searchRadius; j <= targetBin + searchRadius; j++) {
                    if (j > 0 && j < freqs.length && freqs[j] > localMaxDb) {
                        localMaxDb = freqs[j];
                    }
                }

                partials[harmonic - 1] = Math.pow(10, localMaxDb / 20);
            }

            const maxPartial = Math.max(...partials);
            const normalizedPartials = partials.map(p =>
                maxPartial > 0 ? Number((p / maxPartial).toFixed(4)) : 0
            );

            offlineCtx.resume();

            resolve({
                partials: normalizedPartials,
                attackTime: attackTimeMs,
                decayTime: decayDurationMs,
                decayPoints: decayPoints,
                fundamentalFreq: Number(f0.toFixed(2))
            });
        });

        offlineCtx.startRendering();
    });
};