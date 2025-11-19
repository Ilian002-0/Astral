
import React, { createContext, useContext, ReactNode } from 'react';
import useDBStorage from '../hooks/useLocalStorage';
import { translations } from '../utils/translations';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: language, setData: setLanguage, isLoading: isLanguageLoading } = useDBStorage<Language>('language', 'en');

  const t = (key: string, options?: { [key: string]: string | number }) => {
    const currentLang = (language in translations) ? language : 'en';
    const dict = translations[currentLang as keyof typeof translations];
    
    if (!dict) return key;

    const keyParts = key.split('.');
    let translation: any = dict;

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
  
  if (isLanguageLoading) {
    return null; 
  }

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
