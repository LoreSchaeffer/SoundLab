import styles from './LanguageSelector.module.css';
import {Dropdown} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';

const languages = [
    {code: 'it', name: 'Italiano'},
    {code: 'en', name: 'English'}
];

const LanguageSelector = () => {
    const {i18n} = useTranslation();

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

    const handleLanguageChange = (langCode: string) => {
        i18n.changeLanguage(langCode);
    };

    return (
        <Dropdown drop="down" align="end">
            <Dropdown.Toggle className={styles.dropdownToggle}>
                <img
                    className={styles.flag}
                    src={`/images/flags/${currentLanguage.code}.svg`}
                    alt={currentLanguage.name}
                />
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