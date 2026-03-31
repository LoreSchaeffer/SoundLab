import {useEffect, useState} from 'react';
import Piano from './widgets/Piano.tsx';
import {useMidi} from '../contexts/MidiContext';
import {useSynth} from '../contexts/SynthContext';
import CurveEditor from "./forms/CurveEditor.tsx";
import Envelope, {type EnvelopeData} from "./widgets/Envelope.tsx";
import {generateBezierArray} from "../utils/bezier.ts";

const SynthController = () => {
    const {isAudioReady, initAudio, playNote: synthPlayNote, releaseNote: synthReleaseNote, setEnvelope} = useSynth();
    const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
    const [attackData, setAttackData] = useState<EnvelopeData>({handle1: {x: 0, y: 0}, handle2: {x: 1, y: 1}, time: 100, color: 'red'});
    const [decayData, setDecayData] = useState<EnvelopeData>({handle1: {x: 0, y: 1}, handle2: {x: 1, y: 0}, time: 1000, color: 'yellow'});
    const [releaseData, setReleaseData] = useState<EnvelopeData>({handle1: {x: 0, y: 1}, handle2: {x: 1, y: 0}, time: 60, color: 'blue'});

    useEffect(() => {
        const attackSec = Math.max(0.001, attackData.time / 1000);
        const decaySec = Math.max(0.001, decayData.time / 1000);
        const releaseSec = Math.max(0.001, releaseData.time / 1000);

        const attackCurve = generateBezierArray(0.0, 1.0, attackData.handle1, attackData.handle2);
        const decayCurve = generateBezierArray(1.0, 0.0, decayData.handle1, decayData.handle2);
        const releaseCurve = generateBezierArray(1.0, 0.0, releaseData.handle1, releaseData.handle2);

        setEnvelope({
            attack: attackSec,
            decay: decaySec,
            sustain: 0.0,
            release: releaseSec,
            attackCurve,
            decayCurve,
            releaseCurve
        });

    }, [attackData, decayData, releaseData, setEnvelope]);

    const playNote = (note: string, velocity: number = 1) => {
        if (!isAudioReady) initAudio();

        synthPlayNote(note, velocity);

        setActiveNotes(prev => {
            const next = new Set(prev);
            next.add(note);
            return next;
        });
    };

    const releaseNote = (note: string) => {
        synthReleaseNote(note);

        setActiveNotes(prev => {
            const next = new Set(prev);
            next.delete(note);
            return next;
        });
    };

    useMidi(playNote, releaseNote);

    return (
        <div>
            <div style={{display: 'flex', gap: '10px', flexDirection: 'row'}}>
                <CurveEditor
                    title="Attack"
                    color={attackData.color}
                    time={attackData.time}
                    startY={0.0}
                    endY={1.0}
                    handle1={attackData.handle1}
                    handle2={attackData.handle2}
                    onCurveChange={(handle1, handle2) => setAttackData(prev => ({...prev, handle1, handle2}))}
                    onTimeChange={(newTime) => setAttackData(prev => ({...prev, time: newTime}))}
                />
                <CurveEditor
                    title="Decay"
                    color={decayData.color}
                    time={decayData.time}
                    startY={1.0}
                    endY={0.0}
                    handle1={decayData.handle1}
                    handle2={decayData.handle2}
                    onCurveChange={(handle1, handle2) => setDecayData(prev => ({...prev, handle1, handle2}))}
                    onTimeChange={(newTime) => setDecayData(prev => ({...prev, time: newTime}))}
                />
                <CurveEditor
                    title="Release"
                    color={releaseData.color}
                    time={releaseData.time}
                    startY={1.0}
                    endY={0.0}
                    handle1={releaseData.handle1}
                    handle2={releaseData.handle2}
                    onCurveChange={(handle1, handle2) => setReleaseData(prev => ({...prev, handle1, handle2}))}
                    onTimeChange={(newTime) => setReleaseData(prev => ({...prev, time: newTime}))}
                />
            </div>

            <br/>

            <Envelope attack={attackData} decay={decayData} release={releaseData}/>

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