import styles from "./PresetEditor.module.css";
import {type CSSProperties, useCallback, useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {MdClose, MdContentCopy, MdDelete, MdDownload, MdEdit, MdSave, MdTimeline, MdTune, MdWaves} from "react-icons/md";
import {type Color, getComputedColor, type InstrumentPreset, type PhaseState} from "../../types";
import {usePreset} from "../../contexts/PresetContext.ts";
import {useSynth} from "../../contexts/SynthContext.ts";
import HarmonicsEditor from "../forms/HarmonicsEditor.tsx";
import CurveEditor from "../forms/CurveEditor.tsx";
import Button from "../elements/Button.tsx";
import {generateBezierArray, generateMSEGArray} from "../../utils/curves.ts";
import WaveformVisualizer from "../widgets/WaveformVisualizer.tsx";
import Envelope, {type TriggerEvent} from "../widgets/Envelope.tsx";
import Piano from "../widgets/Piano.tsx";
import clsx from "clsx";
import {useModal} from "../../contexts/ModalContext.ts";
import {useNotification} from "../../contexts/NotificationContext.ts";
import {useMidi} from "../../contexts/MidiContext.ts";
import type {MidiParsedMessage} from "../../utils/midi.ts";
import Slider from "../forms/Slider.tsx";

const PREVIEW_CHANNEL_ID = "preset-editor-preview";

type TabType = 'osc' | 'env' | 'mod';

type PresetEditorProps = {
    preset?: InstrumentPreset;
    color?: Color;
    onSave?: (id: string) => void;
    onMount?: () => void;
    onUnmount?: () => void;
}

const PresetEditor = ({preset, color = "cyan", onSave, onMount, onUnmount}: PresetEditorProps) => {
    const {t} = useTranslation();
    const {closeModal} = useModal();
    const {addNotification} = useNotification();
    const {addMidiListener, removeMidiListener} = useMidi();
    const [activeTab, setActiveTab] = useState<TabType>('osc');

    const {saveUserPreset, deleteUserPreset, attackData, setAttackData, decayData, setDecayData, releaseData, setReleaseData, presets} = usePreset();
    const {registerChannel, unregisterChannel, updateChannelConfig, playNote, releaseNote} = useSynth();

    const activeKeysRef = useRef<Set<string>>(new Set());
    const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
    const [triggerEvent, setTriggerEvent] = useState<TriggerEvent | null>(null);
    const [presetName, setPresetName] = useState(preset?.name || "");
    const [partials, setPartials] = useState<number[]>(preset?.partials || Array(16).fill(0).fill(1, 0, 1));

    const [filterCutoff, setFilterCutoff] = useState<number>(preset?.filter?.cutoff ?? 20000);
    const [filterEnvAmount, setFilterEnvAmount] = useState<number>(preset?.filter?.envelopeAmount ?? 0);
    const [filterAttack, setFilterAttack] = useState<PhaseState>(preset?.filter?.attack || {time: 15, color: 'orange', handle1: {x: 0.1, y: 0.1}, handle2: {x: 0.9, y: 0.9}, isAdvanced: false, points: []});
    const [filterDecay, setFilterDecay] = useState<PhaseState>(preset?.filter?.decay || {time: 500, color: 'purple', handle1: {x: 0.1, y: 0.9}, handle2: {x: 0.9, y: 0.1}, isAdvanced: false, points: []});

    const [ktCenter, setKtCenter] = useState<string>(preset?.keyTracking?.centerNote || 'A4');
    const [ktScaling, setKtScaling] = useState<number>(preset?.keyTracking?.decayScaling ?? 1.0);

    const isSystemPreset = preset?.isFactory;
    const isNewPreset = !preset;
    const computedColor = getComputedColor(color);

    useEffect(() => {
        if (onMount) onMount();

        return () => {
            if (onUnmount) onUnmount();
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (preset) {
            if (preset.attack) setAttackData(preset.attack);
            if (preset.decay) setDecayData(preset.decay);
            if (preset.release) setReleaseData(preset.release);
        } else {
            setAttackData({time: 15, color: "red", handle1: {x: 0.1, y: 0.1}, handle2: {x: 0.9, y: 0.9}, isAdvanced: false, points: []});
            setDecayData({time: 500, color: "yellow", handle1: {x: 0.1, y: 0.9}, handle2: {x: 0.9, y: 0.1}, isAdvanced: false, points: []});
            setReleaseData({time: 300, color: "blue", handle1: {x: 0.1, y: 0.9}, handle2: {x: 0.9, y: 0.1}, isAdvanced: false, points: []});
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preset]);

    useEffect(() => {
        registerChannel({
            id: PREVIEW_CHANNEL_ID,
            name: "Editor Preview",
            volume: 0.8,
            oscillatorType: "custom",
            partials,
            envelope: {
                attack: Math.max(0.001, attackData.time / 1000),
                decay: Math.max(0.001, decayData.time / 1000),
                sustain: 0,
                release: Math.max(0.001, releaseData.time / 1000)
            }
        });

        return () => unregisterChannel(PREVIEW_CHANNEL_ID);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getCurve = (data: any, start: number, end: number) =>
            data.isAdvanced && data.points ? generateMSEGArray(data.points) : generateBezierArray(start, end, data.handle1!, data.handle2!);

        updateChannelConfig(PREVIEW_CHANNEL_ID, {
            partials,
            envelope: {
                attack: Math.max(0.001, attackData.time / 1000),
                decay: Math.max(0.001, decayData.time / 1000),
                sustain: 0,
                release: Math.max(0.001, releaseData.time / 1000),
                attackCurve: getCurve(attackData, 0.0, 1.0),
                decayCurve: getCurve(decayData, 1.0, 0.0),
                releaseCurve: getCurve(releaseData, 1.0, 0.0)
            },
            filter: {
                type: 'lowpass',
                cutoff: filterCutoff,
                envelopeAmount: filterEnvAmount,
                attack: Math.max(0.001, filterAttack.time / 1000),
                decay: Math.max(0.001, filterDecay.time / 1000),
                attackCurve: getCurve(filterAttack, 0.0, 1.0),
                decayCurve: getCurve(filterDecay, 1.0, 0.0),
            },
            keyTracking: {
                centerNote: ktCenter,
                decayScaling: ktScaling
            }
        });
    }, [partials, attackData, decayData, releaseData, filterCutoff, filterEnvAmount, filterAttack, filterDecay, ktCenter, ktScaling, updateChannelConfig]);

    const formatEnvData = (data: typeof attackData) => ({
        time: data.time, color: data.color,
        handle1: !data.isAdvanced ? data.handle1 : undefined,
        handle2: !data.isAdvanced ? data.handle2 : undefined,
        points: data.isAdvanced ? data.points : undefined
    });

    const getPresetExportObject = (targetId: string) => ({
        id: targetId,
        name: presetName.trim() || "Unnamed Preset",
        isFactory: false,
        oscillatorType: "custom" as OscillatorType,
        partials,
        attack: attackData,
        decay: decayData,
        release: releaseData,
        filter: {
            type: 'lowpass' as BiquadFilterType,
            cutoff: filterCutoff,
            envelopeAmount: filterEnvAmount,
            attack: filterAttack,
            decay: filterDecay
        },
        keyTracking: {
            centerNote: ktCenter,
            decayScaling: ktScaling
        }
    });

    const handleSave = () => {
        const name = presetName.trim();
        if (!name) return;

        let finalId: string;

        if (preset && !isSystemPreset) {
            finalId = preset.id;
        } else {
            finalId = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
            if (presets.some(p => p.id === finalId)) finalId = `${finalId}_${crypto.randomUUID().split('-')[0]}`;
        }

        const presetExport = getPresetExportObject(finalId);

        saveUserPreset(presetExport);

        addNotification({
            variant: "success",
            message: (preset && isSystemPreset)
                ? t("notifications.inst_preset_saved.saved_copy", "Copia salvata con successo")
                : t("notifications.inst_preset_saved.saved", "Preset salvato")
        });

        onSave?.(finalId);
        closeModal();
    };

    const handleDownload = () => {
        const name = presetName.trim() || "unnamed_preset";
        const id = (preset && !isSystemPreset) ? preset.id : name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        const presetExport = getPresetExportObject(id);

        const blob = new Blob([JSON.stringify(presetExport, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDelete = () => {
        if (preset?.id) {
            deleteUserPreset(preset.id);
            closeModal();
            addNotification({variant: "warning", message: t("notifications.inst_preset_deleted.message")});
        }
    }

    const handlePlay = useCallback((note: string, velocity: number = 1) => {
        if (activeKeysRef.current.has(note)) return;
        activeKeysRef.current.add(note);
        setActiveNotes(new Set(activeKeysRef.current));

        playNote(PREVIEW_CHANNEL_ID, note, velocity);
        setTriggerEvent({type: 'attack', timestamp: performance.now()});
    }, [playNote]);

    const handleRelease = useCallback((note: string) => {
        if (!activeKeysRef.current.has(note)) return;
        activeKeysRef.current.delete(note);
        setActiveNotes(new Set(activeKeysRef.current));

        releaseNote(PREVIEW_CHANNEL_ID, note);
        if (activeKeysRef.current.size === 0) {
            setTriggerEvent({type: 'release', timestamp: performance.now()});
        }
    }, [releaseNote]);

    useEffect(() => {
        const handleMidi = (msg: MidiParsedMessage) => {
            if (msg.type === 'noteon' && msg.note) handlePlay(msg.note, msg.velocity);
            if (msg.type === 'noteoff' && msg.note) handleRelease(msg.note);
        };
        addMidiListener(handleMidi);
        return () => removeMidiListener(handleMidi);
    }, [addMidiListener, removeMidiListener, handlePlay, handleRelease]);

    return (
        <div className={styles.container} style={{'--theme-color': computedColor} as CSSProperties}>
            <div className={styles.header}>
                <div className={styles.actionBar}>
                    <div className={styles.titleWrapper}>
                        <MdEdit className={styles.editIcon}/>
                        <input
                            className={styles.titleInput}
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            placeholder={t("modals.edit_inst_preset.title")}
                        />
                    </div>
                    <div className={styles.headerActions}>
                        <Button
                            color={color}
                            variant="active"
                            onClick={handleSave}
                            icon={isSystemPreset ? <MdContentCopy/> : <MdSave/>}
                        />
                        <Button
                            color="blue"
                            onClick={handleDownload}
                            icon={<MdDownload/>}
                        />

                        {!isSystemPreset && !isNewPreset && <Button color="red" onClick={handleDelete} icon={<MdDelete/>}/>}
                        <button className={styles.closeBtn} onClick={closeModal}><MdClose/></button>
                    </div>
                </div>

                <div className={styles.tabSwitcher}>
                    <button className={clsx(styles.tabBtn, activeTab === 'osc' && styles.activeTab)} onClick={() => setActiveTab('osc')}>
                        <MdWaves/> Oscillatore
                    </button>
                    <button className={clsx(styles.tabBtn, activeTab === 'env' && styles.activeTab)} onClick={() => setActiveTab('env')}>
                        <MdTimeline/> Inviluppo
                    </button>
                    <button className={clsx(styles.tabBtn, activeTab === 'mod' && styles.activeTab)} onClick={() => setActiveTab('mod')}>
                        <MdTune/> Filtro & Mod
                    </button>
                </div>
            </div>

            <div className={styles.scrollableArea}>
                {activeTab === 'osc' && (
                    <>
                        <WaveformVisualizer
                            height={80}
                            waves={[{id: "p", label: "", type: "custom", frequency: 440, amplitude: 0.5, color, partials, phase: 0}]}
                        />
                        <HarmonicsEditor
                            color={color}
                            partials={partials}
                            onPartialsChange={setPartials}
                            height={230}
                            graphHeightRatio={0.4}
                        />
                    </>
                )}

                {activeTab === 'env' && (
                    <>
                        <Envelope attack={formatEnvData(attackData)} decay={formatEnvData(decayData)} release={formatEnvData(releaseData)} triggerEvent={triggerEvent} height={150}/>
                        <div className={styles.curvesGrid}>
                            <CurveEditor
                                title={t('common.attack')}
                                color={attackData.color}
                                time={attackData.time}
                                startY={0}
                                endY={1}
                                handle1={attackData.handle1}
                                handle2={attackData.handle2}
                                points={attackData.points}
                                isAdvanced={attackData.isAdvanced}
                                allowAdvanced
                                onTimeChange={(t) => setAttackData(p => ({...p, time: t}))}
                                onCurveChange={(h1, h2) => setAttackData(p => ({...p, handle1: h1, handle2: h2}))}
                                onPointsChange={(pts) => setAttackData(p => ({...p, points: pts}))}
                                onModeChange={(adv) => setAttackData(p => ({...p, isAdvanced: adv}))}
                            />
                            <CurveEditor
                                title={t('common.decay')}
                                color={decayData.color}
                                time={decayData.time}
                                startY={1} endY={0}
                                handle1={decayData.handle1}
                                handle2={decayData.handle2}
                                points={decayData.points}
                                isAdvanced={decayData.isAdvanced}
                                allowAdvanced
                                onTimeChange={(t) => setDecayData(p => ({...p, time: t}))}
                                onCurveChange={(h1, h2) => setDecayData(p => ({...p, handle1: h1, handle2: h2}))}
                                onPointsChange={(pts) => setDecayData(p => ({...p, points: pts}))}
                                onModeChange={(adv) => setDecayData(p => ({...p, isAdvanced: adv}))}
                            />
                            <CurveEditor
                                title={t('common.release')}
                                color={releaseData.color}
                                time={releaseData.time}
                                startY={1}
                                endY={0}
                                handle1={releaseData.handle1}
                                handle2={releaseData.handle2}
                                points={releaseData.points}
                                isAdvanced={releaseData.isAdvanced}
                                allowAdvanced
                                onTimeChange={(t) => setReleaseData(p => ({...p, time: t}))}
                                onCurveChange={(h1, h2) => setReleaseData(p => ({...p, handle1: h1, handle2: h2}))}
                                onPointsChange={(pts) => setReleaseData(p => ({...p, points: pts}))}
                                onModeChange={(adv) => setReleaseData(p => ({...p, isAdvanced: adv}))}
                            />
                        </div>
                    </>
                )}

                {activeTab === 'mod' && (
                    <div className={styles.modTabContent}>
                        <div className={styles.modSection}>
                            <h3 className={styles.modSectionTitleCyan}>{t('modals.edit_inst_preset.key_tracking')}</h3>
                            <p className={styles.modSectionDesc}>{t('modals.edit_inst_preset.key_tracking_description')}</p>
                            <div className={styles.modControlsRow} style={{marginBottom: 0}}>
                                <div>
                                    <label className={styles.modLabel}>{t('modals.edit_inst_preset.central_note')}</label>
                                    <input
                                        className={styles.modInput}
                                        value={ktCenter}
                                        onChange={(e) => setKtCenter(e.target.value.toUpperCase())}
                                    />
                                </div>
                                <div className={styles.modControlGroup}>
                                    <label className={styles.modLabel}>
                                        {t('modals.edit_inst_preset.decay_scaling')} <span className={styles.modLabelHighlightCyan}>{ktScaling}</span>
                                    </label>
                                    <Slider min={0.1} max={1} step={0.01} value={ktScaling} onChange={setKtScaling} color="cyan"/>
                                </div>
                            </div>
                        </div>

                        <div className={styles.modSection}>
                            <h3 className={styles.modSectionTitleOrange}>{t('modals.edit_inst_preset.acoustic_damping')}</h3>
                            <p className={styles.modSectionDesc}>{t('modals.edit_inst_preset.acoustic_damping_description')}</p>

                            <div className={styles.modControlsRow}>
                                <div className={styles.modControlGroup}>
                                    <label className={styles.modLabel}>
                                        {t('modals.edit_inst_preset.base_cutoff_frequency')} <span className={styles.modLabelHighlightOrange}>{filterCutoff} Hz</span>
                                    </label>
                                    <Slider min={20} max={20000} step={10} value={filterCutoff} onChange={setFilterCutoff} color="orange"/>
                                </div>
                                <div className={styles.modControlGroup}>
                                    <label className={styles.modLabel}>
                                        {t('modals.edit_inst_preset.extra_opening')} <span className={styles.modLabelHighlightOrange}>+{filterEnvAmount} Hz</span>
                                    </label>
                                    <Slider min={0} max={20000} step={10} value={filterEnvAmount} onChange={setFilterEnvAmount} color="orange"/>
                                </div>
                            </div>

                            <div className={styles.curvesGrid}>
                                <CurveEditor
                                    title="Filter Attack"
                                    color={filterAttack.color}
                                    time={filterAttack.time}
                                    startY={0} endY={1}
                                    handle1={filterAttack.handle1}
                                    handle2={filterAttack.handle2}
                                    points={filterAttack.points}
                                    isAdvanced={filterAttack.isAdvanced}
                                    allowAdvanced
                                    onTimeChange={(t) => setFilterAttack(p => ({...p, time: t}))}
                                    onCurveChange={(h1, h2) => setFilterAttack(p => ({...p, handle1: h1, handle2: h2}))}
                                    onPointsChange={(pts) => setFilterAttack(p => ({...p, points: pts}))}
                                    onModeChange={(adv) => setFilterAttack(p => ({...p, isAdvanced: adv}))}
                                />
                                <CurveEditor
                                    title="Filter Decay"
                                    color={filterDecay.color}
                                    time={filterDecay.time}
                                    startY={1}
                                    endY={0}
                                    handle1={filterDecay.handle1}
                                    handle2={filterDecay.handle2}
                                    points={filterDecay.points}
                                    isAdvanced={filterDecay.isAdvanced}
                                    allowAdvanced
                                    onTimeChange={(t) => setFilterDecay(p => ({...p, time: t}))}
                                    onCurveChange={(h1, h2) => setFilterDecay(p => ({...p, handle1: h1, handle2: h2}))}
                                    onPointsChange={(pts) => setFilterDecay(p => ({...p, points: pts}))}
                                    onModeChange={(adv) => setFilterDecay(p => ({...p, isAdvanced: adv}))}
                                />
                            </div>
                        </div>

                    </div>
                )}
            </div>

            <div className={styles.footerSection}>
                <Piano playNote={handlePlay} releaseNote={handleRelease} activeNotes={activeNotes} startNote="C3" endNote="C5"/>
            </div>
        </div>
    );
};

export default PresetEditor;