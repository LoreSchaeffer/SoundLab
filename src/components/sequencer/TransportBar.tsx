import styles from './TransportBar.module.css';
import {MdContentCut, MdDeleteSweep, MdFileDownload, MdFileUpload, MdMouse, MdPause, MdPlayArrow, MdRepeat, MdSettingsInputComponent, MdStop, MdVolumeUp} from 'react-icons/md';
import Button from '../elements/Button.tsx';
import {useSequencer} from "../../contexts/SequencerContext.ts";
import {useTranslation} from "react-i18next";
import DraggableBadge from "../forms/DraggableBadge.tsx";
import React, {useCallback, useEffect, useRef} from "react";
import {useNotification} from "../../contexts/NotificationContext.ts";
import {useModal} from "../../contexts/ModalContext.ts";
import Slider from "../forms/Slider.tsx";
import Select from "../forms/Select.tsx";
import {useContextMenu} from "../../contexts/ContextMenuContext.ts";
import MidiMappingEditor from "../modals/MidiMappingEditor.tsx";
import {useMidi} from "../../contexts/MidiContext.ts";
import type {MidiParsedMessage} from "../../utils/midi.ts";

const TransportBar = () => {
    const {t} = useTranslation();
    const {
        isPlaying,
        togglePlay,
        bpm,
        setBpm,
        playheadBeat,
        setPlayheadBeat,
        isLooping,
        toggleLoop,
        tracks,
        clearProject,
        loadProject,
        masterVolume,
        setMasterVolume,
        snapResolution,
        setSnapResolution,
        activeTool,
        setActiveTool
    } = useSequencer();
    const {openModal, closeModal} = useModal();
    const {addNotification} = useNotification();
    const {openContextMenu} = useContextMenu();
    const {ccMappings, setCcMapping, addMidiListener, removeMidiListener} = useMidi();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentBar = Math.floor(playheadBeat / 4) + 1;
    const currentBeat = Math.floor(playheadBeat % 4) + 1;

    const handleStop = useCallback(() => {
        if (isPlaying) togglePlay();
        setPlayheadBeat(0);
    }, [isPlaying, setPlayheadBeat, togglePlay]);

    const handleExport = () => {
        const data = JSON.stringify({bpm, tracks}, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'song.json';
        a.click();
        URL.revokeObjectURL(url);

        addNotification({message: t('notifications.sequencer.project_exported'), variant: 'success'});
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                if (data.tracks) loadProject(data);
                addNotification({message: t('notifications.sequencer.project_imported'), variant: 'success'});
            } catch {
                addNotification({message: t('notifications.sequencer.project_import_error'), variant: 'danger'});
            }

            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleClearClick = () => {
        openModal({
            title: t('modals.clear_sequencer_project.title'),
            size: 'sm',
            content: <p>{t('modals.clear_sequencer_project.description')}</p>,
            footer: (
                <>
                    <Button color="cyan" variant="default" onClick={closeModal}>
                        {t('common.cancel')}
                    </Button>
                    <Button color="red" variant="active" onClick={() => {
                        clearProject();
                        closeModal();
                        addNotification({message: t('notifications.sequencer.project_cleared'), variant: 'info'});
                    }}>
                        {t('common.clear')}
                    </Button>
                </>
            )
        });
    };

    const handleMidiLearn = (actionId: string, actionName: string) => (e: React.MouseEvent) => {
        openContextMenu(e, [
            {
                label: t('menus.set_midi_cc'),
                icon: <MdSettingsInputComponent/>,
                onClick: () => {
                    openModal({
                        size: 'md',
                        hideHeader: true,
                        content: (
                            <MidiMappingEditor
                                actionName={actionName}
                                currentCc={ccMappings[actionId]}
                                onSave={(cc) => {
                                    setCcMapping(actionId, cc);
                                    closeModal();
                                }}
                                onCancel={closeModal}
                            />
                        )
                    });
                }
            }
        ]);
    };

    useEffect(() => {
        const handleMidiAction = (msg: MidiParsedMessage) => {
            if (msg.type === 'cc' && msg.ccNumber !== undefined && msg.ccValue !== undefined && msg.ccValue > 0) {
                switch (msg.ccNumber) {
                    case ccMappings['play']:
                        togglePlay();
                        break;
                    case ccMappings['stop']:
                        handleStop();
                        break;
                    case ccMappings['loop']:
                        toggleLoop();
                        break;
                    case ccMappings['pointer']:
                        setActiveTool('pointer');
                        break;
                    case ccMappings['split']:
                        setActiveTool('split');
                        break;
                }
            }
        };

        addMidiListener(handleMidiAction);
        return () => removeMidiListener(handleMidiAction);
    }, [addMidiListener, removeMidiListener, ccMappings, togglePlay, handleStop, toggleLoop, setActiveTool]);

    const gridOptions = [
        {value: '1', label: '1/4'},
        {value: '2', label: '1/8'},
        {value: '4', label: '1/16'},
        {value: '0', label: t('common.off')}
    ];

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <Button
                    variant={isPlaying ? 'active' : 'default'}
                    color="green"
                    onClick={togglePlay}
                    onContextMenu={handleMidiLearn('play', t('common.play_pause'))}
                    icon={isPlaying ? <MdPause/> : <MdPlayArrow/>}
                    title={isPlaying ? t('common.pause') : t('common.play') + ` (${t('common.spacebar')})`}
                />
                <Button
                    variant="default"
                    color="red"
                    icon={<MdStop/>}
                    onClick={handleStop}
                    onContextMenu={handleMidiLearn('stop', t('common.stop'))}
                    title={t('common.stop')}
                />
                <Button
                    variant={isLooping ? 'active' : 'default'}
                    color="cyan"
                    icon={<MdRepeat/>}
                    onClick={toggleLoop}
                    onContextMenu={handleMidiLearn('loop', t('common.loop'))}
                    title={t('common.loop')}
                />
            </div>

            <div className={styles.display}>
                {String(currentBar).padStart(3, '0')} : {String(currentBeat).padStart(2, '0')}
            </div>

            <div className={styles.bpmWrapper}>
                <span className={styles.label}>BPM</span>
                <DraggableBadge
                    className={styles.bpmBadge}
                    value={Math.round(bpm)}
                    onChange={(v) => setBpm(v)}
                    min={40}
                    max={300}
                    step={1}
                    color="cyan"
                    centered
                    dragMultiplier={1}
                />
            </div>

            <div className={styles.toolsSeparator}/>

            <div className={styles.toolsWrapper}>
                <span className={styles.label}>Grid</span>
                <div className={styles.gridSelectWrapper}>
                    <Select
                        options={gridOptions}
                        value={String(snapResolution)}
                        onChange={(val) => setSnapResolution(Number(val?.target ? val.target.value : val))}
                    />
                </div>
            </div>

            <div className={styles.toolsSeparator}/>

            <div className={styles.toolsWrapper}>
                <Button
                    variant={activeTool === 'pointer' ? 'active' : 'default'}
                    color="cyan"
                    icon={<MdMouse size={16}/>}
                    onClick={() => setActiveTool('pointer')}
                    onContextMenu={handleMidiLearn('pointer', t('sequencer.pointer'))}
                    title={t('sequencer.pointer') + ' (V)'}
                />
                <Button
                    variant={activeTool === 'split' ? 'active' : 'default'}
                    color="cyan"
                    icon={<MdContentCut size={16}/>}
                    onClick={() => setActiveTool('split')}
                    onContextMenu={handleMidiLearn('split', t('sequencer.cut'))}
                    title={t('sequencer.cut') + ' (C)'}
                />
            </div>

            <div className={styles.toolsSeparator}/>

            <div className={styles.volumeWrapper}>
                <MdVolumeUp size={18}/>
                <div className={styles.volumeSliderWrapper}>
                    <Slider
                        value={masterVolume}
                        onChange={(v) => setMasterVolume(v)}
                        min={0}
                        max={1}
                        step={0.01}
                        compact
                    />
                </div>
            </div>

            <div className={styles.projectControls}>
                <Button
                    variant="default"
                    onClick={() => fileInputRef.current?.click()}
                    icon={<MdFileUpload/>}
                    title={t('common.import')}
                />
                <Button
                    variant="default"
                    onClick={handleExport}
                    icon={<MdFileDownload/>}
                    title={t('common.export')}
                />
                <Button
                    variant="default"
                    color="red"
                    onClick={handleClearClick}
                    icon={<MdDeleteSweep/>}
                    title={t('common.clear')}
                />

                <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    accept=".json"
                    onChange={handleImport}
                />
            </div>
        </div>
    );
};

export default TransportBar;