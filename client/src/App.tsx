import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BookOpen, 
  Search, 
  Globe, 
  ShieldCheck, 
  HeartHandshake, 
  Users, 
  ChevronRight
} from 'lucide-react';

const CATEGORIES = [
  { id: 'christianity', key: 'christianity', icon: '✝️', slug: 'christianity', color: 'from-amber-700/20 to-red-900/20' },
  { id: 'islamic', key: 'islamic', icon: '📖', slug: 'islamic', color: 'from-emerald-700/20 to-teal-900/20' },
  { id: 'testimonies', key: 'testimonies', icon: '🕊️', slug: 'testimonies', color: 'from-blue-700/20 to-indigo-900/20' },
  { id: 'atheism', key: 'atheism', icon: '⚖️', slug: 'atheism', color: 'from-purple-700/20 to-violet-900/20' },
  { id: 'spiritual-teachings', key: 'spiritualTeachings', icon: '🕯️', slug: 'spiritual-teachings', color: 'from-amber-600/20 to-orange-900/20' },
];

export function App() {
  const { t, i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const changeLanguage = (lang: 'am' | 'en' | 'om' | 'ti') => {
    i18n.changeLanguage(lang);
    setLangMenuOpen(false);
  };

  const languages = [
    { code: 'am', label: 'አማርኛ' },
    { code: 'en', label: 'English' },
    { code: 'om', label: 'Afaan Oromoo' },
    { code: 'ti', label: 'ትግርኛ' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors">
      {/* Top Brand Bar */}
      <header className="sticky top-0 z-50 bg-stone-900/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-amber-500/20 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-800 to-amber-700 flex items-center justify-center shadow-md border border-amber-400/30">
              <span className="text-xl font-bold text-amber-200">☩</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-amber-100 font-serif">
                {t('brand.title')}
              </h1>
              <p className="text-xs text-amber-300/80 font-medium hidden sm:block">
                {t('brand.subtitle')}
              </p>
            </div>
          </div>

          {/* Search Trigger & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => alert('Search modal is ready for Phase 3 integration!')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-800/80 border border-stone-700/60 text-stone-300 hover:text-white hover:border-amber-500/40 text-xs sm:text-sm transition-all"
            >
              <Search className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">{t('actions.search')}</span>
              <kbd className="hidden lg:inline px-1.5 py-0.5 text-[10px] bg-stone-700 text-stone-300 rounded">Ctrl+K</kbd>
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800 border border-stone-700 hover:border-amber-500/50 text-xs font-semibold text-amber-200 transition-all"
                aria-label="Select Language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="uppercase">{i18n.language}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-stone-900 border border-amber-500/30 shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => changeLanguage(l.code as any)}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-stone-800 transition-colors ${
                        i18n.language === l.code ? 'text-amber-400 font-bold bg-stone-800/60' : 'text-stone-300'
                      }`}
                    >
                      <span>{l.label}</span>
                      {i18n.language === l.code && <span className="text-amber-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <nav className="border-t border-stone-800 bg-stone-900/60 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 py-1.5 min-w-max">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-red-800 text-white shadow-sm'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800'
              }`}
            >
              {t('nav.home')}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeCategory === cat.id
                    ? 'bg-red-800 text-white shadow-sm'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{t(`nav.${cat.key}`)}</span>
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-950 via-stone-900 to-stone-950 text-white p-6 sm:p-10 lg:p-12 shadow-2xl border border-amber-500/20 mb-12">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4">
              <span>☦</span>
              <span>{t('brand.tagline')}</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-serif text-amber-100 mb-4 leading-tight">
              {t('home.heroTitle')}
            </h2>
            
            <blockquote className="border-l-4 border-amber-500 pl-4 my-4 italic text-stone-300 text-base sm:text-lg">
              <p className="font-serif">{t('home.heroQuote')}</p>
              <footer className="text-xs text-amber-400 font-sans mt-1 not-italic font-medium">
                — {t('home.heroQuoteAuthor')}
              </footer>
            </blockquote>

            <p className="text-stone-300 text-sm sm:text-base mb-6 leading-relaxed">
              {t('home.heroSubtitle')}
            </p>

            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setActiveCategory('christianity')}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white text-xs sm:text-sm font-semibold shadow-md flex items-center gap-2 transition-all"
              >
                <span>{t('actions.readMore')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
            <span className="text-[260px] select-none font-serif">☩</span>
          </div>
        </section>

        {/* 5 Knowledge Pillars Showcase */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-red-800 dark:text-amber-400" />
              <span>{t('nav.categories')}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="group cursor-pointer rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{cat.icon}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono">
                      /{cat.slug}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-red-800 dark:group-hover:text-amber-400 transition-colors">
                    {t(`nav.${cat.key}`)}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">
                    {t('brand.tagline')}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs font-semibold text-red-800 dark:text-amber-400">
                  <span>{t('actions.readMore')}</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3 Pillars of Mission */}
        <section className="mb-12 bg-white dark:bg-stone-900/60 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800">
          <h3 className="text-xl sm:text-2xl font-bold font-serif text-center mb-8 text-stone-900 dark:text-stone-100">
            {t('home.pillarsTitle')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/40">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm mb-1">{t('home.pillar1Title')}</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                {t('home.pillar1Desc')}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/40">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center mb-3">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm mb-1">{t('home.pillar2Title')}</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                {t('home.pillar2Desc')}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-700/40">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm mb-1">{t('home.pillar3Title')}</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                {t('home.pillar3Desc')}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <footer className="bg-stone-900 dark:bg-stone-950 text-stone-300 border-t border-stone-800 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400 font-bold text-lg">☩</span>
              <h4 className="font-bold font-serif text-sm text-white">{t('brand.title')}</h4>
            </div>
            <p className="text-stone-400 leading-relaxed mb-4">
              {t('footer.aboutText')}
            </p>
            <p className="text-amber-300/90 italic font-serif">
              {t('footer.scripture')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-white mb-3">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              {CATEGORIES.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setActiveCategory(c.id)} className="hover:text-amber-400 transition-colors">
                    {t(`nav.${c.key}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm text-white mb-3">{t('footer.contactInfo')}</h4>
            <p className="text-stone-400 mb-2">Email: info@sonsofathanasius.org</p>
            <p className="text-stone-400 mb-2">Telegram: @ZeathanAmharic</p>
            <p className="text-stone-500 text-[11px] mt-4">
              © {new Date().getFullYear()} {t('brand.title')}. {t('footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
