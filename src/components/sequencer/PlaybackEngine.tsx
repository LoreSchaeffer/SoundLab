import {useEffect, useMemo, useRef} from 'react';
import {useSequencer} from '../../contexts/SequencerContext.ts';
import {useSynth} from '../../contexts/SynthContext.ts';
import {usePreset} from '../../contexts/PresetContext.ts';
import {generateBezierArray, generateMSEGArray} from '../../utils/curves.ts';

type EnvData = {
    time: number;
    isAdvanced?: boolean;
    points?: { x: number; y: number }[];
    handle1?: { x: number; y: number };
    handle2?: { x: number; y: number };
};

const PlaybackEngine = () => {
    const {
        isPlaying, setIsPlaying, bpm, playheadBeat, setPlayheadBeat,
        tracks, isLooping, masterVolume
    } = useSequencer();

    const {playNote, releaseNote, registerChannel, updateChannelConfig} = useSynth();
    const {presets} = usePreset();

    const activeNotesRef = useRef<Map<string, { channelId: string, pitch: string, endBeat: number }>>(new Map());
    const tracksRef = useRef(tracks);
    const presetsRef = useRef(presets);
    const bpmRef = useRef(bpm);
    const isLoopingRef = useRef(isLooping);
    const synthRef = useRef({playNote, releaseNote, setIsPlaying, setPlayheadBeat});

    useEffect(() => {
        tracksRef.current = tracks;
    }, [tracks]);

    useEffect(() => {
        presetsRef.current = presets;
    }, [presets]);

    useEffect(() => {
        bpmRef.current = bpm;
    }, [bpm]);

    useEffect(() => {
        isLoopingRef.current = isLooping;
    }, [isLooping]);

    useEffect(() => {
        synthRef.current = {playNote, releaseNote, setIsPlaying, setPlayheadBeat};
    }, [playNote, releaseNote, setIsPlaying, setPlayheadBeat]);

    const actualLastBeat = useMemo(() => {
        let maxEnd = 0;
        tracks.forEach(t => t.notes.forEach(n => {
            const end = n.startBeat + n.durationBeats;
            if (end > maxEnd) maxEnd = end;
        }));
        return maxEnd > 0 ? maxEnd : 32;
    }, [tracks]);

    const actualLastBeatRef = useRef(actualLastBeat);
    useEffect(() => {
        actualLastBeatRef.current = actualLastBeat;
    }, [actualLastBeat]);

    const configHash = useMemo(() => {
        const coreData = tracks.map(t => ({
            id: t.id, name: t.name, presetId: t.presetId, volume: t.volume, isMuted: t.isMuted, isSolo: t.isSolo
        }));
        return JSON.stringify({coreData, masterVolume});
    }, [tracks, masterVolume]);

    useEffect(() => {
        const isAnySolo = tracks.some(t => t.isSolo);

        tracks.forEach(track => {
            const preset = presets.find(p => p.id === track.presetId);
            let actualVolume = track.volume * masterVolume;

            if (track.isMuted) actualVolume = 0;
            if (isAnySolo && !track.isSolo) actualVolume = 0;

            const getCurve = (data: EnvData | undefined, start: number, end: number) => {
                if (!data) return undefined;
                return data.isAdvanced && data.points
                    ? generateMSEGArray(data.points)
                    : (data.handle1 && data.handle2 ? generateBezierArray(start, end, data.handle1, data.handle2) : undefined);
            };

            const partials = preset?.partials || Array(16).fill(0).fill(1, 0, 1);
            const atk = preset?.attack || {time: 15};
            const dec = preset?.decay || {time: 500};
            const rel = preset?.release || {time: 300};

            const config = {
                name: track.name,
                volume: actualVolume,
                oscillatorType: preset?.oscillatorType || "sine",
                partials: partials,
                envelope: {
                    attack: Math.max(0.001, atk.time / 1000),
                    decay: Math.max(0.001, dec.time / 1000),
                    sustain: 0,
                    release: Math.max(0.001, rel.time / 1000),
                    attackCurve: getCurve(preset?.attack, 0.0, 1.0),
                    decayCurve: getCurve(preset?.decay, 1.0, 0.0),
                    releaseCurve: getCurve(preset?.release, 1.0, 0.0)
                },
                customRatios: preset?.customRatios,
                lfo: preset?.lfo,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                noiseLayer: preset?.noiseLayer as any,
                keyTracking: preset?.keyTracking,
                filter: preset?.filter ? {
                    type: preset.filter.type,
                    cutoff: preset.filter.cutoff,
                    envelopeAmount: preset.filter.envelopeAmount,
                    velocitySensitivity: preset.filter.velocitySensitivity,
                    attack: Math.max(0.001, preset.filter.attack.time / 1000),
                    decay: Math.max(0.001, preset.filter.decay.time / 1000),
                    attackCurve: getCurve(preset.filter.attack, 0.0, 1.0),
                    decayCurve: getCurve(preset.filter.decay, 1.0, 0.0)
                } : undefined
            };

            registerChannel({id: track.id, ...config});
            updateChannelConfig(track.id, config);
        });
    }, [configHash, presets, registerChannel, updateChannelConfig]);

    const engineStateRef = useRef({
        startTime: 0,
        startBeat: 0,
        lastProcessedBeat: 0,
        lastUiUpdateTime: 0
    });

    useEffect(() => {
        if (Math.abs(playheadBeat - engineStateRef.current.lastProcessedBeat) > 0.1) {
            engineStateRef.current.startBeat = playheadBeat;
            engineStateRef.current.startTime = performance.now();
            engineStateRef.current.lastProcessedBeat = playheadBeat;

            activeNotesRef.current.forEach((val) => releaseNote(val.channelId, val.pitch));
            activeNotesRef.current.clear();
        }
    }, [playheadBeat, releaseNote]);

    useEffect(() => {
        if (isPlaying) {
            engineStateRef.current.startBeat = engineStateRef.current.lastProcessedBeat;
            engineStateRef.current.startTime = performance.now();
        }
    }, [bpm, isPlaying]);

    useEffect(() => {
        if (!isPlaying) {
            activeNotesRef.current.forEach((val) => synthRef.current.releaseNote(val.channelId, val.pitch));
            activeNotesRef.current.clear();
            return;
        }

        engineStateRef.current.startTime = performance.now();
        engineStateRef.current.startBeat = engineStateRef.current.lastProcessedBeat;

        let animationFrameId: number;

        const loop = () => {
            const now = performance.now();
            const elapsedMs = now - engineStateRef.current.startTime;

            const beatsPerSecond = bpmRef.current / 60;

            const currentBeat = engineStateRef.current.startBeat + (elapsedMs / 1000) * beatsPerSecond;
            const prevBeat = engineStateRef.current.lastProcessedBeat;

            const {releaseNote: relNote, playNote: pNote, setPlayheadBeat: setPB, setIsPlaying: setPlay} = synthRef.current;
            const maxBeat = actualLastBeatRef.current;

            if (currentBeat >= maxBeat) {
                activeNotesRef.current.forEach((val) => relNote(val.channelId, val.pitch));
                activeNotesRef.current.clear();

                if (isLoopingRef.current) {
                    engineStateRef.current.startBeat = 0;
                    engineStateRef.current.startTime = performance.now();
                    engineStateRef.current.lastProcessedBeat = 0;
                    setPB(0);
                    animationFrameId = requestAnimationFrame(loop);
                } else {
                    engineStateRef.current.lastProcessedBeat = 0;
                    setPB(0);
                    setPlay(false);
                }
                return;
            }

            activeNotesRef.current.forEach((val, activeId) => {
                if (val.endBeat >= prevBeat && val.endBeat < currentBeat) {
                    relNote(val.channelId, val.pitch);
                    activeNotesRef.current.delete(activeId);
                }
            });

            tracksRef.current.forEach(track => {
                if (!track.presetId) return;

                track.notes.forEach(note => {
                    if (note.startBeat >= prevBeat && note.startBeat < currentBeat) {
                        const activeId = `${track.id}_${note.id}`;
                        pNote(track.id, note.pitch, note.velocity);
                        activeNotesRef.current.set(activeId, {
                            channelId: track.id,
                            pitch: note.pitch,
                            endBeat: note.startBeat + note.durationBeats
                        });
                    }
                });
            });

            engineStateRef.current.lastProcessedBeat = currentBeat;

            if (now - engineStateRef.current.lastUiUpdateTime > 33) {
                setPB(currentBeat);
                engineStateRef.current.lastUiUpdateTime = now;
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying]);

    return null;
};

export default PlaybackEngine;