import styles from './Navbar.module.css';
import {NavLink} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {MdInfo, MdKeyboardArrowDown, MdLinearScale, MdOutlinePiano, MdTune, MdWaves} from 'react-icons/md';
import clsx from 'clsx';
import {useEffect, useRef, useState} from "react";
import {supportedLanguages} from "../../i18n/config.ts";

const Navbar = () => {
    const {t, i18n} = useTranslation();
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState(i18n.language);

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onLangChange = (lng: string) => setCurrentLang(lng);
        i18n.on('languageChanged', onLangChange);
        return () => i18n.off('languageChanged', onLangChange);
    }, [i18n]);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setIsLangOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsLangOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navItems = [
        {path: '/playground', label: t('nav.playground'), icon: <MdWaves className={styles.navIcon}/>},
        {path: '/mixer', label: t('nav.mixer'), icon: <MdTune className={styles.navIcon}/>},
        {path: '/live', label: t('nav.live'), icon: <MdOutlinePiano className={styles.navIcon}/>},
        {path: '/sequencer', label: t('nav.sequencer'), icon: <MdLinearScale className={styles.navIcon}/>},
        {path: '/info', label: t('nav.info'), icon: <MdInfo className={styles.navIcon}/>},
    ];

    return (
        <div className={styles.navbar}>
            <NavLink to="/" className={styles.logo}>
                <img src="/images/icons/music.png" alt="Sound Lab" className={styles.logoImg}/>
                <h1 className={styles.logoText}>{t('sound_lab')}</h1>
            </NavLink>

            <div className={styles.navMenu}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({isActive}) => clsx(styles.navLink, isActive && styles.activeLink)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}

                <div className={styles.langDropdown} ref={dropdownRef}>

                    <button
                        className={styles.langToggle}
                        onClick={() => setIsLangOpen(!isLangOpen)}
                    >
                        <img
                            src={`/images/flags/${currentLang}.svg`}
                            alt={currentLang}
                            className={styles.currentFlag}
                        />
                        <MdKeyboardArrowDown className={clsx(styles.arrow, isLangOpen && styles.open)}/>
                    </button>

                    {isLangOpen && (
                        <div className={styles.dropdownMenu}>
                            {Object.keys(supportedLanguages).map((lang) => (
                                <button
                                    key={lang}
                                    className={clsx(styles.langOption, currentLang === lang && styles.active)}
                                    onClick={() => changeLanguage(lang)}
                                >
                                    <img src={`/images/flags/${lang}.svg`} alt={lang} className={styles.flagIcon}/>
                                    {supportedLanguages[lang].label}
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Navbar;