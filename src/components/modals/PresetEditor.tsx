import styles from "./PresetEditor.module.css";
import {type CSSProperties, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {MdClose, MdContentCopy, MdDelete, MdDownload, MdEdit, MdSave, MdTimeline, MdWaves} from "react-icons/md";
import {type Color, getComputedColor, type InstrumentPreset} from "../../types";
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

const PREVIEW_CHANNEL_ID = "preset-editor-preview";

type TabType = 'osc' | 'env';

type PresetEditorProps = {
    preset?: InstrumentPreset;
    color?: Color;
    onSave?: (id: string) => void;
}

const PresetEditor = ({preset, color = "cyan", onSave}: PresetEditorProps) => {
    const {t} = useTranslation();
    const {closeModal} = useModal();
    const {addNotification} = useNotification();
    const [activeTab, setActiveTab] = useState<TabType>('osc');

    const {saveUserPreset, deleteUserPreset, attackData, setAttackData, decayData, setDecayData, releaseData, setReleaseData, presets} = usePreset();
    const {registerChannel, unregisterChannel, updateChannelConfig, playNote, releaseNote} = useSynth();

    const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
    const [triggerEvent, setTriggerEvent] = useState<TriggerEvent | null>(null);
    const [presetName, setPresetName] = useState(preset?.name || "");
    const [partials, setPartials] = useState<number[]>(preset?.partials || Array(16).fill(0).fill(1, 0, 1));

    const isSystemPreset = preset?.isFactory;
    const isNewPreset = !preset;
    const computedColor = getComputedColor(color);

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
        const getCurve = (data: typeof attackData, start: number, end: number) =>
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
            }
        });
    }, [partials, attackData, decayData, releaseData, updateChannelConfig]);

    const formatEnvData = (data: typeof attackData) => ({
        time: data.time,
        color: data.color,
        handle1: !data.isAdvanced ? data.handle1 : undefined,
        handle2: !data.isAdvanced ? data.handle2 : undefined,
        points: data.isAdvanced ? data.points : undefined
    });

    const handleSave = () => {
        const name = presetName.trim();
        if (!name) return;

        let id: string;

        if (preset && !isSystemPreset) {
            id = preset.id;
        } else {
            id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
            if (presets.find(p => p.id === id))  id = id + crypto.randomUUID();
        }

        saveUserPreset(id, name, partials);
        addNotification({
            variant: "success",
            message: isSystemPreset ? t("notifications.inst_preset_saved.saved_copy") : t("notifications.inst_preset_saved.saved")
        });
        onSave?.(id);

        closeModal();
    };

    const handleDownload = () => {
        const name = presetName.trim() || "unnamed_preset";
        const id = preset && !isSystemPreset
            ? preset.id
            : name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

        const presetExport = {
            id,
            name: presetName.trim() || "Unnamed Preset",
            isFactory: false,
            partials,
            attack: attackData,
            decay: decayData,
            release: releaseData
        };

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
                            title={isSystemPreset ? t("modals.edit_inst_preset.save_copy_title") : t("modals.edit_inst_preset.save_title")}
                            icon={isSystemPreset ? <MdContentCopy/> : <MdSave/>}
                        />
                        <Button
                            color="blue"
                            onClick={handleDownload}
                            title={t("modals.edit_inst_preset.save_json_title")}
                            icon={<MdDownload/>}
                        />
                        {!isSystemPreset && !isNewPreset && (
                            <Button
                                color="red"
                                onClick={handleDelete}
                                title={t("modals.edit_inst_preset.delete_title")}
                                icon={<MdDelete/>}
                            />
                        )}
                        <button
                            className={styles.closeBtn}
                            onClick={closeModal}
                            title={t("common.close")}
                        >
                            <MdClose/>
                        </button>
                    </div>
                </div>

                <div className={styles.tabSwitcher}>
                    <button
                        className={clsx(styles.tabBtn, activeTab === 'osc' && styles.activeTab)}
                        onClick={() => setActiveTab('osc')}
                    >
                        <MdWaves/> {t("common.oscillator")}
                    </button>
                    <button
                        className={clsx(styles.tabBtn, activeTab === 'env' && styles.activeTab)}
                        onClick={() => setActiveTab('env')}
                    >
                        <MdTimeline/> {t("common.envelope")}
                    </button>
                </div>
            </div>

            <div className={styles.scrollableArea}>
                {activeTab === 'osc' ? (
                    <>
                        <WaveformVisualizer
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
                ) : (
                    <>
                        <Envelope
                            attack={formatEnvData(attackData)}
                            decay={formatEnvData(decayData)}
                            release={formatEnvData(releaseData)}
                            triggerEvent={triggerEvent}
                            height={150}
                        />

                        <div className={styles.curvesGrid}>
                            <CurveEditor
                                title="Attack"
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
                                title="Decay"
                                color={decayData.color}
                                time={decayData.time}
                                startY={1}
                                endY={0}
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
                                title="Release"
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
            </div>

            <div className={styles.footerSection}>
                <Piano
                    playNote={(n) => {
                        playNote(PREVIEW_CHANNEL_ID, n, 1);
                        setTriggerEvent({type: 'attack', timestamp: performance.now()});
                        setActiveNotes(prev => new Set(prev).add(n));
                    }}
                    releaseNote={(n) => {
                        if (!activeNotes.has(n)) return;

                        releaseNote(PREVIEW_CHANNEL_ID, n);
                        setActiveNotes(prev => {
                            const next = new Set(prev);
                            next.delete(n);
                            if (next.size === 0) {
                                setTriggerEvent({type: 'release', timestamp: performance.now()});
                            }
                            return next;
                        });
                    }}
                    activeNotes={activeNotes}
                    startNote="C3"
                    endNote="C5"
                />
            </div>
        </div>
    );
};

export default PresetEditor;