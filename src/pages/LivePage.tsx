import React, {useCallback, useEffect, useRef, useState} from 'react';
import styles from './LivePage.module.css';
import Select, {type SelectOption} from '../components/forms/Select.tsx';
import Slider from '../components/forms/Slider.tsx';
import {MdAdd, MdColorLens, MdDelete, MdEdit, MdMusicNote, MdVolumeUp} from 'react-icons/md';
import {useSynth} from '../contexts/SynthContext.ts';
import {useMidi} from '../contexts/MidiContext.ts';
import {usePreset} from '../contexts/PresetContext.ts';
import {type MidiParsedMessage} from '../utils/midi.ts';
import {useTranslation} from "react-i18next";
import NoteWaterfall, {type WaterfallColorMode, type WaterfallNote} from "../components/widgets/NoteWaterfall.tsx";
import Piano from "../components/widgets/Piano.tsx";
import {generateBezierArray, generateMSEGArray} from "../utils/curves.ts";
import {colors, type InstrumentPreset} from "../types";
import Button from "../components/elements/Button.tsx";
import PresetEditor from "../components/modals/PresetEditor.tsx";
import {useModal} from "../contexts/ModalContext.ts";
import {useNotification} from "../contexts/NotificationContext.ts";

type EnvData = {
    time: number;
    isAdvanced?: boolean;
    points?: { x: number; y: number }[];
    handle1?: { x: number; y: number };
    handle2?: { x: number; y: number };
};

const getCurve = (data: EnvData | undefined, start: number, end: number) => {
    if (!data) return undefined;
    return data.isAdvanced && data.points
        ? generateMSEGArray(data.points)
        : (data.handle1 && data.handle2 ? generateBezierArray(start, end, data.handle1, data.handle2) : undefined);
};

