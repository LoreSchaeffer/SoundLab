import styles from './HomePage.module.css';
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import Card from "../components/elements/Card.tsx";
import GlowSpot from "../components/elements/GlowSpot.tsx";
import Button from "../components/elements/Button.tsx";
import {MdPlayArrow} from "react-icons/md";

function HomePage() {
    const navigate = useNavigate();
    const {t} = useTranslation();

    const handleStart = async () => {
        navigate("/playground");
    };

    return (
        <div className={styles.home}>
            <GlowSpot
                color={'cyan'}
                top={'-20%'}
                left={'-20%'}
                animation={{
                    scale: 1.1,
                    translateX: '10%',
                    translateY: '5%'
                }}
            />
            <GlowSpot
                color="orange"
                bottom="-20%"
                right="-20%"
                animation={{
                    translateX: '-8%',
                    translateY: '-5%'
                }}
            />

            <Card elevation={4} className={styles.card}>
                <Card.Body className={styles.cardBody}>
                    <div className={styles.logo}>
                        <div className={styles.imgWrapper}>
                            <img src="/images/icons/music.png" alt="Sound Lab"/>
                            <h1 className={styles.title}>{t('sound_lab') || 'Sound Lab'}</h1>
                        </div>
                    </div>

                    <p className={styles.subtitle}>
                        {t('homepage.subtitle')}
                    </p>

                    <Button
                        className={styles.playBtn}
                        color={'cyan'}
                        variant={'active'}
                        icon={<MdPlayArrow/>}
                        onClick={handleStart}
                    >
                        {t('homepage.play')}
                    </Button>
                </Card.Body>
            </Card>
        </div>
    );
}

export default HomePage;