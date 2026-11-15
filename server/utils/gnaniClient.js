'use strict';

/**
 * gnaniClient.js — Gnani ASR/TTS client with mock mode for development
 *
 * Live mode: Connects to Gnani WebSocket APIs using the GNANI_API_KEY.
 * Mock mode: Activated when GNANI_API_KEY is unset or equals placeholder.
 *   - Simulates ASR by returning canned transcript after 1.5s delay
 *   - Simulates TTS by returning a minimal valid WAV file
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

// ---------------------------------------------------------------------------
// Mock WAV generator — produces a 0.5s silent 16kHz mono 16-bit WAV
// ---------------------------------------------------------------------------
function generateSilentWAV() {
  const sampleRate = 16000;
  const durationSeconds = 0.5;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize, 0);

  // RIFF header
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8, 'ascii');

  // fmt chunk
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);              // Chunk size
  buffer.writeUInt16LE(1, 20);               // PCM format
  buffer.writeUInt16LE(numChannels, 22);     // Channels
  buffer.writeUInt32LE(sampleRate, 24);      // Sample rate
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // Byte rate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // Block align
  buffer.writeUInt16LE(bitsPerSample, 34);   // Bits per sample

  // data chunk
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);
  // Remaining bytes are already 0 (silent)

  return buffer;
}

// ---------------------------------------------------------------------------
// Mock transcript samples for realistic simulation
// ---------------------------------------------------------------------------
const MOCK_TRANSCRIPT_SAMPLES = [
  'Patient name Lakshmi Devi ID one zero one weight two point eight kilo next visit fifteen days',
  'Sunita Yadav ID one zero three ANC visit weight forty five kg vaccinations TT injection IFA tablets',
  'Meena Raju ID one zero four delivery ke baad PNC visit baby aacha hai weight three kilo',
  'ID one zero seven Kavitha Reddy gestational diabetes check immunization visit OPV polio vaccine',
  'Fatima Begum ID one zero five severe headache sujan haath paon khoon ana symptoms',
  'Rukmini Bai ID one one zero Vitamin A supplement given next visit next Monday home visit'
];

let mockSampleIndex = 0;

// ---------------------------------------------------------------------------
// Mock ASR Session
// ---------------------------------------------------------------------------
class MockASRSession extends EventEmitter {
  constructor(wsClient, sessionId) {
    super();
    this.wsClient = wsClient;
    this.sessionId = sessionId;
    this.audioChunkCount = 0;
    this.interimTimer = null;
    this.finalTimer = null;
    this.active = true;
  }

  /**
   * Process an incoming audio chunk (base64 encoded)
   */
  processAudioChunk(base64Data) {
    if (!this.active) return;
    this.audioChunkCount++;

    // Emit interim transcript every ~5 chunks
    if (this.audioChunkCount % 5 === 0) {
      clearTimeout(this.interimTimer);
      this.interimTimer = setTimeout(() => {
        if (!this.active) return;
        const sample = MOCK_TRANSCRIPT_SAMPLES[mockSampleIndex % MOCK_TRANSCRIPT_SAMPLES.length];
        const words = sample.split(' ');
        const partial = words.slice(0, Math.min(5, words.length)).join(' ');
        this.emit('transcript', {
          type: 'TRANSCRIPT',
          text: partial + '...',
          isFinal: false,
          language: 'en'
        });
      }, 300);
    }
  }

  /**
   * Trigger end-of-utterance processing (called on VAD_SILENCE)
   */
  triggerEndOfUtterance() {
    if (!this.active) return;

    clearTimeout(this.interimTimer);
    clearTimeout(this.finalTimer);

    this.finalTimer = setTimeout(() => {
      if (!this.active) return;
      const sample = MOCK_TRANSCRIPT_SAMPLES[mockSampleIndex % MOCK_TRANSCRIPT_SAMPLES.length];
      mockSampleIndex++;

      this.emit('transcript', {
        type: 'TRANSCRIPT',
        text: sample,
        isFinal: true,
        language: 'en'
      });
    }, 1500); // 1.5s delay as specified
  }

  destroy() {
    this.active = false;
    clearTimeout(this.interimTimer);
    clearTimeout(this.finalTimer);
    this.removeAllListeners();
  }
}

// ---------------------------------------------------------------------------
// Live ASR Session (Gnani WebSocket)
// ---------------------------------------------------------------------------
class LiveASRSession extends EventEmitter {
  constructor(wsClient, sessionId) {
    super();
    this.wsClient = wsClient;
    this.sessionId = sessionId;
    this.gnaniWs = null;
    this.connected = false;
    this.pendingChunks = [];
    this._connect();
  }

