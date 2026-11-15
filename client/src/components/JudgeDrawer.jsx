import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Play, FlaskConical, Languages, AlertTriangle, Edit3, X } from 'lucide-react';

export const TEST_SCRIPTS = [
  {
    id: 'code_mixed',
    Icon: Languages,
    tag: 'Multilingual',
    tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
    label: 'Code-Mixed ANC Visit',
    description: 'Kannada + Hindi · weight · vaccination · next visit',
    transcript: 'Lakshmi ka ID ek sau ek hai. ANC visit. Weight teen point do kilo. TT injection due. Next visit pandrah din baad.',
    language: 'hi',
  },
  {
    id: 'barge_in',
    Icon: Edit3,
    tag: 'Barge-In',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Weight Correction',
    description: 'Interrupt mid-sentence to correct a field value',
    transcript: 'Nahi, weight galat hai. Correct weight do point aath kilo hai.',
    language: 'hi',
  },
  {
    id: 'danger',
    Icon: AlertTriangle,
    tag: 'Danger Sign',
    tagColor: 'bg-crimson-50 text-crimson-700 border-crimson-200',
    label: 'Newborn Danger Sign',
    description: 'Triggers PHC escalation · clinical safety shield',
    transcript: 'ID-105 ke newborn ko tez bukhar hai aur saans lene mein takleef ho rahi hai. Doodh bhi nahi pee raha.',
    language: 'hi',
  },
];

/**
 * JudgeDrawer component supports both inline collapsible mode (Mobile/Desktop)
 * and slide-over panel mode (Tablet).
 */
