import { useLang } from '../context/LanguageContext'
import { translations } from './translations'

export function useT() {
  const { lang } = useLang()
  return function t(key) {
    const entry = translations[key]
    if (!entry) return key
    return entry[lang] || entry['en'] || key
  }
}
