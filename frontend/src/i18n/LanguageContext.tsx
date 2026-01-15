import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { translations, Language, TranslationKeys } from './translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKeys
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('mtx-toolkit-language')
    if (saved === 'en' || saved === 'zh') return saved
    // Check browser language
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('zh')) return 'zh'
    return 'en'
  })

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('mtx-toolkit-language', lang)
  }, [])

  const t = translations[language]

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
