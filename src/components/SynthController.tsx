import {useState} from 'react';
import Piano from './Piano';
import {useMidi} from '../contexts/MidiContext';
import {useSynth} from '../contexts/SynthContext';
import CurveEditor, { type Point } from "./forms/CurveEditor.tsx";

const SynthController = () => {
    const {
        isAudioReady,
        initAudio,
        playNote: synthPlayNote,
        releaseNote: synthReleaseNote
    } = useSynth();

    const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

    const playNote = (note: string, velocity: number = 1) => {
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

    const [attackCp1, setAttackCp1] = useState({ x: 0, y: 0 });
    const [attackCp2, setAttackCp2] = useState({ x: 1, y: 1 });

    return (
        <div className="flex flex-col items-center gap-4 relative">
            <CurveEditor
                title="ATTACK"
                color="red"
                time={10}
                startY={0.0}
                endY={1.0}
                handle1={attackCp1}
                handle2={attackCp2}
                onCurveChange={(newCp1, newCp2) => {
                    setAttackCp1(newCp1);
                    setAttackCp2(newCp2);
                }}
            />

            {!isAudioReady && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 rounded-lg cursor-pointer backdrop-blur-sm"
                    onClick={initAudio}
                >
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-2">Synth Lab</h2>
                        <p className="text-slate-300">Clicca per attivare l'audio</p>
                    </div>
                </div>
            )}

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