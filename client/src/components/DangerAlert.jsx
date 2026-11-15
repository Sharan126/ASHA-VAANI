import React from 'react';
import { ShieldAlert, Phone, ArrowRight } from 'lucide-react';

const FLAG_LABELS = {
  MAT_BLEEDING:          'Maternal Bleeding (Mod 6)',
  MAT_PREECLAMPSIA:      'Pre-eclampsia / Convulsions (Mod 6)',
  NB_HIGH_FEVER:         'Newborn High Fever / Hypothermia (Mod 7)',
  NB_BREATHING_FEEDING:  'Newborn Breathing / Inability to Feed (Mod 7)',
};

export function DangerAlert({ flags, urgentMessage }) {
  if (!flags?.length) return null;

  return (
    <aside
      aria-label="Clinical Danger Alert"
      className="w-full my-3 rounded-3xl overflow-hidden shadow-card-elevated border-2 border-crimson-600 animate-danger-in"
    >
      {/* Header stripe */}
      <div className="bg-crimson-600 px-4 sm:px-5 py-3.5 flex items-center gap-3 animate-shield-pulse">
        <div className="w-12 h-12 bg-crimson-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
          <ShieldAlert className="icon-scalable text-white animate-shield-pulse" style={{ width: '1.5em', height: '1.5em' }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-black text-fluid-body tracking-wide leading-tight">
            ⚠ DANGER SIGN DETECTED
          </div>
          <div className="text-crimson-100 text-fluid-xs font-semibold mt-0.5 truncate">
            NHM Clinical Safety Shield · Immediate PHC Referral Required
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="bg-crimson-50/95 border-t border-crimson-200 px-4 sm:px-5 py-4 space-y-3.5">
        {/* Urgent message */}
        {urgentMessage && (
          <p className="text-crimson-950 font-bold text-fluid-body leading-relaxed bg-white/70 p-3 rounded-2xl border border-crimson-200">
            {urgentMessage}
          </p>
        )}

        {/* Flag pills */}
        <div className="flex flex-wrap gap-2">
          {flags.map(f => (
            <span
              key={f}
              className="bg-crimson-100 text-crimson-900 text-fluid-xs font-bold px-3.5 py-1.5 rounded-full border border-crimson-300 shadow-xs"
            >
              {FLAG_LABELS[f] || f}
            </span>
          ))}
        </div>

        {/* Action strip — touch accessible */}
        <a
          href="tel:108"
          style={{ touchAction: 'manipulation' }}
          className="touch-target w-full bg-crimson-600 hover:bg-crimson-700 active:bg-crimson-800 text-white rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors shadow-sm select-none"
        >
          <Phone className="icon-scalable text-crimson-100" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2.5} />
          <span className="text-fluid-sm font-black flex-1 text-left">
            Call PHC / 108 Ambulance Immediately
          </span>
          <ArrowRight className="icon-scalable text-crimson-200" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2.5} />
        </a>
      </div>
    </aside>
  );
}
