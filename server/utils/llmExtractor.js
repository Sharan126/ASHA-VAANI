'use strict';

/**
 * llmExtractor.js — Gemini-powered field extraction with deterministic fallback
 * Uses Google Gemini Flash API via REST for structured JSON extraction from ASHA transcripts.
 */

const {
  normalizeTranscript,
  extractWeight,
  extractDate,
  normalizeVaccination,
  normalizeVisitType,
  fuzzyMatchBeneficiary,
  normalizeBeneficiaryId
} = require('./normalizer');

// ---------------------------------------------------------------------------
// System prompt for Gemini (strict data extraction only)
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a data extraction assistant for ASHA (Accredited Social Health Activist) field workers in India.
Extract ONLY the structured fields from the ASHA field worker's voice transcript.
Do NOT provide any medical advice, diagnosis, or treatment recommendations.
Output ONLY valid JSON with these exact fields:

{
  "beneficiary_id": "ID-XXX or null",
  "visit_type": "ANC|PNC|Newborn|Immunization|Nutrition|Home Visit|null",
  "weight_kg": number_or_null,
  "vaccinations_due": ["array", "of", "vaccine", "names"],
  "next_visit_date": "ISO-date-string or null",
  "reported_symptoms": ["array", "of", "symptom", "strings"],
  "is_correction": boolean,
  "corrected_fields": ["array", "of", "field", "names", "that", "changed"]
}