export function JudgeDrawer({
  onTest,
  defaultOpen = false,
  isSlideOver = false,
  isOpen = false,
  onClose,
}) {
  const [open, setOpen] = useState(defaultOpen);

  // If in slide-over mode (typically on tablet)
  if (isSlideOver) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end pointer-events-none">
        {/* Semi-transparent non-blocking overlay backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-ink-DEFAULT/30 backdrop-blur-xs transition-opacity duration-300 pointer-events-auto"
          aria-hidden="true"
        />

        {/* Slide-over panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Judge Quick-Test Scripts"
          className="
            relative w-full max-w-md bg-white h-full shadow-2xl border-l border-purple-200
            flex flex-col pane-scroll pointer-events-auto animate-slide-up sm:animate-none
            transition-transform duration-300 ease-spring
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-purple-700 text-white border-b border-purple-800">
            <div className="flex items-center gap-2.5">
              <FlaskConical className="icon-scalable" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2} />
              <div>
                <div className="font-bold text-fluid-body leading-tight">Judge Test Scripts</div>
                <div className="text-purple-200 text-fluid-xs">Tablet Slide-Over Panel</div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ touchAction: 'manipulation' }}
              aria-label="Close Judge Drawer"
              className="touch-target p-2 rounded-xl text-purple-200 hover:text-white hover:bg-purple-600 transition-colors"
            >
              <X className="icon-scalable" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2.5} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 space-y-3 bg-purple-50/70 overflow-y-auto pane-scroll">
            <p className="text-purple-700 text-fluid-xs font-medium px-1 leading-relaxed">
              Synthetic beneficiaries <strong className="text-purple-900 font-bold">ID-101…ID-110</strong>.
              Tap <strong>Run Test</strong> to simulate voice transcript streaming and verify live extraction alongside voice capture.
            </p>

            {TEST_SCRIPTS.map(({ id, Icon, tag, tagColor, label, description, transcript, language }) => (
              <div
                key={id}
                className="bg-white rounded-2xl border border-purple-100 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-100">
                    <Icon className="icon-scalable text-purple-700" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-purple-950 text-fluid-sm">{label}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${tagColor}`}>
                        {tag}
                      </span>
                    </div>
                    <div className="text-purple-600 text-fluid-xs font-medium">{description}</div>
                  </div>
                </div>

                <div className="bg-purple-50/80 rounded-xl p-3 border border-purple-100">
                  <p className="text-xs font-mono text-slate-700 italic leading-relaxed">
                    "{transcript}"
                  </p>
                </div>

                <button
                  onClick={() => {
                    onTest(transcript, language);
                    if (onClose) onClose();
                  }}
                  style={{ touchAction: 'manipulation' }}
                  className="
                    touch-target w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    bg-purple-700 hover:bg-purple-800 active:scale-98
                    text-white text-fluid-xs font-bold min-h-12 min-w-12
                    transition-all duration-150 ease-spring shadow-sm
                  "
                >
                  <Play className="icon-scalable" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2.5} />
                  <span>Run Test</span>
                </button>
              </div>
            ))}

            <div className="text-purple-600 text-fluid-xs p-2 leading-relaxed bg-white rounded-xl border border-purple-100">
              <strong className="text-purple-800">Seeded Beneficiaries:</strong>{' '}
              Lakshmi (101), Meena (102), Priya (103), Kavitha (104), Anita (105),
              Sunita (106), Fatima (107), Radha (108), Pushpa (109), Sarala (110)
            </div>
          </div>
        </aside>
      </div>
    );
  }

  // Inline collapsible mode (Mobile & Desktop)
  return (
    <div className="w-full rounded-3xl overflow-hidden border border-purple-200/80 shadow-card bg-white">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ touchAction: 'manipulation' }}
        className="
          touch-target w-full bg-purple-700 text-white
          px-5 py-3.5 flex items-center gap-3
          hover:bg-purple-800 active:bg-purple-900
          transition-colors duration-150 select-none
        "
        aria-expanded={open}
      >
        <FlaskConical className="icon-scalable flex-shrink-0" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2} />
        <span className="font-bold text-fluid-sm flex-1 text-left">Judge Quick-Test Scripts</span>
        <span className="bg-purple-500/80 text-purple-100 text-xs px-2.5 py-0.5 rounded-full font-bold">
          3 Scenarios
        </span>
        {open
          ? <ChevronUp  className="icon-scalable flex-shrink-0 text-purple-200" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2} />
          : <ChevronDown className="icon-scalable flex-shrink-0 text-purple-200" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2} />
        }
      </button>

      {/* Drawer content */}
      {open && (
        <div className="bg-purple-50/70 p-4 space-y-3 animate-slide-up">
          <p className="text-purple-700 text-fluid-xs font-medium px-1 leading-relaxed">
            Synthetic beneficiaries <strong className="text-purple-900 font-bold">ID-101…ID-110</strong>.
            Tap <strong>Run Test</strong> to simulate voice transcript → real-time clinical extraction.
          </p>

          {TEST_SCRIPTS.map(({ id, Icon, tag, tagColor, label, description, transcript, language }) => (
            <div
              key={id}
              className="bg-white rounded-2xl border border-purple-100 p-4 shadow-sm space-y-2.5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-100">
                  <Icon className="icon-scalable text-purple-700" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-bold text-purple-950 text-fluid-sm">{label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tagColor}`}>
                      {tag}
                    </span>
                  </div>
                  <div className="text-purple-600 text-fluid-xs">{description}</div>
                </div>
              </div>

              {/* Transcript preview */}
              <div className="bg-purple-50 rounded-xl px-3.5 py-2.5 border border-purple-100/90">
                <p className="text-xs font-mono text-slate-700 italic leading-relaxed line-clamp-3">
                  "{transcript}"
                </p>
              </div>

              {/* Run button — strictly 48×48 min touch target with gap-2 */}
              <div className="pt-1">
                <button
                  onClick={() => onTest(transcript, language)}
                  style={{ touchAction: 'manipulation' }}
                  className="
                    touch-target w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                    bg-purple-700 hover:bg-purple-800 active:scale-95
                    text-white text-fluid-xs font-bold min-h-12 min-w-12
                    transition-all duration-150 ease-spring shadow-sm
                  "
                >
                  <Play className="icon-scalable" style={{ width: '1.25em', height: '1.25em' }} strokeWidth={2.5} />
                  <span>Run Test</span>
                </button>
              </div>
            </div>
          ))}

          {/* Beneficiary index */}
          <div className="text-purple-500 text-xs px-1 pt-1 leading-relaxed">
            <strong className="text-purple-700">Seeded:</strong>{' '}
            Lakshmi (101), Meena (102), Priya (103), Kavitha (104), Anita (105),
            Sunita (106), Fatima (107), Radha (108), Pushpa (109), Sarala (110)
          </div>
        </div>
      )}
    </div>
  );
}
