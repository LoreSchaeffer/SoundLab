import styles from './ArrangementView.module.css';
import TrackRow from './TrackRow.tsx';
import Button from '../elements/Button.tsx';
import {MdAdd} from 'react-icons/md';
import {useSequencer} from "../../contexts/SequencerContext.ts";
import TimelineRuler from './TimelineRuler.tsx';
import {useRef} from 'react';
import {useTranslation} from "react-i18next";

const ArrangementView = () => {
    const {t} = useTranslation();
    const {tracks, addTrack} = useSequencer();
    const rulerScrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className={styles.container}>
            <div className={styles.topRulerRow}>
                <div className={styles.rulerHeaderSpacer}></div>
                <div className={styles.rulerScrollContext} ref={rulerScrollRef}>
                    <TimelineRuler/>
                </div>
            </div>

            <div
                className={styles.tracksWrapper}
            >
                {tracks.map(track => (
                    <TrackRow key={track.id} track={track}/>
                ))}

                <div className={styles.addTrackContainer}>
                    <Button variant="default" color="cyan" icon={<MdAdd/>} onClick={addTrack}>
                        {t('sequencer.add_track')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ArrangementView;