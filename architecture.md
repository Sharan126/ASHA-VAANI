# ASHA-Vaani Architecture Blueprint

## Stack
- Backend: Node.js + Express + ws (WebSocket)
- Frontend: React 18 PWA + Vite + TailwindCSS
- ASR/TTS: Gnani.ai Streaming APIs (WebSocket bridge)
- LLM: Gemini Flash (strict JSON extraction, temperature 0)

## Key Modules
- server/index.js           → Express + WS gateway
- server/utils/normalizer.js → Deterministic post-STT normalization
- server/utils/dangerSignEngine.js → NHM clinical safety shield
- server/utils/llmExtractor.js → Structured field extraction
- server/utils/gnaniClient.js → Gnani ASR/TTS bridge
- server/data/beneficiaries.js → Synthetic seed data ID-101..ID-110
- client/src/App.jsx        → Main React PWA
- client/src/hooks/useVoiceStream.js → WebRTC + AudioWorklet + VAD
- client/src/components/   → RecordCard, DangerAlert, TelemetryPill, JudgeDrawer
