import styles from './SequencerPage.module.css';
import TransportBar from "../components/sequencer/TransportBar.tsx";
import ArrangementView from "../components/sequencer/ArrangementView.tsx";
import PlaybackEngine from "../components/sequencer/PlaybackEngine.tsx";

const SequencerPage = () => {
    return (
        <div className={styles.page}>
            <PlaybackEngine/>
            <TransportBar/>
            <ArrangementView/>
        </div>
    );
};

export default SequencerPage;