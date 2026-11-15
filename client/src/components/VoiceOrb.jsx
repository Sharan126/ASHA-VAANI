import React from 'react';
import { Mic, Loader, Volume2, Zap } from 'lucide-react';

/** Maps each appState to its visual config */
const STATE = {
  IDLE: {
    bg:        'bg-teal-700',
    ringColor: 'rgba(15,118,110,0.4)',
    anim:      'animate-orb-idle',
    shadow:    'shadow-orb-idle',
    icon:      Mic,
    label:     'Tap to Speak',
    sub:       'Field Visit Voice Register',
    textColor: 'text-teal-800',
  },
  LISTENING: {
    bg:        'bg-emerald-500',
    ringColor: 'rgba(16,185,129,0.5)',
    anim:      'animate-orb-listen',
    shadow:    'shadow-orb-listen',
    icon:      Mic,
    label:     'Listening…',
    sub:       'Speak clearly in your language',
    textColor: 'text-emerald-700',
  },
  EXTRACTING: {
    bg:        'bg-teal-700',
    ringColor: 'rgba(15,118,110,0.3)',
    anim:      'animate-orb-idle',
    shadow:    'shadow-orb-extract',
    icon:      Loader,
    label:     'Extracting Data…',
    sub:       'Strict clinical schema processing',
    textColor: 'text-teal-800',
  },
  SPEAKING: {
    bg:        'bg-indigo-600',
    ringColor: 'rgba(79,70,229,0.4)',
    anim:      'animate-orb-speak',
    shadow:    'shadow-orb-speak',
    icon:      Volume2,
    label:     'Audio Read-Back…',
    sub:       'Tap orb or speak to barge-in',
    textColor: 'text-indigo-700',
  },
  BARGE_IN: {
    bg:        'bg-amber-500',
    ringColor: 'rgba(217,119,6,0.4)',
    anim:      'animate-orb-listen',
    shadow:    'shadow-orb-barge',
    icon:      Zap,
    label:     'Barge-In Detected',
    sub:       'Listening for field correction…',
    textColor: 'text-amber-700',
  },
};

export function VoiceOrb({ appState = 'IDLE', onPress }) {
  const cfg = STATE[appState] || STATE.IDLE;
  const Icon = cfg.icon;
  const isListening  = appState === 'LISTENING' || appState === 'BARGE_IN';
  const isSpeaking   = appState === 'SPEAKING';
  const isExtracting = appState === 'EXTRACTING';

  return (
    <div className="flex flex-col items-center gap-3.5 py-2 select-none w-full max-w-xs mx-auto">
      {/* ── Main Voice Orb Button ── */}
      <button
        onPointerDown={onPress}
        style={{ touchAction: 'manipulation' }}
        className={`
          relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center
          transition-all duration-500 ease-spring
          ${cfg.bg} ${cfg.anim} ${cfg.shadow} cursor-pointer
          focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-teal-400
        `}
        aria-label={cfg.label}
      >
        {/* Ripple rings — listening & barge-in */}
        {isListening && (
          <>
            <span className="orb-ring animate-ripple-1" style={{ color: cfg.ringColor, borderColor: cfg.ringColor }} />
            <span className="orb-ring animate-ripple-2" style={{ color: cfg.ringColor, borderColor: cfg.ringColor }} />
            <span className="orb-ring animate-ripple-3" style={{ color: cfg.ringColor, borderColor: cfg.ringColor }} />
          </>
        )}

        {/* Shimmer overlay — extracting */}
        {isExtracting && (
          <span className="absolute inset-0 rounded-full overflow-hidden">
            <span className="shimmer absolute inset-0 rounded-full" />
          </span>
        )}

        {/* Waveform bars — speaking */}
        {isSpeaking ? (
          <div className="relative z-10 flex items-center gap-1 h-9">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="wave-bar" />)}
          </div>
        ) : (
          <Icon
            className={`relative z-10 text-white icon-scalable ${isExtracting ? 'animate-spin-slow' : ''}`}
            style={{ width: '2.4em', height: '2.4em' }}
            strokeWidth={2}
          />
        )}
      </button>

      {/* ── Status Typography ── */}
      <div className="text-center min-h-[3rem] flex flex-col items-center justify-center gap-1">
        <div className={`font-black text-fluid-hero tracking-tight leading-tight transition-colors duration-300 ${cfg.textColor}`}>
          {cfg.label}
        </div>
        {cfg.sub && (
          <div className="text-fluid-xs text-ink-muted font-medium animate-ticker-in max-w-[240px] truncate">
            {cfg.sub}
          </div>
        )}
      </div>
    </div>
  );
}
