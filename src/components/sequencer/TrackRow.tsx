import styles from './TrackRow.module.css';
import {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import {MdDelete, MdKeyboardArrowDown, MdKeyboardArrowRight, MdMusicNote} from 'react-icons/md';
import {type Track, useSequencer} from "../../contexts/SequencerContext.ts";
import PianoRoll from "./PianoRoll.tsx";
import {usePreset} from "../../contexts/PresetContext.ts";
import {useTranslation} from "react-i18next";
import Button from "../elements/Button.tsx";
import {useModal} from "../../contexts/ModalContext.ts";
import {BEAT_WIDTH, PIANO_ROLL_KEYS} from "../../utils/sequencer.ts";
import Slider from "../forms/Slider.tsx";

type TrackRowProps = {
    track: Track;
};

const TrackRow = ({track}: TrackRowProps) => {
    const {t} = useTranslation();
    const {updateTrack, toggleTrackExpand, removeTrack, totalBeats} = useSequencer();
    const {presets} = usePreset();
    const {openModal, closeModal} = useModal();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false);
        };

        if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    const selectedPreset = presets.find(p => p.id === track.presetId);
    const presetLabel = selectedPreset
        ? t(`instruments.${selectedPreset.id}`, t(`waves.${selectedPreset.id}`, selectedPreset.name))
        : t('common.select_inst_preset');

    const handleSelectPreset = (presetId: string | null) => {
        updateTrack(track.id, {presetId});
        setIsMenuOpen(false);
    };

    const handleDeleteClick = () => {
        openModal({
            title: t('modals.delete_track.title'),
            size: 'sm',
            content: <p>{t('modals.delete_track.description')}</p>,
            footer: (
                <>
                    <Button color="cyan" variant="default" onClick={closeModal}>
                        {t('common.cancel')}
                    </Button>
                    <Button color="red" variant="active" onClick={() => {
                        removeTrack(track.id);
                        closeModal();
                    }}>
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
                                    className={styles.muteSoloBtn}
                                    style={{border: 'none', background: 'transparent'}}
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
                                <button className={clsx(styles.muteSoloBtn, track.isMuted && styles.muteActive)} onClick={() => updateTrack(track.id, {isMuted: !track.isMuted})}>M</button>
                                <button className={clsx(styles.muteSoloBtn, track.isSolo && styles.soloActive)} onClick={() => updateTrack(track.id, {isSolo: !track.isSolo})}>S</button>
                                <button className={styles.deleteBtn} onClick={handleDeleteClick} title={t('common.delete')}><MdDelete size={16}/></button>
                            </div>
                        </div>

                        <div className={styles.headerBottom}>
                            <div className={styles.presetSelector} ref={menuRef}>
                                <div className={styles.presetSelector} ref={menuRef}>
                                    <div
                                        className={clsx(styles.presetSelectorButton, isMenuOpen && styles.isOpen)}
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    >
                                        <MdMusicNote size={14}/>
                                        <span className={styles.presetLabel}>{presetLabel}</span>
                                        <MdKeyboardArrowDown size={14}/>
                                    </div>

                                    {isMenuOpen && (
                                        <div className={styles.presetMenu}>
                                            <div
                                                className={clsx(styles.presetMenuItem, !track.presetId && styles.activeItem)}
                                                onClick={() => handleSelectPreset(null)}
                                            >
                                                {t('common.select_inst_preset')}
                                            </div>

                                            {presets.map(p => (
                                                <div
                                                    key={p.id}
                                                    className={clsx(styles.presetMenuItem, track.presetId === p.id && styles.activeItem)}
                                                    onClick={() => handleSelectPreset(p.id)}
                                                >
                                                    {t(`instruments.${p.id}`, t(`waves.${p.id}`, p.name))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

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
                        width: `${totalBeats * BEAT_WIDTH}px`,
                        minWidth: `${totalBeats * BEAT_WIDTH}px`,
                        backgroundSize: `${BEAT_WIDTH}px 100%`
                    }}
                >
                    {track.notes.map(note => {
                        const keyIndex = PIANO_ROLL_KEYS.findIndex(k => k.note === note.pitch);
                        if (keyIndex === -1) return null;
                        return (
                            <div
                                key={`preview-${note.id}`}
                                className={styles.previewNote}
                                style={{
                                    left: `${note.startBeat * BEAT_WIDTH}px`,
                                    width: `${note.durationBeats * BEAT_WIDTH}px`,
                                    top: `${(keyIndex / PIANO_ROLL_KEYS.length) * 100}%`
                                }}
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