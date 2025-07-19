import styles from './SequencerPage.module.css';
import {useTranslation} from "react-i18next";
import {Sequencer} from "../Sequencer.tsx";
import {Col, Row} from "react-bootstrap";
import {colors} from "../../utils/colors.ts";

export function SequencerPage() {
    const {t} = useTranslation();

    return (
        <>
            <div className={'page-title'}>
                <div className={'d-flex align-items-center gap-2 mb-3'}>
                    <img src={'/images/icons/sequencer.png'} alt={'Sequencer Icon'}/>
                    <h2 className={'alternative-font'}>{t('sequencer.title')}</h2>
                </div>
                <p>{t('sequencer.description')}</p>
            </div>
            <div>
                <div className={styles.player}>

                </div>
                <Row>
                    <Col>
                        <Sequencer number={1} tempo={60}/>
                    </Col>
                </Row>
            </div>
        </>
    )
}