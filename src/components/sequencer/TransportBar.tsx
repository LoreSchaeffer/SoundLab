import styles from './TransportBar.module.css';
import {MdPause, MdPlayArrow, MdStop} from 'react-icons/md';
import Button from '../elements/Button.tsx';
import {useSequencer} from "../../contexts/SequencerContext.ts";
import {useTranslation} from "react-i18next";
import DraggableBadge from "../forms/DraggableBadge.tsx";

const TransportBar = () => {
    const {t} = useTranslation();
    const {isPlaying, togglePlay, bpm, setBpm, playheadBeat, setPlayheadBeat} = useSequencer();

    const currentBar = Math.floor(playheadBeat / 4) + 1;
    const currentBeat = Math.floor(playheadBeat % 4) + 1;

    const handleStop = () => {
        if (isPlaying) togglePlay();
        setPlayheadBeat(0);
    };

    return (
        <div className={styles.container}>
            <div className={styles.controls}>
                <Button
                    variant={isPlaying ? 'active' : 'default'}
                    color="green"
                    onClick={togglePlay}
                    icon={isPlaying ? <MdPause/> : <MdPlayArrow/>}
                    title={isPlaying ? t('common.pause') : t('common.play')}
                />
                <Button
                    variant="default"
                    color="red"
                    icon={<MdStop/>}
                    onClick={handleStop}
                    title={t('common.stop')}
                />
            </div>

            <div className={styles.display}>
                {String(currentBar).padStart(3, '0')} : {String(currentBeat).padStart(2, '0')}
            </div>

            <div className={styles.bpmWrapper}>
                BPM
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
        </div>
    );
};

export default TransportBar;