  _connect() {
    const url = process.env.GNANI_ASR_WS_URL;
    const apiKey = process.env.GNANI_API_KEY;

    try {
      this.gnaniWs = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey
        }
      });

      this.gnaniWs.on('open', () => {
        this.connected = true;
        console.log(`[GnaniASR] Connected for session ${this.sessionId}`);
        // Send config
        this.gnaniWs.send(JSON.stringify({
          type: 'config',
          sampleRate: 16000,
          encoding: 'LINEAR16',
          language: 'kn-IN'
        }));
        // Flush pending chunks
        for (const chunk of this.pendingChunks) {
          this.gnaniWs.send(Buffer.from(chunk, 'base64'));
        }
        this.pendingChunks = [];
      });

      this.gnaniWs.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.transcript || msg.text) {
            this.emit('transcript', {
              type: 'TRANSCRIPT',
              text: msg.transcript || msg.text,
              isFinal: msg.isFinal || msg.is_final || false,
              language: msg.language || 'kn'
            });
          }
        } catch (e) {
          console.error('[GnaniASR] Parse error:', e.message);
        }
      });

      this.gnaniWs.on('error', (err) => {
        console.error('[GnaniASR] WebSocket error:', err.message);
        this.emit('error', err);
      });

      this.gnaniWs.on('close', () => {
        this.connected = false;
        console.log(`[GnaniASR] Connection closed for session ${this.sessionId}`);
      });
    } catch (err) {
      console.error('[GnaniASR] Failed to connect:', err.message);
    }
  }

  processAudioChunk(base64Data) {
    if (!this.gnaniWs || !this.connected) {
      this.pendingChunks.push(base64Data);
      return;
    }
    try {
      this.gnaniWs.send(Buffer.from(base64Data, 'base64'));
    } catch (err) {
      console.error('[GnaniASR] Send error:', err.message);
    }
  }

  triggerEndOfUtterance() {
    if (this.gnaniWs && this.connected) {
      try {
        this.gnaniWs.send(JSON.stringify({ type: 'end_of_utterance' }));
      } catch (err) {
        console.error('[GnaniASR] EOUTrigger error:', err.message);
      }
    }
  }

  destroy() {
    if (this.gnaniWs) {
      try { this.gnaniWs.close(); } catch (_) {}
    }
    this.removeAllListeners();
  }
}

// ---------------------------------------------------------------------------
// Factory: createGnaniASRSession
// ---------------------------------------------------------------------------
function isMockMode() {
  const key = process.env.GNANI_API_KEY;
  // Force mock if key is placeholder OR if GNANI_MOCK=true is set
  return !key || key === 'your_gnani_api_key_here' || process.env.GNANI_MOCK === 'true';
}

/**
 * Creates an ASR session (mock or live depending on GNANI_API_KEY).
 *
 * @param {WebSocket} wsClient - The client WebSocket connection
 * @param {string} sessionId - Unique session identifier
 * @returns {MockASRSession|LiveASRSession} session object with processAudioChunk(), triggerEndOfUtterance(), destroy()
 */
function createGnaniASRSession(wsClient, sessionId) {
  if (isMockMode()) {
    console.log(`[GnaniClient] Using MOCK ASR for session ${sessionId}`);
    return new MockASRSession(wsClient, sessionId);
  }
  console.log(`[GnaniClient] Using LIVE Gnani ASR for session ${sessionId}`);
  return new LiveASRSession(wsClient, sessionId);
}

// ---------------------------------------------------------------------------
// TTS: synthesizeTTS
// ---------------------------------------------------------------------------

/**
 * Synthesize text-to-speech audio.
 *
 * @param {string} text - Text to synthesize
 * @param {string} language - Language code: 'kn'|'hi'|'ta'|'te'|'en'
 * @param {WebSocket} wsClient - Client WebSocket (for streaming chunks)
 * @returns {Promise<{ chunks: Buffer[], done: boolean }>}
 */
async function synthesizeTTS(text, language, wsClient) {
  if (isMockMode()) {
    console.log(`[GnaniTTS] Mock TTS: "${text.substring(0, 50)}..." lang=${language}`);

    const wavBuffer = generateSilentWAV();
    // Split WAV into ~4KB chunks to simulate streaming
    const CHUNK_SIZE = 4096;
    const chunks = [];

    for (let offset = 0; offset < wavBuffer.length; offset += CHUNK_SIZE) {
      chunks.push(wavBuffer.slice(offset, offset + CHUNK_SIZE));
    }

    return { chunks, done: true };
  }

  // Live Gnani TTS via WebSocket
  return new Promise((resolve, reject) => {
    const url = process.env.GNANI_TTS_WS_URL;
    const apiKey = process.env.GNANI_API_KEY;
    const chunks = [];

    let gnaniWs;
    try {
      gnaniWs = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey
        }
      });
    } catch (err) {
      return reject(err);
    }

    const timeout = setTimeout(() => {
      try { gnaniWs.close(); } catch (_) {}
      reject(new Error('TTS timeout'));
    }, 15000);

    gnaniWs.on('open', () => {
      gnaniWs.send(JSON.stringify({
        type: 'synthesize',
        text,
        language: language || 'kn',
        voice: 'female',
        format: 'wav',
        sampleRate: 16000
      }));
    });

    gnaniWs.on('message', (data) => {
      if (Buffer.isBuffer(data)) {
        chunks.push(data);
      } else {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'done' || msg.done) {
            clearTimeout(timeout);
            gnaniWs.close();
            resolve({ chunks, done: true });
          } else if (msg.type === 'error') {
            clearTimeout(timeout);
            gnaniWs.close();
            reject(new Error(msg.message || 'TTS error'));
          }
        } catch (_) {
          // Binary frame that couldn't parse as JSON — treat as audio chunk
          chunks.push(Buffer.from(data));
        }
      }
    });

    gnaniWs.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    gnaniWs.on('close', () => {
      clearTimeout(timeout);
      if (chunks.length > 0) resolve({ chunks, done: true });
      else reject(new Error('TTS closed without data'));
    });
  });
}

module.exports = { createGnaniASRSession, synthesizeTTS };
