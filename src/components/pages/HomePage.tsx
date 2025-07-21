import styles from './HomePage.module.css';
import {useTranslation} from "react-i18next";
import {WavyBackground} from "../backgrounds/WavyBackground.tsx";
import AnimatedBackground from "../backgrounds/AnimatedBackground.tsx";
import {Button, Container} from "react-bootstrap";
import {useNavigate} from "react-router-dom";

export function HomePage() {
    const navigate = useNavigate();
    const {t} = useTranslation();

    return (
        <>
            <AnimatedBackground className={styles.animatedBackground}/>
            <WavyBackground containerClassName={styles.background}>
                <Container fluid className={'py-4 ' + styles.mainContainer}>
                    <div className={styles.logo}>
                        <div className={styles.imgWrapper}>
                            <img src={"/images/icons/music.png"} alt={t('sound_lab')}/>
                        </div>

                        <h1 className={'alternative-font'}>{t('sound_lab')}</h1>
                    </div>
                    <p className={styles.subtitle}>{t('homepage.subtitle')}</p>
                    <Button variant={'primary'} className={'shadow-sd'} onClick={() => navigate("/playground")}>
                        <img src={'/images/icons/play.png'} alt={t('homepage.play_now')} className={styles.playIcon}/>
                        {t('homepage.play_now')}
                    </Button>

                </Container>
            </WavyBackground>
        </>
    );
}