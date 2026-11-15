import { useRef, useState, useCallback } from 'react';

const VAD_SILENCE_MS = 700;
const BARGE_IN_THRESHOLD = 0.015; // RMS threshold for barge-in
const BARGE_IN_CONFIRM_MS = 150;  // Must sustain voice for 150ms

export function useVoiceStream({ send, sendBinary, connected, onBargeIn, onSilence }) {
  const [isRecording, setIsRecording] = useState(false);
  const [vadStatus, setVadStatus] = useState('IDLE'); // IDLE | SPEAKING | SILENCE | BARGE_IN
  const [ttfa, setTtfa] = useState(null);
  const [noiseFilterOn] = useState(true);

  const audioCtxRef = useRef(null);
  const workletRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const bargeInTimerRef = useRef(null);
  const ttsPlayerRef = useRef(null); // { sourceNode, playing }
  const recordingStartRef = useRef(null);
  const bargeInActiveRef = useRef(false);
  const vadStatusRef = useRef('IDLE');

  const stopTTS = useCallback(() => {
    if (ttsPlayerRef.current?.playing) {
      try { ttsPlayerRef.current.sourceNode?.stop(); } catch {}
      ttsPlayerRef.current.playing = false;
    }
    ttsPlayerRef.current = null;
  }, []);

  const handlePCMFrame = useCallback((pcm, rms) => {
    // Forward audio to server
    sendBinary(pcm);

    // VAD logic
    const isSpeaking = rms > 0.01;

    // Barge-in detection during TTS playback
    if (ttsPlayerRef.current?.playing && rms > BARGE_IN_THRESHOLD) {
      if (!bargeInActiveRef.current) {
        if (!bargeInTimerRef.current) {
          bargeInTimerRef.current = setTimeout(() => {
            // Confirmed barge-in
            bargeInActiveRef.current = true;
            stopTTS();
            send({ type: 'BARGE_IN_INTERRUPT' });
            setVadStatus('BARGE_IN');
            vadStatusRef.current = 'BARGE_IN';
            onBargeIn?.();
            bargeInTimerRef.current = null;
          }, BARGE_IN_CONFIRM_MS);
        }
      }
    } else {
      clearTimeout(bargeInTimerRef.current);
      bargeInTimerRef.current = null;
    }

    // Regular VAD silence detection
    if (isSpeaking) {
      setVadStatus('SPEAKING');
      vadStatusRef.current = 'SPEAKING';
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    } else if (!silenceTimerRef.current && vadStatusRef.current !== 'IDLE') {
      setVadStatus('SILENCE');
      vadStatusRef.current = 'SILENCE';
      silenceTimerRef.current = setTimeout(() => {
        send({ type: 'VAD_SILENCE' });
        onSilence?.();
        silenceTimerRef.current = null;
      }, VAD_SILENCE_MS);
    }
  }, [send, sendBinary, onBargeIn, onSilence, stopTTS]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioCtxRef.current = ctx;

      await ctx.audioWorklet.addModule('/pcm-processor.js');
      const worklet = new AudioWorkletNode(ctx, 'pcm-processor');
      workletRef.current = worklet;

      worklet.port.onmessage = (e) => {
        if (e.data.type === 'PCM_FRAME') {
          handlePCMFrame(e.data.pcm, e.data.rms);
        }
      };

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(worklet);
      // Connect to destination to keep worklet alive in some browsers
      worklet.connect(ctx.destination);

      recordingStartRef.current = Date.now();
      setIsRecording(true);
      vadStatusRef.current = 'SILENCE';
      setVadStatus('SILENCE');
      send({ type: 'RECORDING_START' });
    } catch (err) {
      console.error('Mic access error:', err);
      throw err;
    }
  }, [isRecording, handlePCMFrame, send]);

  const stopRecording = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    clearTimeout(bargeInTimerRef.current);
    silenceTimerRef.current = null;
    bargeInTimerRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    sourceRef.current?.disconnect();
    workletRef.current?.disconnect();
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    workletRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
    vadStatusRef.current = 'IDLE';
    setVadStatus('IDLE');
    send({ type: 'RECORDING_STOP' });
  }, [send]);

  const playTTSChunk = useCallback(async (base64Audio) => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      if (!audioCtxRef.current) audioCtxRef.current = ctx;

      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const buffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      if (!ttsPlayerRef.current?.playing) {
        setTtfa(Date.now() - (recordingStartRef.current || Date.now()));
      }

      ttsPlayerRef.current = { sourceNode: source, playing: true };
      source.start();
      source.onended = () => {
        if (ttsPlayerRef.current?.sourceNode === source) {
          ttsPlayerRef.current = null;
          bargeInActiveRef.current = false;
        }
      };
    } catch (err) {
      console.error('TTS playback error:', err);
    }
  }, []);

  return {
    isRecording,
    vadStatus,
    ttfa,
    noiseFilterOn,
    startRecording,
    stopRecording,
    playTTSChunk,
    stopTTS
  };
}

