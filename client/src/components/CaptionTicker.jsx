import React, { useEffect, useRef, useState } from 'react';

const PLACEHOLDER = {
  IDLE:       'Ready to listen. Tap the microphone to begin dictation…',
  LISTENING:  'Listening for speech in chosen language…',
  EXTRACTING: 'Extracting structured record & checking clinical safety rules…',
  SPEAKING:   'Streaming audio read-back… Speak anytime to barge-in',
  BARGE_IN:   'Interrupted! Listening for field corrections…',
};

export function CaptionTicker({ text, appState }) {
  const [displayed, setDisplayed] = useState('');
  const [animKey, setAnimKey]     = useState(0);
  const prevText                  = useRef('');

  useEffect(() => {
    if (text !== prevText.current) {
      prevText.current = text;
      setDisplayed(text);
      setAnimKey(k => k + 1);
    }
  }, [text]);

  const showText    = displayed || '';
  const placeholder = PLACEHOLDER[appState] || PLACEHOLDER.IDLE;
  const isEmpty     = !showText;

  return (
    <div
      className="
        w-full px-4 py-3
        bg-white rounded-2xl border border-ink-faint/60
        shadow-card min-h-[3.25rem]
        flex items-center overflow-hidden
        transition-all duration-300 ease-spring
      "
    >
      <p
        key={animKey}
        className="
          text-fluid-sm font-medium leading-relaxed w-full
          tabular line-clamp-2 animate-ticker-in
        "
        style={{ color: isEmpty ? '#64748B' : '#1E293B' }}
      >
        {isEmpty
          ? <span className="italic text-ink-muted">{placeholder}</span>
          : <span className="font-semibold text-ink-DEFAULT">{showText}</span>
        }
      </p>
    </div>
  );
}
