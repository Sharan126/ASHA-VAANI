import { useRef, useState, useCallback, useEffect } from 'react';

// Map app language codes → BCP-47 locales for Web Speech API
const LANG_MAP = {
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  en: 'en-IN'
};

export function useSpeechRecognition({ language, onInterim, onFinal, onVadChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [supported] = useState(() =>
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  const recogRef = useRef(null);
  const stoppedManually = useRef(false);
  const languageRef = useRef(language);
  languageRef.current = language;

  const stop = useCallback(() => {
    stoppedManually.current = true;
    recogRef.current?.stop();
    recogRef.current = null;
    setIsRecording(false);
    onVadChange?.('IDLE');
  }, [onVadChange]);

  const start = useCallback(() => {
    if (!supported) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }
    if (recogRef.current) return; // already running

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recog = new SR();

    recog.lang = LANG_MAP[languageRef.current] || 'hi-IN';
    recog.continuous = true;        // keep listening until manually stopped
    recog.interimResults = true;    // stream partial results
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      stoppedManually.current = false;
      setIsRecording(true);
      onVadChange?.('SILENCE');
    };

    recog.onspeechstart = () => onVadChange?.('SPEAKING');
    recog.onspeechend  = () => onVadChange?.('SILENCE');

    recog.onresult = (e) => {
      let interim = '';
      let finalText = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (interim)    onInterim?.(interim);
      if (finalText)  onFinal?.(finalText.trim());
    };

    recog.onerror = (e) => {
      // 'no-speech' and 'aborted' are non-fatal
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('[SpeechRecognition] error:', e.error);
      }
    };

    recog.onend = () => {
      // Chrome stops after a silence; auto-restart unless stopped manually
      if (!stoppedManually.current) {
        try {
          recog.lang = LANG_MAP[languageRef.current] || 'hi-IN';
          recog.start();
        } catch {}
      } else {
        recogRef.current = null;
        setIsRecording(false);
        onVadChange?.('IDLE');
      }
    };

    recogRef.current = recog;
    try {
      recog.start();
    } catch (err) {
      console.error('[SpeechRecognition] start error:', err);
    }
  }, [supported, onInterim, onFinal, onVadChange]);

  // Clean up on unmount
  useEffect(() => () => stop(), [stop]);

  return { isRecording, supported, start, stop };
}

