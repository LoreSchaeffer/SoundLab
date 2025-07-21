import styles from "./AboutPage.module.css";
import { Container } from "react-bootstrap";
import AnimatedBackground from "../backgrounds/AnimatedBackground";
import {Trans, useTranslation} from "react-i18next";

export function AboutPage() {
    const {t} = useTranslation();

    return (
        <>
            <AnimatedBackground className={styles.animatedBackground}/>
            <Container fluid className={styles.mainContainer + " nav-space"}>
                <h1 className={styles.title}>{t('about.title')}</h1>
                <p className={styles.subtitle}>{t('about.description')}</p>

                <section className={styles.section + " " + styles.contributors}>
                    <h2>{t('about.author_links')}</h2>
                    <ul>
                        <li><a href={'https://github.com/LoreSchaeffer'} target={'_blank'} rel="noopener noreferrer">Lorenzo Magni</a></li>
                        <li><a href={'https://github.com/LoreSchaeffer/SoundLab'} target={'_blank'} rel="noopener noreferrer">{t('about.github_repository')}</a></li>
                        <li><a href={'https://multicore.network'} target={'_blank'} rel="noopener noreferrer">MultiCore Network</a></li>
                    </ul>
                </section>

                <section className={styles.section + " " + styles.credits}>
                    <h2>{t('about.credits')}</h2>
                    <ul>
                        <li>{t('about.icons')} <a target="_blank" rel="noopener noreferrer" href="https://icons8.com">Icons8</a>.</li>
                        <li>
                            <Trans
                                i18nKey="about.ui"
                                components={{
                                    ui1: <a target="_blank" rel="noopener noreferrer" href="https://react.dev/">React</a>,
                                    ui2: <a target="_blank" rel="noopener noreferrer" href="https://react-bootstrap.github.io/">React Bootstrap</a>
                                }}
                            />
                        </li>
                        <li>{t('about.fonts')} <a target={"_blank"} rel="noopener noreferrer" href={'https://fonts.google.com/'}>Google Fonts</a>.</li>
                    </ul>
                </section>



                <section className={styles.section + " " + styles.contact}>
                    <h2>{t('about.contacts')}</h2>
                    <p>{t('about.contact_info')} <a href={'https://github.com/LoreSchaeffer/SoundLab'} target={'_blank'} rel="noopener noreferrer">GitHub</a>.</p>
                </section>
            </Container>
        </>
    );
}