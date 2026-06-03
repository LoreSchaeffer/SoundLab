import {useEffect, useState} from "react";
import type {PhaseState} from "../contexts/PresetContext.ts";
import {analyzeSample} from "../utils/audioAnalyzer.ts";
import CurveEditor from "../components/forms/CurveEditor.tsx";
import HarmonicsEditor from "../components/forms/HarmonicsEditor.tsx";
import Spectrogram from "../components/widgets/Spectrogram.tsx";
import Button from "../components/elements/Button.tsx";
import {MdMusicNote, MdSave} from "react-icons/md";
import {generateBezierArray, generateMSEGArray} from "../utils/curves.ts";
import {useSynth} from "../contexts/SynthContext.ts";

const PresetGeneratorPage = () => {
    // --- STATI DELLA PAGINA ---
    const [presetName, setPresetName] = useState("New Instrument");
    const [partials, setPartials] = useState<number[]>(new Array(16).fill(0));

    const [attackData, setAttackData] = useState<PhaseState>({
        time: 10, color: 'red',
        handle1: {x: 0, y: 0}, handle2: {x: 1, y: 1},
        isAdvanced: false, points: [{x: 0, y: 0}, {x: 1, y: 1}]
    });

    const [decayData, setDecayData] = useState<PhaseState>({
        time: 1000, color: 'yellow',
        handle1: {x: 0, y: 1}, handle2: {x: 1, y: 0},
        isAdvanced: false, points: [{x: 0, y: 1}, {x: 1, y: 0}]
    });

    const [releaseData, setReleaseData] = useState<PhaseState>({
        time: 150, color: 'blue',
        handle1: {x: 0.2, y: 0.8}, handle2: {x: 0.8, y: 0.2},
        isAdvanced: false, points: [{x: 0, y: 1}, {x: 1, y: 0}]
    });

    // --- MOTORE AUDIO SINTETICO ---
    const {isAudioReady, initAudio, playNote, releaseNote, setEnvelope, setPartials: setSynthPartials} = useSynth();

    // 1. Sincronizza le armoniche con il motore audio in tempo reale
    useEffect(() => {
        setSynthPartials(partials);
    }, [partials, setSynthPartials]);

    // 2. Sincronizza le curve di inviluppo con il motore audio in tempo reale
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
            attack: attackSec,
            decay: decaySec,
            sustain: 0.0,
            release: releaseSec,
            attackCurve,
            decayCurve,
            releaseCurve
        });
    }, [attackData, decayData, releaseData, setEnvelope]);

    // Gestori per il bottone di Test (funziona come un tasto di un piano)
    const handlePlaySynth = () => {
        if (!isAudioReady) initAudio();
        playNote('C4', 1); // Suona un Do4
    };

    const handleReleaseSynth = () => {
        releaseNote('C4');
    };

    // --- LOGICA DI ANALISI E SALVATAGGIO ---
    const handleAudioLoaded = async (buffer: AudioBuffer) => {
        const result = await analyzeSample(buffer);
        setPartials(result.partials);

        setAttackData(prev => ({
            ...prev,
            time: result.attackTime,
            isAdvanced: false,
            handle1: {x: 0.1, y: 0.8},
            handle2: {x: 0.5, y: 1.0}
        }));

        setDecayData(prev => ({
            ...prev,
            time: result.decayTime,
            isAdvanced: true,
            points: result.decayPoints
        }));
    };

    const handleSave = () => {
        const preset = {
            name: presetName,
            partials,
            attack: attackData,
            decay: decayData,
            release: releaseData
        };

        const jsonString = JSON.stringify(preset, null, 2);

        const blob = new Blob([jsonString], {type: 'application/json'});
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `${presetName.replace(/\s+/g, '_').toLowerCase()}.json`;

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        URL.revokeObjectURL(url);
    };

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px'}}>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{color: 'var(--neutral-400)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px'}}>
                        Preset Name
                    </span>
                    <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        style={{
                            background: 'transparent', border: 'none', borderBottom: '2px solid var(--cyan-500)',
                            color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 'bold', outline: 'none',
                            paddingBottom: '4px', width: '400px'
                        }}
                    />
                </div>

                <div style={{display: 'flex', gap: '10px'}}>
                    {/* TASTO TEST SINTETIZZATORE */}
                    <Button
                        color="blue"
                        icon={<MdMusicNote/>}
                        onMouseDown={handlePlaySynth}
                        onMouseUp={handleReleaseSynth}
                        onMouseLeave={handleReleaseSynth} // Stoppa la nota se il mouse esce dal bottone
                        style={{padding: '10px 20px', fontSize: '1rem', cursor: 'pointer'}}
                        title="Tieni premuto per ascoltare il suono sintetizzato"
                    >
                        Test Synth Note
                    </Button>

                    <Button color="green" icon={<MdSave/>} onClick={handleSave} style={{padding: '10px 20px', fontSize: '1rem'}}>
                        Export .json Preset
                    </Button>
                </div>
            </div>

            <Spectrogram height={280} onAudioLoaded={handleAudioLoaded}/>

            <div style={{display: 'flex', gap: '20px', alignItems: 'flex-start'}}>
                <HarmonicsEditor
                    color="cyan"
                    partials={partials}
                    onPartialsChange={setPartials}
                    width={500}
                />

                <div style={{display: 'flex', gap: '15px'}}>
                    <CurveEditor
                        title="Attack" color={attackData.color} time={attackData.time}
                        startY={0.0} endY={1.0} allowAdvanced={true} isAdvanced={attackData.isAdvanced}
                        handle1={attackData.handle1} handle2={attackData.handle2} points={attackData.points}
                        onCurveChange={(h1, h2) => setAttackData(prev => ({...prev, handle1: h1, handle2: h2}))}
                        onPointsChange={(pts) => setAttackData(prev => ({...prev, points: pts}))}
                        onModeChange={(adv) => setAttackData(prev => ({...prev, isAdvanced: adv}))}
                        onTimeChange={(newTime) => setAttackData(prev => ({...prev, time: newTime}))}
                        width={180}
                    />
                    <CurveEditor
                        title="Decay" color={decayData.color} time={decayData.time}
                        startY={1.0} endY={0.0} allowAdvanced={true} isAdvanced={decayData.isAdvanced}
                        handle1={decayData.handle1} handle2={decayData.handle2} points={decayData.points}
                        onCurveChange={(h1, h2) => setDecayData(prev => ({...prev, handle1: h1, handle2: h2}))}
                        onPointsChange={(pts) => setDecayData(prev => ({...prev, points: pts}))}
                        onModeChange={(adv) => setDecayData(prev => ({...prev, isAdvanced: adv}))}
                        onTimeChange={(newTime) => setDecayData(prev => ({...prev, time: newTime}))}
                        width={180}
                    />
                    <CurveEditor
                        title="Release" color={releaseData.color} time={releaseData.time}
                        startY={1.0} endY={0.0} allowAdvanced={true} isAdvanced={releaseData.isAdvanced}
                        handle1={releaseData.handle1} handle2={releaseData.handle2} points={releaseData.points}
                        onCurveChange={(h1, h2) => setReleaseData(prev => ({...prev, handle1: h1, handle2: h2}))}
                        onPointsChange={(pts) => setReleaseData(prev => ({...prev, points: pts}))}
                        onModeChange={(adv) => setReleaseData(prev => ({...prev, isAdvanced: adv}))}
                        onTimeChange={(newTime) => setReleaseData(prev => ({...prev, time: newTime}))}
                        width={180}
                    />
                </div>
            </div>
        </div>
    );
};

export default PresetGeneratorPage;