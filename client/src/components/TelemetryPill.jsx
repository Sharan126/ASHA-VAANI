import React from 'react';
import { Wifi, WifiOff, Radio, Zap } from 'lucide-react';

const VAD_STYLES = {
  SPEAKING:  { dot: 'bg-emerald-400', label: 'Speaking', text: 'text-emerald-300' },
  SILENCE:   { dot: 'bg-amber-400',   label: 'Silence',  text: 'text-amber-300' },
  BARGE_IN:  { dot: 'bg-crimson-400', label: 'Barge-In', text: 'text-crimson-300' },
  IDLE:      { dot: 'bg-slate-400',   label: 'Idle',     text: 'text-slate-300' },
};

export function TelemetryPill({ vadStatus, ttfa, bargeInActive, connected }) {
  const vad = VAD_STYLES[vadStatus] || VAD_STYLES.IDLE;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md text-white border-b border-white/10 select-none">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-3 sm:px-6 py-2 text-xs font-mono gap-2">

        {/* VAD status */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${vad.dot} animate-pulse`} />
          <span className="text-slate-300 font-semibold truncate">
            VAD: <span className={vad.text}>{vad.label}</span>
          </span>
        </div>

        {/* TTFA & Barge-in Status */}
        <div className="flex items-center gap-3 text-center truncate">
          <div className="tabular">
            <span className="text-slate-400">TTFA: </span>
            <span className={ttfa ? 'text-emerald-400 font-bold' : 'text-slate-500 font-medium'}>
              {ttfa ? `${ttfa}ms` : '—'}
            </span>
          </div>

          <div className="hidden xs:flex items-center gap-1">
            <Zap className="icon-scalable" style={{ width: '1em', height: '1em' }} />
            <span className={bargeInActive ? 'text-amber-400 font-bold' : 'text-slate-400'}>
              Barge-In: {bargeInActive ? 'Active' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Noise Filter + Connection status */}
        <div className="flex items-center gap-2.5 justify-end flex-shrink-0">
          <span className="hidden sm:flex items-center gap-1 text-emerald-400 text-xs">
            <Radio className="icon-scalable" style={{ width: '1em', height: '1em' }} strokeWidth={2.5} />
            <span>WebRTC Noise: ON</span>
          </span>
          <div className="flex items-center gap-1.5">
            {connected ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <Wifi className="icon-scalable" style={{ width: '1.1em', height: '1.1em' }} strokeWidth={2} />
                <span className="hidden md:inline">Connected</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-crimson-400 font-semibold">
                <WifiOff className="icon-scalable" style={{ width: '1.1em', height: '1.1em' }} strokeWidth={2} />
                <span className="hidden md:inline">Offline</span>
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
