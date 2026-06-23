import styles from './MidiMappingEditor.module.css';
import {useEffect, useState} from 'react';
import {useMidi} from '../../contexts/MidiContext.ts';
import {type MidiParsedMessage} from '../../utils/midi.ts';
import Button from '../elements/Button.tsx';
import {MdCheck, MdSettingsInputComponent} from 'react-icons/md';
import {useTranslation} from "react-i18next";

type MidiMappingEditorProps = {
    actionName: string;
    currentCc?: number | null;
    onSave: (cc: number | null) => void;
    onCancel: () => void;
};

const MidiMappingEditor = ({actionName, currentCc, onSave, onCancel}: MidiMappingEditorProps) => {
    const {t} = useTranslation();
    const {addMidiListener, removeMidiListener} = useMidi();

    const [detectedCc, setDetectedCc] = useState<number | null>(currentCc || null);
    const [isListening, setIsListening] = useState(true);

    useEffect(() => {
        if (!isListening) return;

        const handleMidi = (msg: MidiParsedMessage) => {
            if (msg.type === 'cc' && msg.ccNumber !== undefined) {
                setDetectedCc(msg.ccNumber);
                setIsListening(false);
            }
        };

        addMidiListener(handleMidi);
        return () => removeMidiListener(handleMidi);
    }, [isListening, addMidiListener, removeMidiListener]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <MdSettingsInputComponent className={styles.headerIcon}/>
                <h3>MIDI Learn: {actionName}</h3>
            </div>

            <div className={styles.body}>
                {isListening ? (
                    <div className={styles.listeningBox}>
                        <div className={styles.pulseRing}></div>
                        <p>{t('modals.midi_mapping_editor.description')}</p>
                    </div>
                ) : (
                    <div className={styles.detectedBox}>
                        <p>{t('modals.midi_mapping_editor.cc_detected')}</p>
                        <h2>CC {detectedCc}</h2>
                        <Button variant="default" onClick={() => setIsListening(true)}>{t('common.retry')}</Button>
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <div className={styles.leftActions}>
                    <Button variant="default" color="red" onClick={() => onSave(null)}>{t('modals.midi_mapping_editor.remove_mapping')}</Button>
                </div>
                <div className={styles.rightActions}>
                    <Button variant="default" color="cyan" onClick={onCancel}>{t('common.cancel')}</Button>
                    <Button
                        variant="active"
                        color="cyan"
                        disabled={detectedCc === null}
                        onClick={() => onSave(detectedCc)}
                    >
                        <MdCheck/> {t("common.save")}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MidiMappingEditor;