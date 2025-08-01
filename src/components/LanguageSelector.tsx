import styles from './LanguageSelector.module.css';
import {Dropdown} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {DropdownArrow} from "./DropdownArrow.tsx";
import { useState, useEffect } from 'react';

const languages = [
    {code: 'it', name: 'Italiano'},
    {code: 'en', name: 'English'},
    {code: 'de', name: 'Deutsch'},
];

const LanguageSelector = ({className}: {className?: string} = {}) => {
    const {i18n} = useTranslation();
    const [currentLang, setCurrentLang] = useState(i18n.language);

    useEffect(() => {
        const onLangChange = (lng: string) => setCurrentLang(lng);
        i18n.on('languageChanged', onLangChange);
        return () => i18n.off('languageChanged', onLangChange);
    }, [i18n]);

    const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

    const handleLanguageChange = (langCode: string) => {
        i18n.changeLanguage(langCode);
    };

    return (
        <Dropdown drop="down" align="end">
            <Dropdown.Toggle className={`dropdown-toggle ${styles.dropdownToggle} ${className === 'home' ? styles.home : ''}`}>
                <img
                    className={styles.flag}
                    src={`/images/flags/${currentLanguage.code}.svg`}
                    alt={currentLanguage.name}
                />
                <DropdownArrow color={className === 'home' ? 'var(--gray-900)' : 'var(--white)'}/>
            </Dropdown.Toggle>
            <Dropdown.Menu>
                {languages.map((language) => (
                    <Dropdown.Item
                        className={styles.dropdownItem}
                        key={language.code}
                        active={language.code === i18n.language}
                        onClick={() => handleLanguageChange(language.code)}
                    >
                        <img className={styles.dropdownFlag} src={`/images/flags/${language.code}.svg`} alt={language.name}/> {language.name}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default LanguageSelector;