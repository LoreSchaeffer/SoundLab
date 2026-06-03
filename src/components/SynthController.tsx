import {useEffect, useState} from 'react';
import Piano from './widgets/Piano.tsx';
import {useMidi} from '../contexts/MidiContext';
import {useSynth} from '../contexts/SynthContext';
import CurveEditor from "./forms/CurveEditor.tsx";
import Envelope, {type TriggerEvent} from "./widgets/Envelope.tsx";
import {generateBezierArray, generateMSEGArray} from "../utils/curves.ts";
import HarmonicsEditor from "./forms/HarmonicsEditor.tsx";
import {usePreset} from "../contexts/PresetContext.ts";
import Spectrogram from "./widgets/Spectrogram.tsx";

const SynthController = () => {
    const {isAudioReady, initAudio, playNote: synthPlayNote, releaseNote: synthReleaseNote, setEnvelope, partials, setPartials} = useSynth();
    const {presets, activePreset, loadPreset, attackData, setAttackData, decayData, setDecayData, releaseData, setReleaseData} = usePreset();

    const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
    const [triggerEvent, setTriggerEvent] = useState<TriggerEvent | null>(null);

    useEffect(() => {
        const attackSec = Math.max(0.001, attackData.time / 1000);
        const decaySec = Math.max(0.001, decayData.time / 1000);
        const releaseSec = Math.max(0.001, releaseData.time / 1000);

        const attackCurve = attackData.isAdvanced
            ? generateMSEGArray(attackData.points)
            : generateBezierArray(0.0, 1.0, attackData.handle1, attackData.handle2);

        const decayCurve = decayData.isAdvanced
            ? generateMSEGArray(decayData.points)
            : generateBezierArray(1.0, 0.0, decayData.handle1, decayData.handle2);

        const releaseCurve = releaseData.isAdvanced
            ? generateMSEGArray(releaseData.points)
            : generateBezierArray(1.0, 0.0, releaseData.handle1, releaseData.handle2);

        setEnvelope({
            attack: attackSec, decay: decaySec, sustain: 0.0, release: releaseSec,
            attackCurve, decayCurve, releaseCurve
        });

    }, [attackData, decayData, releaseData, setEnvelope]);

    const playNote = (note: string, velocity: number = 1) => {
        if (!isAudioReady) initAudio();
        synthPlayNote(note, velocity);
        setTriggerEvent({type: 'attack', timestamp: performance.now()});
        setActiveNotes(prev => {
            const next = new Set(prev);
            next.add(note);
            return next;
        });
    };

    const releaseNote = (note: string) => {
        synthReleaseNote(note);
        setActiveNotes(prev => {
            if (!prev.has(note)) return prev;
            const next = new Set(prev);
            next.delete(note);
            if (next.size === 0) setTriggerEvent({type: 'release', timestamp: performance.now()});
            return next;
        });
    };

    useMidi(playNote, releaseNote);

    return (
        <div>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '15px', backgroundColor: 'var(--background-secondary)',
                padding: '10px 15px', borderRadius: '4px', border: '1px solid hsl(var(--neutral-50-hsl) / 0.1)'
            }}>
                <span style={{fontWeight: 700, color: 'var(--cyan-500)', textTransform: 'uppercase', fontSize: '0.9rem'}}>
                    Instrument Preset
                </span>
                <select
                    value={activePreset?.name || ""}
                    onChange={(e) => loadPreset(e.target.value)}
                    style={{
                        background: 'var(--background-tertiary)', color: 'var(--neutral-50)',
                        border: '1px solid hsl(var(--neutral-50-hsl) / 0.2)', padding: '5px 10px',
                        borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold',
                        outline: 'none', cursor: 'pointer'
                    }}
                >
                    {presets.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                </select>
            </div>

            <Spectrogram/>

            <HarmonicsEditor
                color="cyan"
                partials={partials}
                onPartialsChange={setPartials}
                width={620}
            />

            <br/>

            <div style={{display: 'flex', gap: '10px', flexDirection: 'row'}}>
                <CurveEditor
                    title="Attack"
                    color={attackData.color}
                    time={attackData.time}
                    startY={0.0}
                    endY={1.0}
                    allowAdvanced={true}
                    isAdvanced={attackData.isAdvanced}
                    handle1={attackData.handle1}
                    handle2={attackData.handle2}
                    points={attackData.points}
                    onCurveChange={(h1, h2) => setAttackData(prev => ({...prev, handle1: h1, handle2: h2}))}
                    onPointsChange={(pts) => setAttackData(prev => ({...prev, points: pts}))}
                    onModeChange={(adv) => setAttackData(prev => ({...prev, isAdvanced: adv}))}
                    onTimeChange={(newTime) => setAttackData(prev => ({...prev, time: newTime}))}
                />
                <CurveEditor
                    title="Decay"
                    color={decayData.color}
                    time={decayData.time}
                    startY={1.0}
                    endY={0.0}
                    allowAdvanced={true}
                    isAdvanced={decayData.isAdvanced}
                    handle1={decayData.handle1}
                    handle2={decayData.handle2}
                    points={decayData.points}
                    onCurveChange={(h1, h2) => setDecayData(prev => ({...prev, handle1: h1, handle2: h2}))}
                    onPointsChange={(pts) => setDecayData(prev => ({...prev, points: pts}))}
                    onModeChange={(adv) => setDecayData(prev => ({...prev, isAdvanced: adv}))}
                    onTimeChange={(newTime) => setDecayData(prev => ({...prev, time: newTime}))}
                />
                <CurveEditor
                    title="Release"
                    color={releaseData.color}
                    time={releaseData.time}
                    startY={1.0}
                    endY={0.0}
                    allowAdvanced={true}
                    isAdvanced={releaseData.isAdvanced}
                    handle1={releaseData.handle1}
                    handle2={releaseData.handle2}
                    points={releaseData.points}
                    onCurveChange={(h1, h2) => setReleaseData(prev => ({...prev, handle1: h1, handle2: h2}))}
                    onPointsChange={(pts) => setReleaseData(prev => ({...prev, points: pts}))}
                    onModeChange={(adv) => setReleaseData(prev => ({...prev, isAdvanced: adv}))}
                    onTimeChange={(newTime) => setReleaseData(prev => ({...prev, time: newTime}))}
                />
            </div>

            <br/>

            <Envelope
                attack={{
                    time: attackData.time,
                    color: attackData.color,
                    handle1: !attackData.isAdvanced ? attackData.handle1 : undefined,
                    handle2: !attackData.isAdvanced ? attackData.handle2 : undefined,
                    points: attackData.isAdvanced ? attackData.points : undefined
                }}
                decay={{
                    time: decayData.time,
                    color: decayData.color,
                    handle1: !decayData.isAdvanced ? decayData.handle1 : undefined,
                    handle2: !decayData.isAdvanced ? decayData.handle2 : undefined,
                    points: decayData.isAdvanced ? decayData.points : undefined
                }}
                release={{
                    time: releaseData.time,
                    color: releaseData.color,
                    handle1: !releaseData.isAdvanced ? releaseData.handle1 : undefined,
                    handle2: !releaseData.isAdvanced ? releaseData.handle2 : undefined,
                    points: releaseData.isAdvanced ? releaseData.points : undefined
                }}
                triggerEvent={triggerEvent}
            />

            <br/>

            <Piano
                playNote={(n) => playNote(n, 1)}
                releaseNote={releaseNote}
                activeNotes={activeNotes}
                startNote={'C3'}
                endNote={'C6'}
            />
        </div>
    );
};

export default SynthController;