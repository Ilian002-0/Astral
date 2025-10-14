import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

// Define a type for our translation dictionary
type Translations = { [key: string]: any };

// A simple in-memory cache to avoid re-fetching on language switch
const translationsCache: { [key: string]: Translations } = {};

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<Language>('app_language', 'en');
  const [translations, setTranslations] = useState<Translations | null>(null);

  useEffect(() => {
    const loadTranslations = async (lang: Language) => {
      // Use cache if available
      if (translationsCache[lang]) {
        setTranslations(translationsCache[lang]);
        return;
      }
      
      try {
        // Fetch the JSON file. Path is relative to the root index.html
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) {
          throw new Error(`Could not load translations for language: ${lang}`);
        }
        const data = await response.json();
        
        // Store in cache and set state
        translationsCache[lang] = data;
        setTranslations(data);
      } catch (error) {
        console.error(error);
        // Fallback to an empty object if fetch fails to allow app to render
        setTranslations({});
      }
    };

    loadTranslations(language);
  }, [language]);

  const t = (key: string, options?: { [key: string]: string | number }): string => {
    // If translations are not loaded yet, return the key as a fallback
    if (!translations) {
      return key;
    }
    
    // Navigate through the nested JSON object using the key (e.g., "nav.dashboard")
    let text = key.split('.').reduce((obj, k) => obj && obj[k], translations);
    
    if (typeof text !== 'string') {
      // If the key is not found, return the key itself so developers can spot missing translations
      return key;
    }

    // Replace placeholders like {{count}} with values from the options object
    if (options) {
      Object.keys(options).forEach(k => {
        const regex = new RegExp(`{{${k}}}`, 'g');
        text = text.replace(regex, String(options[k]));
      });
    }

    return text;
  };

  const value = {
    language,
    setLanguage: (lang: Language) => setLanguage(lang),
    t,
  };

  // Do not render the rest of the app until translations are loaded to prevent a flash of untranslated text.
  if (!translations) {
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