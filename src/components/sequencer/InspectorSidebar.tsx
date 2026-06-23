import styles from './InspectorSidebar.module.css';
import {type NoteEvent, type Track, useSequencer} from '../../contexts/SequencerContext.ts';
import Select from '../forms/Select.tsx';
import {noteNames, SCALES, type ScaleType} from "../../types";
import Input from "../forms/Input.tsx";
import {useTranslation} from "react-i18next";
import React, {useState} from "react";

type InspectorSidebarProps = {
    track: Track;
};

const InspectorSidebar = ({track}: InspectorSidebarProps) => {
    const {t} = useTranslation();
    const {selectedNoteIds, updateNote, scaleRoot, setScaleRoot, scaleType, setScaleType} = useSequencer();

    const selectedNotes = track.notes.filter(n => selectedNoteIds.includes(n.id));
    const firstNote = selectedNotes.length > 0 ? selectedNotes[0] : null;

    const scaleOptions = Object.keys(SCALES).map(scale => ({value: scale, label: t(`scales.${scale}`)}))

    return (
        <div className={styles.container}>
            <div className={styles.section}>
                <div className={styles.title}>{t('components.inspector_sidebar.harmonic_helper', 'Harmonic Helper')}</div>

                <div className={styles.field}>
                    <span className={styles.label}>{t('common.root', 'Root')}</span>
                    <div className={styles.selectWrapper}>
                        <Select
                            options={noteNames.map(r => ({value: r, label: r}))}
                            value={scaleRoot}
                            onChange={(e) => setScaleRoot(e.target ? e.target.value : e)}
                            compact
                        />
                    </div>
                </div>

                <div className={styles.field}>
                    <span className={styles.label}>{t('common.scale', 'Scale')}</span>
                    <div className={styles.selectWrapper}>
                        <Select
                            options={scaleOptions}
                            value={scaleType}
                            onChange={(e) => setScaleType(e.target ? e.target.value : e as ScaleType)}
                            compact
                        />
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.title}>{t('components.inspector_sidebar.note_inspector', 'Note Inspector')}</div>

                {firstNote ? (
                    <NoteEditor
                        key={firstNote.id}
                        trackId={track.id}
                        note={firstNote}
                        selectedNoteIds={selectedNoteIds}
                        updateNote={updateNote}
                    />
                ) : (
                    <div className={styles.emptyState}>
                        {t('components.inspector_sidebar.select_note', 'Select a note')}
                    </div>
                )}
            </div>
        </div>
    );
};

const NoteEditor = ({trackId, note, selectedNoteIds, updateNote}: {
    trackId: string;
    note: NoteEvent;
    selectedNoteIds: string[];
    updateNote: (trackId: string, noteId: string, updates: Partial<NoteEvent>) => void;
}) => {
    const {t} = useTranslation();

    const [pitchBuf, setPitchBuf] = useState(note.pitch);
    const [startBuf, setStartBuf] = useState(Number(note.startBeat).toFixed(2));
    const [lengthBuf, setLengthBuf] = useState(Number(note.durationBeats).toFixed(2));
    const [velBuf, setVelBuf] = useState(Number(note.velocity).toFixed(2));

    const handleUpdate = (field: string, value: string | number) => {
        selectedNoteIds.forEach(id => {
            updateNote(trackId, id, {[field]: value});
        });
    };

    const applyPitch = () => {
        const val = pitchBuf.trim().toUpperCase();
        if (/^[A-G]#?[0-9]$/.test(val)) {
            handleUpdate('pitch', val);
            setPitchBuf(val);
        } else {
            setPitchBuf(note.pitch);
        }
    };

    const applyStart = () => {
        const val = parseFloat(startBuf);
        if (!isNaN(val) && val >= 0) {
            handleUpdate('startBeat', val);
            setStartBuf(val.toFixed(2));
        } else {
            setStartBuf(Number(note.startBeat).toFixed(2));
        }
    };

    const applyLength = () => {
        const val = parseFloat(lengthBuf);
        if (!isNaN(val) && val >= 0.125) {
            handleUpdate('durationBeats', val);
            setLengthBuf(val.toFixed(2));
        } else {
            setLengthBuf(Number(note.durationBeats).toFixed(2));
        }
    };

    const applyVelocity = () => {
        const val = parseFloat(velBuf);
        if (!isNaN(val) && val >= 0 && val <= 1) {
            handleUpdate('velocity', val);
            setVelBuf(val.toFixed(2));
        } else {
            setVelBuf(Number(note.velocity).toFixed(2));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') e.currentTarget.blur();
    };

    return (
        <>
            <div className={styles.field}>
                <span className={styles.label}>{t('common.pitch', 'Pitch')}</span>
                <div className={styles.inputWrapper}>
                    <Input
                        textAlign="right"
                        value={pitchBuf}
                        onChange={(e) => setPitchBuf(e.target.value.toUpperCase())}
                        onBlur={applyPitch}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            </div>
            <div className={styles.field}>
                <span className={styles.label}>{t('common.start', 'Start')}</span>
                <div className={styles.inputWrapper}>
                    <Input
                        textAlign="right"
                        type="number"
                        step="0.125"
                        value={startBuf}
                        onChange={(e) => setStartBuf(e.target.value)}
                        onBlur={applyStart}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            </div>
            <div className={styles.field}>
                <span className={styles.label}>{t('common.length', 'Length')}</span>
                <div className={styles.inputWrapper}>
                    <Input
                        textAlign="right"
                        type="number"
                        step="0.125"
                        value={lengthBuf}
                        onChange={(e) => setLengthBuf(e.target.value)}
                        onBlur={applyLength}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            </div>
            <div className={styles.field}>
                <span className={styles.label}>{t('common.velocity', 'Vel')}</span>
                <div className={styles.inputWrapper}>
                    <Input
                        textAlign="right"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={velBuf}
                        onChange={(e) => setVelBuf(e.target.value)}
                        onBlur={applyVelocity}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            </div>
        </>
    );
};

export default InspectorSidebar;