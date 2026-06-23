import styles from './TrackRow.module.css';
import React, {useCallback} from 'react';
import clsx from 'clsx';
import {MdAdd, MdDelete, MdEdit, MdKeyboardArrowDown, MdKeyboardArrowRight} from 'react-icons/md';
import {type Track, useSequencer} from "../../contexts/SequencerContext.ts";
import PianoRoll from "./PianoRoll.tsx";
import {usePreset} from "../../contexts/PresetContext.ts";
import {useTranslation} from "react-i18next";
import Button from "../elements/Button.tsx";
import {useModal} from "../../contexts/ModalContext.ts";
import {PIANO_ROLL_KEYS} from "../../utils/sequencer.ts";
import Slider from "../forms/Slider.tsx";
import PresetEditor from "../modals/PresetEditor.tsx";
import type {InstrumentPreset} from "../../types";
import {useNotification} from "../../contexts/NotificationContext.ts";
import Select, {type SelectOption} from "../forms/Select.tsx";
import {getInstrumentIcon} from "../../utils/icons.tsx";

type TrackRowProps = {
    track: Track;
};

const TrackRow = ({track}: TrackRowProps) => {
    const {t} = useTranslation();
    const {updateTrack, toggleTrackExpand, removeTrack, totalBeats} = useSequencer();
    const {presets, deleteUserPreset} = usePreset();
    const {addNotification} = useNotification();
    const {openModal, closeModal} = useModal();

    const handleSelectPreset = useCallback((presetId: string | null) => {
        updateTrack(track.id, {presetId});
    }, [track.id, updateTrack]);

    const editPreset = useCallback((presetId?: string) => {
        openModal({
            size: 'xl',
            hideHeader: true,
            content: (
                <PresetEditor
                    preset={presetId ? presets.find(p => p.id === presetId) : undefined}
                    color="cyan"
                    onSave={(id) => handleSelectPreset(id)}
                />
            ),
        });
    }, [openModal, presets, handleSelectPreset]);

    const deletePreset = useCallback((preset: InstrumentPreset) => {
        const handleDelete = () => {
            deleteUserPreset(preset.id);

            if (track.presetId === preset.id) {
                handleSelectPreset('sine');
            }

            closeModal();
            addNotification({
                variant: 'success',
                message: t('notifications.inst_preset_deleted.message', 'Preset eliminato'),
                duration: 4000
            });
        }

        openModal({
            title: t('modals.delete_inst_preset.title', 'Elimina Preset'),
            size: 'sm',
            content: <p>{t('modals.delete_inst_preset.description', 'Sei sicuro di voler eliminare questo preset?')}</p>,
            footer: (
                <>
                    <Button color="cyan" variant="default" onClick={closeModal}>
                        {t('common.cancel')}
                    </Button>
                    <Button color="red" variant="active" onClick={handleDelete}>
                        {t('common.delete')}
                    </Button>
                </>
            )
        });
    }, [addNotification, closeModal, deleteUserPreset, handleSelectPreset, openModal, t, track.presetId]);

    const presetOptions: SelectOption[] = presets.map(p => {
        const isBasicWave = ['sine', 'square', 'triangle', 'sawtooth'].includes(p.id);
        const rightActions = [];

        if (!isBasicWave) {
            rightActions.push({
                icon: <MdEdit/>,
                title: t('components.waveform_controls.edit_inst_preset', 'Modifica'),
                onClick: (_: React.MouseEvent, val: string) => editPreset(val)
            });

            if (!p.isFactory) {
                rightActions.push({
                    icon: <MdDelete/>,
                    title: t('components.waveform_controls.delete_inst_preset', 'Elimina'),
                    colorClass: "var(--red-400)",
                    onClick: () => deletePreset(p)
                });
            }
        }

        return {
            value: p.id,
            label: t(`instruments.${p.id}`, t(`waves.${p.id}`, p.name)),
            rightActions: rightActions.length > 0 ? rightActions : undefined,
            leftIcon: getInstrumentIcon(p.id, 16)
        };
    });

    presetOptions.push({
        value: 'action-create',
        label: t('components.waveform_controls.create_inst_preset', 'Crea nuovo...'),
        leftIcon: <MdAdd/>,
        isAction: true,
        onClick: () => editPreset()
    });

    const handleDeleteClick = () => {
        openModal({
            title: t('modals.delete_track.title'),
            size: 'sm',
            content: <p>{t('modals.delete_track.description')}</p>,
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
                        onClick={() => {
                            removeTrack(track.id);
                            closeModal();
                        }}
                    >
                        {t('common.delete')}
                    </Button>
                </>
            )
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.mainRow}>
                <div className={styles.headerSpacer}>
                    <div className={styles.header}>
                        <div className={styles.headerTop}>
                            <div className={styles.trackInfo}>
                                <button
                                    className={styles.expandBtn}
                                    onClick={() => toggleTrackExpand(track.id)}
                                >
                                    {track.isExpanded ? <MdKeyboardArrowDown size={18}/> : <MdKeyboardArrowRight size={18}/>}
                                </button>
                                <input
                                    className={styles.trackName}
                                    value={track.name}
                                    onChange={(e) => updateTrack(track.id, {name: e.target.value})}
                                />
                            </div>
                            <div className={styles.controls}>
                                <button
                                    className={clsx(styles.muteSoloBtn, track.isMuted && styles.muteActive)}
                                    onClick={() => updateTrack(track.id, {isMuted: !track.isMuted})}
                                >
                                    M
                                </button>
                                <button
                                    className={clsx(styles.muteSoloBtn, track.isSolo && styles.soloActive)}
                                    onClick={() => updateTrack(track.id, {isSolo: !track.isSolo})}
                                >
                                    S
                                </button>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={handleDeleteClick}
                                    title={t('common.delete')}
                                >
                                    <MdDelete size={16}/>
                                </button>
                            </div>
                        </div>

                        <div className={styles.headerBottom}>
                            <Select
                                className={styles.inlineSelectWrapper}
                                options={presetOptions}
                                value={track.presetId || undefined}
                                onChange={(e) => handleSelectPreset(e.target ? e.target.value : e)}
                                compact
                            />

                            <div className={styles.trackVolumeSlider}>
                                <Slider
                                    value={track.volume}
                                    onChange={(v) => updateTrack(track.id, {volume: v})}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    compact
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className={styles.timelinePreview}
                    onClick={() => toggleTrackExpand(track.id)}
                    style={{
                        width: `calc(var(--beat-width) * ${totalBeats})`,
                        minWidth: `calc(var(--beat-width) * ${totalBeats})`
                    } as React.CSSProperties}
                >
                    {track.notes.map(note => {
                        const keyIndex = PIANO_ROLL_KEYS.findIndex(k => k.note === note.pitch);
                        if (keyIndex === -1) return null;

                        return (
                            <div
                                key={`preview-${note.id}`}
                                className={styles.previewNote}
                                style={{
                                    left: `calc(var(--beat-width) * ${note.startBeat})`,
                                    width: `calc(var(--beat-width) * ${note.durationBeats})`,
                                    top: `calc(${keyIndex} / ${PIANO_ROLL_KEYS.length} * 100%)`
                                } as React.CSSProperties}
                            />
                        );
                    })}
                </div>
            </div>

            {track.isExpanded && (
                <div className={styles.accordionArea}>
                    <PianoRoll track={track}/>
                </div>
            )}
        </div>
    );
};

export default TrackRow;