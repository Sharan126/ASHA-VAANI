import React from 'react';

const LANGUAGES = [
  { code: 'hi', label: 'हिन्दी', name: 'Hindi' },
  { code: 'kn', label: 'ಕನ್ನಡ', name: 'Kannada' },
  { code: 'ta', label: 'தமிழ்', name: 'Tamil' },
  { code: 'te', label: 'తెలుగు', name: 'Telugu' },
  { code: 'en', label: 'EN', name: 'English' },
];

export function LanguageSelector({ selected, onChange }) {
  return (
    <div className="flex items-center gap-2.5 no-scrollbar overflow-x-auto py-1">
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          style={{ touchAction: 'manipulation' }}
          aria-label={`Select language: ${lang.name || lang.label}`}
          className={`
            touch-target flex-shrink-0 px-4 py-2.5 rounded-full text-fluid-sm font-semibold
            border transition-all duration-200 ease-spring select-none
            ${selected === lang.code
              ? 'bg-white text-teal-800 border-white shadow-md ring-2 ring-white/60 scale-105'
              : 'bg-teal-800/60 text-teal-100 border-teal-500/40 hover:bg-teal-800 hover:text-white active:scale-95'
            }
          `}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