Rules:
1. If a field is not mentioned in the transcript, return null for that field.
2. Set is_correction=true if transcript contains correction language: no, wrong, correction, nahi, galat, nahin, nahi that, nope, that's wrong, galti, sudhar, correct karo.
3. corrected_fields lists field names whose values changed from currentRecord.
4. vaccinations_due must use standard names: TT Injection, IFA Tablets, BCG Vaccine, OPV (Polio), Hepatitis B Vaccine, DPT Vaccine, MR Vaccine, Vitamin A Supplement.
5. visit_type must be exactly one of the enum values or null.
6. weight_kg must be a decimal number (e.g. 2.8, 45.0) or null.
7. next_visit_date must be a full ISO date string (YYYY-MM-DDT00:00:00.000Z) or null.
8. Do NOT include any medical advice, diagnosis, or recommendations in the output.
9. Output ONLY the JSON object. No explanation, no commentary.`;

// ---------------------------------------------------------------------------
// Correction detection helper
// ---------------------------------------------------------------------------
const CORRECTION_PATTERNS = [
  /\b(no|wrong|correction|nahi|galat|nahin|nope|incorrect|mistake|error)\b/i,
  /\b(that'?s wrong|that is wrong|galti|sudhar|correct karo|badlo)\b/i,
  /\b(nahi that|nahi woh|woh nahi)\b/i
];

function detectCorrection(text) {
  for (const pattern of CORRECTION_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Deterministic fallback extractor (uses normalizer.js)
// ---------------------------------------------------------------------------
function deterministicExtract(transcript, currentRecord, language) {
  const normalized = normalizeTranscript(transcript, language);

  const result = {
    beneficiary_id: null,
    visit_type: null,
    weight_kg: null,
    vaccinations_due: [],
    next_visit_date: null,
    reported_symptoms: [],
    is_correction: false,
    corrected_fields: []
  };

  // Try to extract beneficiary by name or ID
  const idResult = normalizeBeneficiaryId(normalized);
  if (idResult) result.beneficiary_id = idResult;

  if (!result.beneficiary_id) {
    const nameMatch = fuzzyMatchBeneficiary(normalized);
    if (nameMatch) result.beneficiary_id = nameMatch.id;
  }

  // Extract weight
  const weight = extractWeight(normalized);
  if (weight !== null) result.weight_kg = weight;

  // Extract visit date
  const nextDate = extractDate(normalized);
  if (nextDate) result.next_visit_date = nextDate;

  // Extract vaccinations
  const vaccines = normalizeVaccination(normalized);
  if (vaccines.length > 0) result.vaccinations_due = vaccines;

  // Extract visit type
  const visitType = normalizeVisitType(normalized);
  if (visitType) result.visit_type = visitType;

  // Detect correction
  result.is_correction = detectCorrection(normalized);

  // Detect corrected fields by comparing to currentRecord
  if (currentRecord && result.is_correction) {
    for (const key of Object.keys(result)) {
      if (key === 'is_correction' || key === 'corrected_fields') continue;
      if (result[key] !== null && result[key] !== undefined) {
        const prev = currentRecord[key];
        const curr = result[key];
        if (JSON.stringify(prev) !== JSON.stringify(curr)) {
          result.corrected_fields.push(key);
        }
      }
    }
  }

  // Merge with currentRecord: preserve existing values for null fields
  if (currentRecord) {
    for (const key of Object.keys(result)) {
      if (key === 'is_correction' || key === 'corrected_fields') continue;
      if (result[key] === null || (Array.isArray(result[key]) && result[key].length === 0)) {
        const existing = currentRecord[key];
        if (existing !== undefined && existing !== null) {
          if (!Array.isArray(result[key]) || (Array.isArray(existing) && existing.length > 0)) {
            result[key] = existing;
          }
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Strip any medical advice from LLM response
// ---------------------------------------------------------------------------
function stripMedicalAdvice(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const ADVICE_KEYS = ['advice', 'recommendation', 'treatment', 'diagnosis', 'prescription'];
  for (const key of ADVICE_KEYS) {
    delete obj[key];
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Sanitize and validate Gemini JSON output
// ---------------------------------------------------------------------------
function sanitizeGeminiOutput(parsed, currentRecord) {
  const safe = {
    beneficiary_id: typeof parsed.beneficiary_id === 'string' ? parsed.beneficiary_id : null,
    visit_type: ['ANC', 'PNC', 'Newborn', 'Immunization', 'Nutrition', 'Home Visit'].includes(parsed.visit_type)
      ? parsed.visit_type : null,
    weight_kg: typeof parsed.weight_kg === 'number' && parsed.weight_kg > 0 ? parsed.weight_kg : null,
    vaccinations_due: Array.isArray(parsed.vaccinations_due) ? parsed.vaccinations_due.filter(v => typeof v === 'string') : [],
    next_visit_date: typeof parsed.next_visit_date === 'string' ? parsed.next_visit_date : null,
    reported_symptoms: Array.isArray(parsed.reported_symptoms) ? parsed.reported_symptoms.filter(s => typeof s === 'string') : [],
    is_correction: typeof parsed.is_correction === 'boolean' ? parsed.is_correction : false,
    corrected_fields: Array.isArray(parsed.corrected_fields) ? parsed.corrected_fields.filter(f => typeof f === 'string') : []
  };

  // Merge with currentRecord for null fields
  if (currentRecord) {
    for (const key of Object.keys(safe)) {
      if (key === 'is_correction' || key === 'corrected_fields') continue;
      if (safe[key] === null || (Array.isArray(safe[key]) && safe[key].length === 0)) {
        const existing = currentRecord[key];
        if (existing !== undefined && existing !== null) {
          safe[key] = existing;
        }
      }
    }
  }

  return safe;
}

// ---------------------------------------------------------------------------
// Main export: extractFields
// ---------------------------------------------------------------------------

/**
 * Extract structured fields from an ASHA field worker's voice transcript.
 *
 * @param {string} transcript - The voice transcript text
 * @param {object} currentRecord - Current session record state (for merging)
 * @param {string} language - Language code: 'en'|'hi'|'kn'|'ta'|'te'
 * @returns {Promise<object>} Extracted fields object
 */
async function extractFields(transcript, currentRecord, language) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.LLM_MODEL || 'gemini-1.5-flash-latest';

  // Skip LLM if no API key configured
  const hasRealApiKey = apiKey && apiKey !== 'your_gemini_api_key_here';

  if (!hasRealApiKey) {
    console.log('[llmExtractor] No Gemini API key — using deterministic fallback');
    return deterministicExtract(transcript, currentRecord, language);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contextStr = currentRecord
    ? `\nCurrent record state: ${JSON.stringify(currentRecord)}`
    : '';

  const userContent = `Transcript (language: ${language}): "${transcript}"${contextStr}\n\nExtract the structured fields as JSON.`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userContent }]
      }
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'
    }
  };

  try {
    // Dynamically import node-fetch (ESM)
    const { default: fetch } = await import('node-fetch');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[llmExtractor] Gemini API error ${response.status}: ${errText}`);
      return deterministicExtract(transcript, currentRecord, language);
    }

    const responseData = await response.json();

    // Extract text from Gemini response
    const candidate = responseData.candidates && responseData.candidates[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      console.error('[llmExtractor] Invalid Gemini response structure');
      return deterministicExtract(transcript, currentRecord, language);
    }

    const rawText = candidate.content.parts.map(p => p.text || '').join('');

    // Parse JSON (handle markdown code blocks if present)
    let parsed;
    try {
      const cleanText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();
      parsed = JSON.parse(cleanText);
    } catch (parseErr) {
      console.error('[llmExtractor] JSON parse error:', parseErr.message);
      return deterministicExtract(transcript, currentRecord, language);
    }

    // Strip any medical advice and sanitize
    stripMedicalAdvice(parsed);
    return sanitizeGeminiOutput(parsed, currentRecord);

  } catch (err) {
    console.error('[llmExtractor] Error calling Gemini:', err.message);
    return deterministicExtract(transcript, currentRecord, language);
  }
}

module.exports = { extractFields };
