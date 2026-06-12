import styles from "./WaveformConfiguration.module.css";
import {MdCompareArrows, MdMusicNote, MdVolumeUp, MdWaves} from "react-icons/md";
import Select from "../forms/Select.tsx";
import Slider from "../forms/Slider.tsx";
import clsx from "clsx";
import {commonNotes} from "../../types/music.ts";
import Button from "../elements/Button.tsx";
import {usePreset} from "../../contexts/PresetContext.ts";
import {useTranslation} from "react-i18next";
import type {Color} from "../../types";
import DraggableBadge from "./DraggableBadge.tsx";

type WaveformConfigurationProps = {
    color?: Color;

    presetId: string;
    onPresetChange: (id: string) => void;

    frequency: number;
    onFrequencyChange: (freq: number) => void;

    amplitude: number;
    onAmplitudeChange: (amp: number) => void;

    phase?: number;
    onPhaseChange?: (phase: number) => void;
}

const WaveformConfiguration = ({
                                   color = "cyan",
                                   presetId,
                                   onPresetChange,
                                   frequency,
                                   onFrequencyChange,
                                   amplitude,
                                   onAmplitudeChange,
                                   phase,
                                   onPhaseChange,
                               }: WaveformConfigurationProps) => {
    const {t} = useTranslation();
    const {presets} = usePreset();

    const presetOptions = presets.map(p => ({
        value: p.id,
        label: t(`instruments.${p.id}`, t(`waves.${p.id}`, p.name))
    }));

    return (
        <div>
            <div className={styles.controlGroup}>
                <label className={styles.controlLabel}><MdWaves className={styles.controlIcon}/>{t('components.waveform_controls.waveform')}</label>
                <Select
                    options={presetOptions}
                    value={presetId}
                    onChange={(e) => onPresetChange(e.target.value)}
                    color={color}
                    icon={<MdWaves/>}
                />
            </div>

            <div className={styles.controlGroup}>
                <label className={styles.controlLabel}>
                    <MdMusicNote className={styles.controlIcon}/>{t('components.waveform_controls.frequency')}
                    <DraggableBadge
                        className={styles.valBadge}
                        value={Math.round(frequency)}
                        onChange={(v) => onFrequencyChange(v)}
                        min={20}
                        max={2000}
                        step={1}
                        dragMultiplier={2}
                        unit="Hz"
                        color={color}
                    />
                </label>
                <Slider
                    min={100}
                    max={1000}
                    value={frequency}
                    onChange={onFrequencyChange}
                    leftLabel={t('common.low')}
                    rightLabel={t('common.high')}
                    color={color}
                />
            </div>

            <div className={styles.controlGroup}>
                <label className={clsx(styles.controlLabel, styles.mutedLabel)}>{t('components.waveform_controls.common_notes')}</label>
                <div className={styles.buttonGrid}>
                    {commonNotes.map((n, idx) =>
                        <Button
                            key={n.note + '_' + idx}
                            color={color}
                            variant={frequency === n.frequency ? 'active' : 'default'}
                            onClick={() => onFrequencyChange(n.frequency)}
                        >
                            {t(`notes.${n.note}`, {defaultValue: n.note})}{n.alteration}
                        </Button>
                    )}
                </div>
            </div>

            {phase !== undefined && onPhaseChange && (
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        <MdCompareArrows className={styles.controlIcon}/>{t('components.waveform_controls.phase')}
                        <DraggableBadge
                            className={styles.valBadge}
                            value={Math.round(phase)}
                            onChange={(v) => onPhaseChange(v)}
                            min={-180}
                            max={180}
                            step={1}
                            dragMultiplier={1}
                            unit="°"
                            color={color}
                        />
                    </label>
                    <Slider
                        min={-180}
                        max={180}
                        step={1}
                        value={phase}
                        onChange={onPhaseChange}
                        leftLabel="-180°"
                        rightLabel="180°"
                        color={color}
                    />
                </div>
            )}

            <div className={styles.controlGroup}>
                <label className={styles.controlLabel}>
                    <MdVolumeUp className={styles.controlIcon}/>{t('components.waveform_controls.volume')}
                    <DraggableBadge
                        className={styles.valBadge}
                        value={Math.round(amplitude * 100)}
                        onChange={(v) => onAmplitudeChange(v / 100)}
                        min={0}
                        max={100}
                        step={1}
                        dragMultiplier={1}
                        unit="%"
                        color={color}
                    />
                </label>
                <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={amplitude}
                    onChange={onAmplitudeChange}
                    leftLabel={t('common.piano')}
                    rightLabel={t('common.forte')}
                    color={color}
                />
            </div>
        </div>
    );
};

export default WaveformConfiguration;