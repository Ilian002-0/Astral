import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = 'atlas_language_v1';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage immediately to avoid async flicker
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(LANGUAGE_KEY);
        if (saved === 'fr' || saved === 'en') {
            return saved;
        }
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  };

  const t = (key: string, options?: { [key: string]: string | number }) => {
    const currentLang = (language in translations) ? language : 'en';
    const dict = translations[currentLang as keyof typeof translations];
    
    // Fallback to EN if dict is missing for some reason
    const fallbackDict = translations['en'];
    const safeDict = dict || fallbackDict;

    if (!safeDict) return key;

    const keyParts = key.split('.');
    let translation: any = safeDict;

    for (const part of keyParts) {
      if (translation && typeof translation === 'object' && translation[part] !== undefined) {
        translation = translation[part];
      } else {
        return key; // Return the key itself if not found
      }
    }

    if (typeof translation === 'string' && options) {
      return Object.entries(options).reduce((str, [optKey, optValue]) => {
        return str.replace(new RegExp(`{{${optKey}}}`, 'g'), String(optValue));
      }, translation);
    }
    
    return typeof translation === 'string' ? translation : key;
  };

  const value = { language, setLanguage, t };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};