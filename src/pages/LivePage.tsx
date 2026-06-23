import {useCallback, useEffect, useState} from 'react';
import styles from './LivePage.module.css';
import Select from '../components/forms/Select.tsx';
import Slider from '../components/forms/Slider.tsx';
import {MdColorLens, MdMusicNote, MdVolumeUp} from 'react-icons/md';
import {useSynth} from '../contexts/SynthContext.ts';
import {useMidi} from '../contexts/MidiContext.ts';
import {usePreset} from '../contexts/PresetContext.ts';
import {type MidiParsedMessage} from '../utils/midi.ts';
import {useTranslation} from "react-i18next";
import NoteWaterfall, {type WaterfallColorMode, type WaterfallNote} from "../components/widgets/NoteWaterfall.tsx";
import Piano from "../components/widgets/Piano.tsx";

const LivePage = () => {
    const {t} = useTranslation();
    const {playNote, releaseNote, registerChannel, unregisterChannel, updateChannelConfig} = useSynth();
    const {addMidiListener, removeMidiListener} = useMidi();
    const {presets} = usePreset();

    const [presetId, setPresetId] = useState('piano');
    const [volume, setVolume] = useState(0.8);
    const [colorMode, setColorMode] = useState<WaterfallColorMode>('rainbow');

    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
    const [waterfallNotes, setWaterfallNotes] = useState<WaterfallNote[]>([]);
    const [noteRange, setNoteRange] = useState({start: 'C2', end: 'B6'});

    useEffect(() => {
        const updateRange = () => {
            const width = window.innerWidth;
            const whiteKeyWidth = 48;
            const maxWhiteKeys = Math.floor((width - 40) / whiteKeyWidth);
            const maxOctaves = Math.floor(maxWhiteKeys / 7);

            if (maxOctaves >= 7) {
                setNoteRange({start: 'A0', end: 'C8'});
                return;
            }
            if (maxOctaves <= 1) {
                setNoteRange({start: 'C4', end: 'B4'});
                return;
            }

            const startOctave = Math.max(1, 4 - Math.floor(maxOctaves / 2));
            const endOctave = Math.min(8, startOctave + maxOctaves);

            setNoteRange({
                start: `C${startOctave}`,
                end: `B${endOctave - 1}`
            });
        };

        updateRange();
        window.addEventListener('resize', updateRange);
        return () => window.removeEventListener('resize', updateRange);
    }, []);

    useEffect(() => {
        registerChannel({
            id: 'live_channel',
            name: 'Live Play',
            volume: 0.8,
            oscillatorType: 'sine',
            partials: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            envelope: {
                attack: 0.02,
                decay: 0.5,
                sustain: 0.6,
                release: 0.15 // FIX AUDIO: Valore iniziale molto morbido
            }
        });

        return () => unregisterChannel('live_channel');
    }, [registerChannel, unregisterChannel]);

    useEffect(() => {
        const preset = presets.find(p => p.id === presetId);
        updateChannelConfig('live_channel', {
            volume,
            oscillatorType: preset?.oscillatorType || 'sine',
            partials: preset?.partials,
            envelope: {
                // FIX AUDIO CRITICO: Impostiamo i limiti minimi a 0.02s per l'attacco e 0.15s per il rilascio.
                // Questo crea una rampa di volume che elimina fisicamente la possibilità che avvengano "click" digitali!
                attack: Math.max(0.02, (preset?.attack?.time || 15) / 1000),
                decay: Math.max(0.02, (preset?.decay?.time || 500) / 1000),
                sustain: preset?.id === 'piano' ? 0 : 0.6,
                release: Math.max(0.15, (preset?.release?.time || 300) / 1000)
            }
        });
    }, [presetId, volume, presets, updateChannelConfig]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = performance.now();
            setWaterfallNotes(prev => prev.filter(n => !n.endTime || (now - n.endTime) < 5000));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handlePlay = useCallback((note: string, velocity: number = 0.8) => {
        setActiveKeys(prev => new Set(prev).add(note));
        setWaterfallNotes(prev => [
            ...prev,
            {id: crypto.randomUUID(), pitch: note, startTime: performance.now(), velocity}
        ]);
        playNote('live_channel', note, velocity);
    }, [playNote]);

    const handleRelease = useCallback((note: string) => {
        setActiveKeys(prev => {
            const next = new Set(prev);
            next.delete(note);
            return next;
        });
        setWaterfallNotes(prev => prev.map(n =>
            n.pitch === note && !n.endTime ? {...n, endTime: performance.now()} : n
        ));
        releaseNote('live_channel', note);
    }, [releaseNote]);

    useEffect(() => {
        const handleMidi = (msg: MidiParsedMessage) => {
            if (msg.type === 'noteon' && msg.note) handlePlay(msg.note, msg.velocity);
            if (msg.type === 'noteoff' && msg.note) handleRelease(msg.note);
        };
        addMidiListener(handleMidi);
        return () => removeMidiListener(handleMidi);
    }, [addMidiListener, removeMidiListener, handlePlay, handleRelease]);

    const presetOptions = presets.map(p => ({
        value: p.id,
        label: t(`instruments.${p.id}`, t(`waves.${p.id}`, p.name || p.id))
    }));

    const colorOptions = [
        {value: 'rainbow', label: 'Rainbow'},
        {value: 'cyan', label: 'Ciano'},
        {value: 'red', label: 'Rosso'},
        {value: 'green', label: 'Verde'},
        {value: 'orange', label: 'Arancione'}
    ];

    return (
        <div className={styles.pageContainer}>
            <div className={styles.topBar}>
                <div className={styles.topBarSection}>
                    <span className={styles.label}><MdMusicNote/> {t('common.instrument', 'Strumento')}</span>
                    <div className={styles.selectWrapper}>
                        <Select
                            options={presetOptions}
                            value={presetId}
                            onChange={(e) => setPresetId(e.target.value)}
                            color="cyan"
                        />
                    </div>
                </div>

                <div className={styles.topBarSection}>
                    <span className={styles.label}><MdColorLens/> {t('common.colors', 'Colori')}</span>
                    <div className={styles.selectWrapper}>
                        <Select
                            options={colorOptions}
                            value={colorMode}
                            onChange={(e) => setColorMode(e.target.value as WaterfallColorMode)}
                            color="cyan"
                        />
                    </div>
                </div>

                <div className={styles.topBarSection} style={{marginLeft: 'auto'}}>
                    <span className={styles.label}><MdVolumeUp/> {t('common.volume', 'Volume')}</span>
                    <div className={styles.sliderWrapper}>
                        <Slider
                            value={volume}
                            onChange={setVolume}
                            min={0}
                            max={1}
                            step={0.01}
                            color="cyan"
                        />
                    </div>
                </div>
            </div>

            <div className={styles.playArea}>
                {/* Nuova struttura a sezioni larghe 100% per riempire i vuoti laterali */}
                <div className={styles.waterfallSection}>
                    <NoteWaterfall
                        notes={waterfallNotes}
                        startNote={noteRange.start}
                        endNote={noteRange.end}
                        colorMode={colorMode}
                    />
                </div>
                <div className={styles.pianoSection}>
                    <Piano
                        activeNotes={activeKeys}
                        playNote={handlePlay}
                        releaseNote={handleRelease}
                        startNote={noteRange.start}
                        endNote={noteRange.end}
                    />
                </div>
            </div>
        </div>
    );
};

export default LivePage;