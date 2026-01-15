import { useLanguage } from '../i18n/LanguageContext'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-slate-400" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
        className="bg-slate-800 text-slate-300 text-sm border border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="en">English</option>
        <option value="zh">中文</option>
      </select>
    </div>
  )
}