const LivePage = () => {
    const {t} = useTranslation();
    const {playNote, releaseNote, registerChannel, unregisterChannel, updateChannelConfig} = useSynth();
    const {addMidiListener, removeMidiListener} = useMidi();
    const {presets, deleteUserPreset} = usePreset();
    const {openModal, closeModal} = useModal();
    const {addNotification} = useNotification();

    const [volume, setVolume] = useState(0.8);
    const [presetId, setPresetId] = useState<string>(() => localStorage.getItem('live_presetId') || 'sine');
    const [colorMode, setColorMode] = useState<WaterfallColorMode>(() => (localStorage.getItem('live_colorMode') as WaterfallColorMode) || 'rainbow');

    const activeKeysRef = useRef<Set<string>>(new Set());
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

    const [isPresetEditorOpen, setIsPresetEditorOpen] = useState(false);

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
                attack: 0.05,
                decay: 0.5,
                sustain: 0.6,
                release: 0.1
            }
        });

        return () => unregisterChannel('live_channel');
    }, [registerChannel, unregisterChannel]);

    useEffect(() => {
        const preset = presets.find(p => p.id === presetId);

        const atk = (preset?.attack as EnvData | undefined) || {time: 15};
        const dec = (preset?.decay as EnvData | undefined) || {time: 500};
        const rel = (preset?.release as EnvData | undefined) || {time: 300};

        const isPercussive = preset?.id === 'piano' || preset?.id === 'guitar' || preset?.id === 'plucks';

        updateChannelConfig('live_channel', {
            volume,
            oscillatorType: preset?.oscillatorType || 'sine',
            partials: preset?.partials || [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            envelope: {
                attack: Math.max(0.015, atk.time / 1000),
                decay: Math.max(0.05, dec.time / 1000),
                sustain: isPercussive ? 0 : 0.6,
                release: Math.max(0.1, rel.time / 1000),
                attackCurve: getCurve(preset?.attack as EnvData | undefined, 0.0, 1.0),
                decayCurve: getCurve(preset?.decay as EnvData | undefined, 1.0, 0.0),
                releaseCurve: getCurve(preset?.release as EnvData | undefined, 1.0, 0.0)
            }
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [presetId, volume, presets]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = performance.now();
            setWaterfallNotes(prev => prev.filter(n => !n.endTime || (now - n.endTime) < 5000));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        localStorage.setItem('live_presetId', presetId);
        localStorage.setItem('live_colorMode', colorMode);
    }, [presetId, colorMode]);

    const handlePlay = useCallback((note: string, velocity: number = 0.8) => {
        console.log('is preset editor open', isPresetEditorOpen);
        if (isPresetEditorOpen) return;
        if (activeKeysRef.current.has(note)) return;

        activeKeysRef.current.add(note);
        setActiveKeys(new Set(activeKeysRef.current));

        setWaterfallNotes(prev => [
            ...prev,
            {id: crypto.randomUUID(), pitch: note, startTime: performance.now(), velocity}
        ]);
        playNote('live_channel', note, velocity);
    }, [isPresetEditorOpen, playNote]);

    const handleRelease = useCallback((note: string) => {
        if (!activeKeysRef.current.has(note)) return;

        activeKeysRef.current.delete(note);
        setActiveKeys(new Set(activeKeysRef.current));

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

    const deletePreset = useCallback((preset: InstrumentPreset) => {
        const handleDelete = () => {
            deleteUserPreset(preset.id);

            const firstAvailable = presets.find(p => p.id !== preset.id);
            if (firstAvailable && presetId === preset.id) setPresetId(firstAvailable.id);

            closeModal();
            addNotification({
                variant: 'success',
                message: t('notifications.inst_preset_deleted.message'),
                duration: 4000
            });
        }

        openModal({
            title: t('modals.delete_inst_preset.title', 'Elimina preset'),
            size: 'sm',
            content: <p>{t('modals.delete_inst_preset.description')}</p>,
            footer: (
                <>
                    <Button
                        color="cyan"
                        variant="default"
                        onClick={closeModal}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        color="red"
                        variant="active"
                        onClick={handleDelete}
                    >
                        {t('common.delete')}
                    </Button>
                </>
            )
        });
    }, [addNotification, closeModal, deleteUserPreset, openModal, presets, presetId, t]);

    const editPreset = useCallback((idToEdit?: string) => {
        const currentActiveNotes = Array.from(activeKeysRef.current);
        currentActiveNotes.forEach(note => handleRelease(note));

        openModal({
            size: 'xl',
            hideHeader: true,
            content: (
                <PresetEditor
                    preset={idToEdit ? presets.find(p => p.id === idToEdit) : undefined}
                    onSave={(newId) => {
                        setPresetId(newId);
                        closeModal();
                    }}
                    onMount={() => setIsPresetEditorOpen(true)}
                    onUnmount={() => setIsPresetEditorOpen(false)}
                />
            ),
        });
    }, [openModal, presets, handleRelease, closeModal]);

    const presetOptions: SelectOption[] = presets.map(p => {
        const isBasicWave = ['sine', 'square', 'triangle', 'sawtooth'].includes(p.id);
        const rightActions = [];

        if (!isBasicWave) {
            rightActions.push({
                icon: <MdEdit/>,
                title: t('components.waveform_controls.edit_inst_preset'),
                onClick: (_: React.MouseEvent, val: string) => editPreset(val)
            });

            if (!p.isFactory) {
                rightActions.push({
                    icon: <MdDelete/>,
                    title: t('components.waveform_controls.delete_inst_preset'),
                    colorClass: "var(--red-400)",
                    onClick: () => deletePreset(p)
                });
            }
        }

        return {
            value: p.id,
            label: t(`instruments.${p.id}`, t(`waves.${p.id}`, p.name)),
            rightActions: rightActions.length > 0 ? rightActions : undefined
        };
    });

    presetOptions.push({
        value: 'action-create',
        label: t('components.waveform_controls.create_inst_preset'),
        leftIcon: <MdAdd/>,
        isAction: true,
        onClick: () => editPreset()
    });

    const colorOptions: { value: string, label: string }[] = colors.map(c => ({value: c, label: t(`colors.${c}`)}));
    colorOptions.push({value: 'rainbow', label: t('colors.rainbow')});
    colorOptions.push({value: 'per_note', label: t('common.per_note')});
    colorOptions.push({value: 'random', label: t('common.random')});

    return (
        <div className={styles.pageContainer}>
            <div className={styles.topBar}>
                <div className={styles.topBarSection}>
                    <span className={styles.label}><MdMusicNote/> {t('common.instrument')}</span>
                    <div className={styles.selectWrapper}>
                        <Select
                            options={presetOptions}
                            value={presetId}
                            onChange={(e) => setPresetId(e.target ? e.target.value : e)}
                            color="cyan"
                        />
                    </div>
                </div>

                <div className={styles.topBarSection}>
                    <span className={styles.label}><MdColorLens/> {t('common.color')}</span>
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
                    <span className={styles.label}><MdVolumeUp/> {t('common.volume')}</span>
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