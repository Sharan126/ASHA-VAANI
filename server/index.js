'use strict';

/**
 * ASHA-Vaani — Main Server Entry Point
 * Node.js + Express + WebSocket gateway for ASHA field voice AI system
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { beneficiaries } = require('./data/beneficiaries');
const { normalizeTranscript, fuzzyMatchBeneficiary, normalizeBeneficiaryId } = require('./utils/normalizer');
const { analyzeDangerSigns } = require('./utils/dangerSignEngine');
const { extractFields } = require('./utils/llmExtractor');
const { createGnaniASRSession, synthesizeTTS } = require('./utils/gnaniClient');

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: '*' }));
app.use(express.json());

const fs = require('fs');

// Serve built client if it exists (production)
const clientPublicPath = path.resolve(__dirname, 'public');
const clientDistPath = path.resolve(__dirname, '../client/dist');
const staticPath = fs.existsSync(clientPublicPath) ? clientPublicPath : clientDistPath;
try {
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    console.log(`[Server] Serving static client from ${staticPath}`);
  }
} catch (_) {}

// ---------------------------------------------------------------------------
// Active sessions tracker
// ---------------------------------------------------------------------------
const activeSessions = new Map();

// ---------------------------------------------------------------------------
// REST endpoints
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessions: activeSessions.size
  });
});

app.get('/api/beneficiaries', (req, res) => {
  const sanitized = beneficiaries.map(b => ({
    id: b.id,
    name: b.name,
    age: b.age,
    village: b.village,
    lastVisitDate: b.lastVisitDate,
    gestationWeeks: b.gestationWeeks,
    language: b.language
  }));
  res.json({ beneficiaries: sanitized });
});

// Fallback to index.html for SPA
app.get('*', (req, res, next) => {
  const indexPath = path.resolve(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// ---------------------------------------------------------------------------
// HTTP Server + WebSocket Server
// ---------------------------------------------------------------------------
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ---------------------------------------------------------------------------
// Sanitized beneficiary list for client (omit internal fields)
// ---------------------------------------------------------------------------
function getSanitizedBeneficiaries() {
  return beneficiaries.map(b => ({
    id: b.id,
    name: b.name,
    age: b.age,
    village: b.village,
    lastVisitDate: b.lastVisitDate,
    gestationWeeks: b.gestationWeeks,
    language: b.language
  }));
}

// ---------------------------------------------------------------------------
// Safe send helper
// ---------------------------------------------------------------------------
function safeSend(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error('[WS] Send error:', err.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Build TTS confirmation text from extraction result
// ---------------------------------------------------------------------------
function buildConfirmationText(record, language, dangerResult) {
  if (dangerResult && dangerResult.isHighRisk) {
    return dangerResult.urgentMessage;
  }

  const parts = [];

  if (record.beneficiary_id) parts.push(`Patient ${record.beneficiary_id}`);
  if (record.visit_type) parts.push(`Visit type: ${record.visit_type}`);
  if (record.weight_kg) parts.push(`Weight: ${record.weight_kg} kg`);
  if (record.vaccinations_due && record.vaccinations_due.length > 0) {
    parts.push(`Vaccinations: ${record.vaccinations_due.join(', ')}`);
  }
  if (record.next_visit_date) {
    const d = new Date(record.next_visit_date);
    const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    parts.push(`Next visit: ${dateStr}`);
  }
  if (record.is_correction) {
    parts.push('Correction applied');
  }

  if (parts.length === 0) return 'Record noted. Please continue.';

  const summary = parts.join('. ') + '.';
  return `Recorded: ${summary}`;
}

// ---------------------------------------------------------------------------
// Pipeline: process final transcript
// ---------------------------------------------------------------------------
async function processTranscript(session, rawText) {
  const { ws, sessionId, language, currentRecord } = session;

  try {
    // Step a: Normalize
    const normalizedText = normalizeTranscript(rawText, language);

    // Step b: Fuzzy match beneficiary if not set
    let tempRecord = { ...currentRecord };
    if (!tempRecord.beneficiary_id) {
      const idMatch = normalizeBeneficiaryId(normalizedText);
      if (idMatch) tempRecord.beneficiary_id = idMatch;
      else {
        const nameMatch = fuzzyMatchBeneficiary(normalizedText);
        if (nameMatch) tempRecord.beneficiary_id = nameMatch.id;
      }
    }

    // Step c: Danger sign check
    const dangerResult = analyzeDangerSigns(normalizedText, [], language);

    // Step d: LLM extraction
    const extracted = await extractFields(normalizedText, tempRecord, language);

    // Step e: Apply danger sign flags
    if (dangerResult.isHighRisk) {
      extracted.reported_symptoms = [
        ...(extracted.reported_symptoms || []),
        ...dangerResult.flags
      ];
    }

    // Update session record
    session.currentRecord = {
      ...tempRecord,
      ...Object.fromEntries(
        Object.entries(extracted).filter(([k, v]) =>
          v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)
        )
      )
    };

    // Step f: Build TTS confirmation text
    const confirmText = buildConfirmationText(session.currentRecord, language, dangerResult);

    // Step g: Send extraction result
    safeSend(ws, {
      type: 'EXTRACTION_RESULT',
      record: session.currentRecord,
      isHighRisk: dangerResult.isHighRisk,
      flags: dangerResult.flags,
      urgentMessage: dangerResult.urgentMessage,
      correctedFields: extracted.corrected_fields || []
    });

    // Step h: Synthesize and stream TTS
    try {
      const ttsResult = await synthesizeTTS(confirmText, language, ws);

      for (const chunk of ttsResult.chunks) {
        safeSend(ws, {
          type: 'TTS_CHUNK',
          data: chunk.toString('base64')
        });
      }

      safeSend(ws, { type: 'TTS_COMPLETE' });
    } catch (ttsErr) {
      console.error(`[Session ${sessionId}] TTS error:`, ttsErr.message);
      safeSend(ws, { type: 'TTS_COMPLETE' }); // Always signal completion
    }

  } catch (err) {
    console.error(`[Session ${sessionId}] Pipeline error:`, err.message);
    safeSend(ws, { type: 'ERROR', message: 'Processing error. Please try again.' });
  }
}

// ---------------------------------------------------------------------------
// WebSocket connection handler
// ---------------------------------------------------------------------------
wss.on('connection', (ws, req) => {
  const sessionId = uuidv4();
  const remoteAddr = req.socket.remoteAddress || 'unknown';
  console.log(`[WS] New connection ${sessionId} from ${remoteAddr}`);

  // Initialize session
  const session = {
    sessionId,
    ws,
    language: 'kn', // Default language (Kannada)
    currentRecord: {
      beneficiary_id: null,
      visit_type: null,
      weight_kg: null,
      vaccinations_due: [],
      next_visit_date: null,
      reported_symptoms: [],
      is_correction: false,
      corrected_fields: []
    },
    asrSession: null,
    ttsAborted: false,
    createdAt: Date.now()
  };

  activeSessions.set(sessionId, session);

  // Create ASR session
  session.asrSession = createGnaniASRSession(ws, sessionId);

  // Handle ASR transcript events
  session.asrSession.on('transcript', (event) => {
    if (!event.isFinal) {
      // Interim transcript
      safeSend(ws, { type: 'TRANSCRIPT_INTERIM', text: event.text });
    } else {
      // Final transcript — run full pipeline
      safeSend(ws, { type: 'TRANSCRIPT_FINAL', text: event.text });
      processTranscript(session, event.text).catch(err => {
        console.error(`[Session ${sessionId}] Unhandled pipeline error:`, err);
        safeSend(ws, { type: 'ERROR', message: 'Internal error during processing.' });
      });
    }
  });

  session.asrSession.on('error', (err) => {
    console.error(`[Session ${sessionId}] ASR error:`, err.message);
    safeSend(ws, { type: 'ERROR', message: 'Speech recognition error. Please retry.' });
  });

  // Send session start
  safeSend(ws, {
    type: 'SESSION_START',
    sessionId,
    beneficiaries: getSanitizedBeneficiaries()
  });

  // ---------------------------------------------------------------------------
  // Message handler
  // ---------------------------------------------------------------------------
  ws.on('message', (rawMessage, isBinary) => {
    // Binary frame = raw PCM audio from AudioWorklet — route directly to ASR
    if (isBinary || Buffer.isBuffer(rawMessage) && rawMessage[0] !== 123 /* '{' */) {
      if (session.asrSession) {
        const base64 = Buffer.isBuffer(rawMessage)
          ? rawMessage.toString('base64')
          : Buffer.from(rawMessage).toString('base64');
        session.asrSession.processAudioChunk(base64);
      }
      return;
    }

    let msg;
    try {
      msg = JSON.parse(rawMessage.toString());
    } catch (err) {
      // Silently ignore non-JSON binary that slipped through
      return;
    }

    switch (msg.type) {

      // 1. Audio chunk from client
      case 'AUDIO_CHUNK': {
        if (!msg.data || typeof msg.data !== 'string') {
          safeSend(ws, { type: 'ERROR', message: 'AUDIO_CHUNK must include base64 data field.' });
          return;
        }
        if (session.asrSession) {
          session.asrSession.processAudioChunk(msg.data);
        }
        break;
      }

      // 2. VAD silence detected — trigger end-of-utterance
      case 'VAD_SILENCE': {
        console.log(`[Session ${sessionId}] VAD_SILENCE received — triggering end of utterance`);
        if (session.asrSession) {
          session.asrSession.triggerEndOfUtterance();
        }
        break;
      }

      // 3. Barge-in interrupt — abort current TTS
      case 'BARGE_IN_INTERRUPT': {
        console.log(`[Session ${sessionId}] BARGE_IN_INTERRUPT — aborting TTS`);
        session.ttsAborted = true;
        safeSend(ws, { type: 'TTS_ABORTED' });
        break;
      }

      // 4. Language selection
      case 'LANGUAGE_SELECT': {
        const validLanguages = ['en', 'hi', 'kn', 'ta', 'te'];
        if (!msg.language || !validLanguages.includes(msg.language)) {
          safeSend(ws, { type: 'ERROR', message: `Invalid language. Supported: ${validLanguages.join(', ')}` });
          return;
        }
        session.language = msg.language;
        console.log(`[Session ${sessionId}] Language set to: ${msg.language}`);
        safeSend(ws, { type: 'LANGUAGE_CONFIRMED', language: msg.language });
        break;
      }

      // 5. Record confirmation — finalize/save record
      case 'RECORD_CONFIRM': {
        const record = { ...session.currentRecord };
        record.sessionId = sessionId;
        record.confirmedAt = new Date().toISOString();
        record.language = session.language;

        console.log(`[Session ${sessionId}] Record confirmed:`, JSON.stringify(record));

        // Reset session record for next entry
        session.currentRecord = {
          beneficiary_id: null,
          visit_type: null,
          weight_kg: null,
          vaccinations_due: [],
          next_visit_date: null,
          reported_symptoms: [],
          is_correction: false,
          corrected_fields: []
        };

        safeSend(ws, {
          type: 'RECORD_SAVED',
          record,
          message: 'Record confirmed and saved.'
        });
        break;
      }

      // 6. Manual transcript submit (for testing without audio)
      case 'SIMULATE_TRANSCRIPT':
      case 'MANUAL_TRANSCRIPT': {
        if (!msg.text || typeof msg.text !== 'string') {
          safeSend(ws, { type: 'ERROR', message: 'MANUAL_TRANSCRIPT must include text field.' });
          return;
        }
        if (msg.language) session.language = msg.language;
        safeSend(ws, { type: 'TRANSCRIPT_FINAL', text: msg.text });
        processTranscript(session, msg.text).catch(err => {
          console.error(`[Session ${sessionId}] Manual transcript error:`, err);
          safeSend(ws, { type: 'ERROR', message: 'Processing error on manual transcript.' });
        });
        break;
      }

      // 7. Recording lifecycle — acknowledged silently
      case 'RECORDING_START':
      case 'RECORDING_STOP':
      case 'SESSION_CONFIG':
      case 'LANGUAGE_CHANGE': {
        if (msg.language) {
          const validLanguages = ['en', 'hi', 'kn', 'ta', 'te'];
          if (validLanguages.includes(msg.language)) session.language = msg.language;
        }
        break;
      }

      // 7. Session info request
      case 'GET_SESSION': {
        safeSend(ws, {
          type: 'SESSION_INFO',
          sessionId,
          language: session.language,
          currentRecord: session.currentRecord,
          uptime: Date.now() - session.createdAt
        });
        break;
      }

      default: {
        console.warn(`[Session ${sessionId}] Unknown message type: ${msg.type}`);
        safeSend(ws, { type: 'ERROR', message: `Unknown message type: ${msg.type}` });
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Connection close handler
  // ---------------------------------------------------------------------------
  ws.on('close', (code, reason) => {
    console.log(`[WS] Session ${sessionId} closed. Code=${code} Reason=${reason?.toString() || 'none'}`);
    if (session.asrSession) {
      session.asrSession.destroy();
      session.asrSession = null;
    }
    activeSessions.delete(sessionId);
  });

  // ---------------------------------------------------------------------------
  // Error handler
  // ---------------------------------------------------------------------------
  ws.on('error', (err) => {
    console.error(`[WS] Session ${sessionId} error:`, err.message);
    if (session.asrSession) {
      session.asrSession.destroy();
      session.asrSession = null;
    }
    activeSessions.delete(sessionId);
  });
});

// ---------------------------------------------------------------------------
// Uncaught exception / rejection guards (never crash server)
// ---------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`\n🚀 ASHA-Vaani server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   WS:     ws://localhost:${PORT}`);
  console.log(`   Mode:   ${process.env.NODE_ENV || 'development'}`);
  const gnaniKey = process.env.GNANI_API_KEY;
  const mockMode = !gnaniKey || gnaniKey === 'your_gnani_api_key_here';
  console.log(`   ASR:    ${mockMode ? 'MOCK (no Gnani API key)' : 'LIVE (Gnani)'}`);
  const geminiKey = process.env.GEMINI_API_KEY;
  const noLLM = !geminiKey || geminiKey === 'your_gemini_api_key_here';
  console.log(`   LLM:    ${noLLM ? 'DETERMINISTIC fallback (no Gemini key)' : 'Gemini Flash'}`);
  console.log(`   Beneficiaries: ${beneficiaries.length} loaded\n`);
});

module.exports = { app, server, wss };
