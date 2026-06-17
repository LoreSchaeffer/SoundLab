import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import {initReactI18next} from "react-i18next";

import it from './locales/it.json';
import en from './locales/en.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supportedLanguages: Record<string, { label: string, translation: any }> = {
    it: {
        label: 'Italiano',
        translation: it
    },
    en: {
        label: 'English',
        translation: en
    }
}

const resources = Object.fromEntries(Object.entries(supportedLanguages)
    .map(([code, {translation}]) => [code, {translation}]));

export const fallbackLanguage = 'it';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: fallbackLanguage,
        supportedLngs: Object.keys(supportedLanguages),
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'soundlab_lang'
        }
    });

export default i18n;