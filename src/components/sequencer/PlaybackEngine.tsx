import {useEffect, useRef} from 'react';
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
    const {isPlaying, bpm, setPlayheadBeat, tracks, totalBeats} = useSequencer();
    const {playNote, releaseNote, registerChannel, updateChannelConfig} = useSynth();
    const {presets} = usePreset();

    const lastTimeRef = useRef<number>(0);
    const activeNotesRef = useRef<Map<string, { channelId: string, pitch: string, endBeat: number }>>(new Map());

    useEffect(() => {
        const isAnySolo = tracks.some(t => t.isSolo);

        tracks.forEach(track => {
            const preset = presets.find(p => p.id === track.presetId);
            let actualVolume = track.volume;

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
                oscillatorType: "custom" as const,
                partials: partials,
                envelope: {
                    attack: Math.max(0.001, atk.time / 1000),
                    decay: Math.max(0.001, dec.time / 1000),
                    sustain: 0,
                    release: Math.max(0.001, rel.time / 1000),
                    attackCurve: getCurve(preset?.attack, 0.0, 1.0),
                    decayCurve: getCurve(preset?.decay, 1.0, 0.0),
                    releaseCurve: getCurve(preset?.release, 1.0, 0.0)
                }
            };

            registerChannel({id: track.id, ...config});
            updateChannelConfig(track.id, config);
        });

    }, [tracks, presets, registerChannel, updateChannelConfig]);


    useEffect(() => {
        if (!isPlaying) {
            lastTimeRef.current = 0;
            activeNotesRef.current.forEach((val) => releaseNote(val.channelId, val.pitch));
            activeNotesRef.current.clear();
            return;
        }

        let animationFrameId: number;

        const loop = (timestamp: number) => {
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            const deltaMs = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;

            const beatsPerSecond = bpm / 60;
            const deltaBeats = (deltaMs / 1000) * beatsPerSecond;

            setPlayheadBeat((prevBeat: number) => {
                let nextBeat = prevBeat + deltaBeats;

                if (nextBeat > totalBeats) {
                    nextBeat = 0;
                    activeNotesRef.current.forEach((val) => releaseNote(val.channelId, val.pitch));
                    activeNotesRef.current.clear();
                }

                tracks.forEach(track => {
                    if (!track.presetId) return;

                    track.notes.forEach(note => {
                        const noteEnd = note.startBeat + note.durationBeats;

                        if (note.startBeat >= prevBeat && note.startBeat < nextBeat) {
                            const activeId = `${track.id}_${note.id}`;

                            playNote(track.id, note.pitch, note.velocity);

                            activeNotesRef.current.set(activeId, {
                                channelId: track.id,
                                pitch: note.pitch,
                                endBeat: noteEnd
                            });
                        }
                    });
                });

                // RELEASE: La testina incrocia la fine della nota
                activeNotesRef.current.forEach((val, activeId) => {
                    if (val.endBeat >= prevBeat && val.endBeat < nextBeat) {
                        releaseNote(val.channelId, val.pitch);
                        activeNotesRef.current.delete(activeId);
                    }
                });

                return nextBeat;
            });

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, bpm, tracks, totalBeats, playNote, releaseNote, setPlayheadBeat]);

    return null;
};

export default PlaybackEngine;