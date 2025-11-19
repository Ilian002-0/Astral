

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import useDBStorage from '../hooks/useLocalStorage';

type Translations = { [key: string]: any };
type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: language, setData: setLanguage, isLoading: isLanguageLoading } = useDBStorage<Language>('language', 'en');
  const [translations, setTranslations] = useState<Translations | null>(null);
  const [isTranslationsLoading, setIsTranslationsLoading] = useState(true);

  useEffect(() => {
    const fetchTranslations = async () => {
      setIsTranslationsLoading(true);
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load translations for ${language}`);
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error(error);
        // Fallback to English if the selected language fails to load
        if (language !== 'en') {
            const fallbackResponse = await fetch('/locales/en.json');
            if (fallbackResponse.ok) {
                setTranslations(await fallbackResponse.json());
            }
        }
      } finally {
        setIsTranslationsLoading(false);
      }
    };

    if (!isLanguageLoading) {
        fetchTranslations();
    }
  }, [language, isLanguageLoading]);


  const t = (key: string, options?: { [key: string]: string | number }) => {
    if (!translations) return key;

    const keyParts = key.split('.');
    let translation: any = translations;

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
  
  // Wait until both the language preference and the translation file are loaded
  if (isLanguageLoading || isTranslationsLoading) {
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