'use strict';

/**
 * normalizer.js — Deterministic field normalizer for ASHA-Vaani
 * Handles multilingual ASR output: Kannada (kn), Hindi (hi), Tamil (ta), Telugu (te), English (en)
 */

const Fuse = require('fuse.js');
const { beneficiaries } = require('../data/beneficiaries');

// ---------------------------------------------------------------------------
// Number word maps (English + Hindi + Kannada + Tamil + Telugu)
// ---------------------------------------------------------------------------
const NUMBER_WORDS = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
  // Hindi
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, chhah: 6, saat: 7,
  aath: 8, nau: 9, das: 10, gyarah: 11, barah: 12, terah: 13,
  chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18,
  unnis: 19, bees: 20, tees: 30, chaalees: 40, pachaas: 50,
  saath: 60, sattar: 70, assi: 80, nabbe: 90, so: 100, sau: 100,
  hazar: 1000,
  // Kannada
  ondu: 1, eradu: 2, mooru: 3, naaku: 4, aidu: 5, aaru: 6, yelu: 7,
  entu: 8, ombattu: 9, hattu: 10, hanneradu: 12, hadinaiadu: 15,
  ippattu: 20, muppattu: 30, nalphattu: 40, aippattu: 50,
  aruppattu: 60, yelu_ppattu: 70, embattu: 80, tombattu: 90,
  nooru: 100, saavira: 1000,
  // Tamil
  onru: 1, irandu: 2, moondru: 3, naangu: 4, ainthu: 5, aaru_ta: 6,
  ezhu: 7, ettu: 8, onbathu: 9, pathu: 10, irupathu: 20,
  muppathu: 30, narppathu: 40, aimppathu: 50, nooru_ta: 100,
  // Telugu
  okati: 1, rendu: 2, moodu: 3, nalugu: 4, aidu_te: 5, aaru_te: 6,
  edu: 7, enimidi: 8, tommidi: 9, padi: 10, iruvai: 20,
  muppai: 30, nalabhai: 40, yabhai: 50, nooru_te: 100,
  // Common spoken variants
  oh: 0, nought: 0, naught: 0,
  dashamlav: '.', // Hindi decimal
  dhashamlav: '.', point: '.'
};

// Day-of-week to index (0=Sunday)
const DAY_NAMES = {
  sunday: 0, sun: 0, ravivar: 0,
  monday: 1, mon: 1, somvar: 1, somvaar: 1,
  tuesday: 2, tue: 2, mangalvar: 2, mangalvaar: 2,
  wednesday: 3, wed: 3, budhvar: 3, budhvaar: 3,
  thursday: 4, thu: 4, guruvar: 4, guruvaar: 4, brihaspativar: 4,
  friday: 5, fri: 5, shukravar: 5, shukravaar: 5,
  saturday: 6, sat: 6, shanivar: 6, shanivaar: 6
};

const MONTH_NAMES = {
  january: 0, jan: 0, janvari: 0,
  february: 1, feb: 1, farvari: 1, february_hi: 1,
  march: 2, mar: 2, march_hi: 2,
  april: 3, apr: 3, april_hi: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7, agast: 7,
  september: 8, sep: 8, sitambar: 8,
  october: 9, oct: 9, aktoobar: 9,
  november: 10, nov: 10, navambar: 10,
  december: 11, dec: 11, disambar: 11
};

// ---------------------------------------------------------------------------
// Helper: parse a numeric word sequence into a float
// ---------------------------------------------------------------------------
function wordsToNumber(tokens) {
  let result = 0;
  let current = 0;
  let decimalMode = false;
  let decimalPlaces = 1;

  for (const tok of tokens) {
    const lower = tok.toLowerCase().trim();
    if (!lower) continue;

    // Check for decimal separator
    if (lower === '.' || lower === 'point' || lower === 'dashamlav' || lower === 'dhashamlav') {
      decimalMode = true;
      continue;
    }

    // Try direct number parse
    const directNum = parseFloat(lower);
    if (!isNaN(directNum)) {
      if (decimalMode) {
        result += directNum / Math.pow(10, decimalPlaces);
        decimalPlaces++;
      } else if (directNum >= 100) {
        if (current === 0) current = directNum;
        else current *= directNum;
      } else {
        current += directNum;
      }
      continue;
    }

    // Look up word map
    const wordVal = NUMBER_WORDS[lower];
    if (wordVal === undefined) continue;

    if (wordVal === '.') {
      decimalMode = true;
      continue;
    }

    if (decimalMode) {
      result += wordVal / Math.pow(10, decimalPlaces);
      decimalPlaces++;
    } else if (wordVal === 100) {
      current = current === 0 ? 100 : current * 100;
    } else if (wordVal === 1000) {
      current = current === 0 ? 1000 : current * 1000;
      result += current;
      current = 0;
    } else {
      current += wordVal;
    }
  }

  result += current;
  return result;
}

// ---------------------------------------------------------------------------
// 1. normalizeTranscript
// ---------------------------------------------------------------------------
function normalizeTranscript(rawText, language) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText.trim();

  // Remove filler words common in ASR output
  const fillers = [
    /\b(um|uh|er|hmm|haan|haan ji|achha|okay|ok|theek hai|theek|sare)\b/gi,
    /\b(ummm|ahh|ehh|ahem)\b/gi
  ];
  for (const f of fillers) {
    text = text.replace(f, ' ');
  }

  // Normalize repeated spaces, punctuation artifacts
  text = text.replace(/[,]{2,}/g, ',');
  text = text.replace(/\s{2,}/g, ' ');
  text = text.trim();

  // Lowercase for English/romanized content
  if (language === 'en') {
    text = text.toLowerCase();
  }

  return text;
}

// ---------------------------------------------------------------------------
// 2. extractWeight
// ---------------------------------------------------------------------------
function extractWeight(text) {
  if (!text) return null;

  const lower = text.toLowerCase().trim();

  // Pattern: direct decimal/integer followed by kg/kilo/kilogram/gram
  const directPattern = /(\d+(?:\.\d+)?)\s*(?:kg|kilo(?:gram)?s?|किलो|kilogram)/i;
  const directMatch = lower.match(directPattern);
  if (directMatch) return parseFloat(directMatch[1]);

  // Pattern: X kilo Y (so/gram) → X.Y
  const kiloGramPattern = /(\d+(?:\.\d+)?)\s*kilo(?:gram)?\s+(?:teen|tin|so|sau|gram|g)?\s*(\d+)?\s*(?:gram|g)?/i;
  const kgMatch = lower.match(kiloGramPattern);
  if (kgMatch) {
    const kg = parseFloat(kgMatch[1]);
    if (kgMatch[2]) {
      const grams = parseInt(kgMatch[2]);
      return parseFloat((kg + grams / 1000).toFixed(3));
    }
    return kg;
  }

  // "ek kilo teen so gram" → 1.3 (1 kg 300g)
  const hindiKgGramPattern = /(\w+)\s+kilo(?:gram)?\s+(\w+)\s+(?:so|sau|sow)\s+gram/i;
  const hkgMatch = lower.match(hindiKgGramPattern);
  if (hkgMatch) {
    const kgTokens = hkgMatch[1].split(/\s+/);
    const gramTokens = hkgMatch[2].split(/\s+/);
    const kg = wordsToNumber(kgTokens);
    const g = wordsToNumber(gramTokens) * 100; // "teen so" = 300
    if (kg > 0) return parseFloat((kg + g / 1000).toFixed(3));
  }

  // Handle "two point eight kilo" / "do dashamlav aath" style
  // Split on kilo/kg boundary first
  const kiloIndex = lower.search(/\b(kilo(?:gram)?|kg|किलो)\b/i);
  const segment = kiloIndex > -1 ? lower.substring(0, kiloIndex) : lower;

  // Tokenize and convert words
  const tokens = segment.split(/[\s,]+/);
  const num = wordsToNumber(tokens);
  if (num > 0 && num < 200) return parseFloat(num.toFixed(3));

  // Last resort: find any standalone number in text
  const anyNum = lower.match(/\b(\d+(?:\.\d+)?)\b/);
  if (anyNum) {
    const val = parseFloat(anyNum[1]);
    if (val > 0 && val < 200) return val;
  }

  return null;
}

// ---------------------------------------------------------------------------
// 3. extractDate
// ---------------------------------------------------------------------------
function extractDate(text) {
  if (!text) return null;

  const lower = text.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // "next <day>" or "agle <day>" or "agli <day>"
  const nextDayMatch = lower.match(/(?:next|agle|agli)\s+(\w+)/i);
  if (nextDayMatch) {
    const dayName = nextDayMatch[1].toLowerCase();
    const targetDay = DAY_NAMES[dayName];
    if (targetDay !== undefined) {
      const result = new Date(today);
      const currentDay = result.getDay();
      let daysAhead = targetDay - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      result.setDate(result.getDate() + daysAhead);
      return result.toISOString().split('T')[0] + 'T00:00:00.000Z';
    }
  }

  // "in X days" / "X din baad" / "X dino mein"
  const daysLaterMatch = lower.match(/(\d+|(?:\w+\s+)*\w+)\s+(?:days?|din(?:\s+baad|\s+mein)?)/i);
  if (daysLaterMatch) {
    const tokens = daysLaterMatch[1].trim().split(/\s+/);
    const numDays = wordsToNumber(tokens) || parseInt(tokens[0]);
    if (numDays > 0 && numDays < 365) {
      const result = new Date(today);
      result.setDate(result.getDate() + numDays);
      return result.toISOString().split('T')[0] + 'T00:00:00.000Z';
    }
  }

  // "fifteen days" standalone
  const fifteenDays = lower.match(/\b(fifteen|pandrah|pandara)\s+days?\b/i);
  if (fifteenDays) {
    const result = new Date(today);
    result.setDate(result.getDate() + 15);
    return result.toISOString().split('T')[0] + 'T00:00:00.000Z';
  }

  // "ek mahina" / "one month"
  if (/\b(?:ek\s+mahina|one\s+month|ek\s+month)\b/i.test(lower)) {
    const result = new Date(today);
    result.setDate(result.getDate() + 30);
    return result.toISOString().split('T')[0] + 'T00:00:00.000Z';
  }

  // "do hafte" / "two weeks"
  const weeksMatch = lower.match(/\b(?:(\w+)\s+(?:hafte|weeks?))\b/i);
  if (weeksMatch) {
    const tokens = weeksMatch[1].split(/\s+/);
    const numWeeks = wordsToNumber(tokens) || 2;
    const result = new Date(today);
    result.setDate(result.getDate() + numWeeks * 7);
    return result.toISOString().split('T')[0] + 'T00:00:00.000Z';
  }

  // Explicit date: "15 November" / "pandrah november"
  for (const [monthName, monthIndex] of Object.entries(MONTH_NAMES)) {
    const monthPattern = new RegExp(`(\\d+|\\w+)\\s+${monthName}`, 'i');
    const match = lower.match(monthPattern);
    if (match) {
      const dayTokens = match[1].split(/\s+/);
      let day = parseInt(match[1]);
      if (isNaN(day)) {
        day = wordsToNumber(dayTokens);
      }
      if (day > 0 && day <= 31) {
        const year = today.getFullYear();
        const result = new Date(year, monthIndex, day);
        // If date is in the past, use next year
        if (result < today) result.setFullYear(year + 1);
        return result.toISOString().split('T')[0] + 'T00:00:00.000Z';
      }
    }
  }

  // ISO date pattern
  const isoMatch = lower.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1] + 'T00:00:00.000Z';

  // DD/MM/YYYY
  const slashDate = lower.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashDate) {
    const d = parseInt(slashDate[1]);
    const m = parseInt(slashDate[2]) - 1;
    const y = parseInt(slashDate[3]) < 100 ? 2000 + parseInt(slashDate[3]) : parseInt(slashDate[3]);
    const result = new Date(y, m, d);
    return result.toISOString().split('T')[0] + 'T00:00:00.000Z';
  }

  return null;
}

// ---------------------------------------------------------------------------
// 4. normalizeVaccination
// ---------------------------------------------------------------------------
const VACCINE_MAP = [
  {
    patterns: [/\btt\b/i, /tetanus/i, /teetanus/i, /tetaanus/i, /dhanurrog/i],
    name: 'TT Injection'
  },
  {
    patterns: [/\bifa\b/i, /iron\s+(?:folic\s+)?(?:acid|tablet|goli|pill)/i, /folic/i, /folic\s+acid/i, /iron\s+ki\s+goli/i, /loha\s+ki\s+goli/i],
    name: 'IFA Tablets'
  },
  {
    patterns: [/\bbcg\b/i, /bacillus\s+calmette/i],
    name: 'BCG Vaccine'
  },
  {
    patterns: [/\bopv\b/i, /polio/i, /pouliyou/i, /poliyo/i, /oral\s+polio/i],
    name: 'OPV (Polio)'
  },
  {
    patterns: [/hepatitis[\s-]?b/i, /hep[\s-]?b/i, /hepatitis/i],
    name: 'Hepatitis B Vaccine'
  },
  {
    patterns: [/\bdpt\b/i, /diphtheria/i, /pertussis/i, /whooping\s+cough/i],
    name: 'DPT Vaccine'
  },
  {
    patterns: [/\bmr\b(?!\s+scan)/i, /measles[\s-]?rubella/i, /measles/i, /rubella/i, /khasra/i, /khasara/i],
    name: 'MR Vaccine'
  },
  {
    patterns: [/vitamin[\s-]?a/i, /vit[\s-]?a\b/i],
    name: 'Vitamin A Supplement'
  },
  {
    patterns: [/\bpenta(?:valent)?\b/i],
    name: 'Pentavalent Vaccine'
  },
  {
    patterns: [/\bipv\b/i, /inactivated\s+polio/i],
    name: 'IPV (Inactivated Polio)'
  },
  {
    patterns: [/\brotavirus\b/i, /rota\s+virus/i],
    name: 'Rotavirus Vaccine'
  }
];

function normalizeVaccination(text) {
  if (!text) return [];
  const found = [];
  for (const entry of VACCINE_MAP) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        if (!found.includes(entry.name)) found.push(entry.name);
        break;
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// 5. normalizeVisitType
// ---------------------------------------------------------------------------
const VISIT_TYPE_PATTERNS = [
  {
    type: 'ANC',
    patterns: [
      /\banc\b/i, /antenatal/i, /ante[\s-]?natal/i, /pregnancy\s+(?:check|visit)/i,
      /garbhavati/i, /garbhawati/i, /prasav\s+poorv/i, /pregnancy/i,
      /antinatal/i
    ]
  },
  {
    type: 'PNC',
    patterns: [
      /\bpnc\b/i, /postnatal/i, /post[\s-]?natal/i, /prasav\s+pashchat/i,
      /delivery\s+ke\s+baad/i, /after\s+delivery/i, /prasav\s+baad/i,
      /postpartum/i
    ]
  },
  {
    type: 'Newborn',
    patterns: [
      /newborn/i, /neonatal/i, /navarasi/i, /navajaat/i, /naya\s+janam/i,
      /baby\s+visit/i, /shishu/i, /navjaat/i
    ]
  },
  {
    type: 'Immunization',
    patterns: [
      /immunization/i, /immunisation/i, /vaccination/i, /vaccine/i,
      /tikakarana/i, /tikaa/i, /tika/i, /injection/i, /tikakaran/i
    ]
  },
  {
    type: 'Nutrition',
    patterns: [
      /nutrition/i, /poshan/i, /diet/i, /weight\s+check/i,
      /malnutrition/i, /wasting/i, /stunting/i, /iron/i, /ifa/i,
      /poshan\s+visit/i, /weigh/i
    ]
  },
  {
    type: 'Home Visit',
    patterns: [
      /home\s+visit/i, /ghar\s+par/i, /home\s+check/i, /gruha\s+bheti/i,
      /gruhabhet/i, /home/i, /ghar/i
    ]
  }
];

function normalizeVisitType(text) {
  if (!text) return null;
  for (const entry of VISIT_TYPE_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) return entry.type;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 6. fuzzyMatchBeneficiary
// ---------------------------------------------------------------------------
// Build searchable list including aliases
const fuseList = [];
for (const b of beneficiaries) {
  fuseList.push({ id: b.id, name: b.name, searchName: b.name });
  for (const alias of b.nameAliases) {
    fuseList.push({ id: b.id, name: b.name, searchName: alias });
  }
}

const fuse = new Fuse(fuseList, {
  keys: ['searchName'],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 2
});

function fuzzyMatchBeneficiary(nameText) {
  if (!nameText) return null;

  const results = fuse.search(nameText.trim());
  if (!results || results.length === 0) return null;

  const best = results[0];
  // Fuse score: 0 = perfect match, 1 = no match; convert to similarity
  const similarity = 1 - (best.score || 0);

  if (similarity < 0.7) return null;

  return { id: best.item.id, name: best.item.name, score: parseFloat(similarity.toFixed(3)) };
}

// ---------------------------------------------------------------------------
// 7. normalizeBeneficiaryId
// ---------------------------------------------------------------------------
// Spoken digit to number
const SPOKEN_DIGITS = {
  zero: 0, oh: 0, naught: 0, nought: 0,
  one: 1, ek: 1, ondu: 1, okati: 1, onru: 1,
  two: 2, do: 2, eradu: 2, rendu: 2, irandu: 2,
  three: 3, teen: 3, mooru: 3, moodu: 3, moondru: 3,
  four: 4, char: 4, naaku: 4, nalugu: 4, naangu: 4,
  five: 5, paanch: 5, aidu: 5, ainthu: 5,
  six: 6, chhah: 6, aaru: 6,
  seven: 7, saat: 7, yelu: 7, edu: 7, ezhu: 7,
  eight: 8, aath: 8, entu: 8, enimidi: 8, ettu: 8,
  nine: 9, nau: 9, ombattu: 9, tommidi: 9, onbathu: 9,
  ten: 10, das: 10, hattu: 10, padi: 10, pathu: 10
};

function normalizeBeneficiaryId(text) {
  if (!text) return null;

  const lower = text.toLowerCase().trim();

  // Already formatted: ID-104
  const alreadyFormatted = lower.match(/id[-\s]?(\d{3,4})/i);
  if (alreadyFormatted) {
    return 'ID-' + alreadyFormatted[1];
  }

  // "ID one zero four" / "ID ek shunya char"
  const idPrefixMatch = lower.match(/^id\s+(.+)$/i);
  if (idPrefixMatch) {
    const tokens = idPrefixMatch[1].trim().split(/[\s,]+/);
    const digits = tokens.map(t => {
      const d = parseInt(t);
      if (!isNaN(d)) return d;
      const wordDigit = SPOKEN_DIGITS[t.toLowerCase()];
      return wordDigit !== undefined ? wordDigit : null;
    }).filter(d => d !== null);

    if (digits.length >= 3) {
      const numStr = digits.join('');
      const num = parseInt(numStr);
      const candidate = 'ID-' + numStr;
      // Verify exists
      if (beneficiaries.find(b => b.id === candidate)) return candidate;
    }
  }

  // "one oh four" / "one zero four" → 104
  const tokens = lower.split(/[\s,]+/);
  const digits = [];
  for (const tok of tokens) {
    const d = parseInt(tok);
    if (!isNaN(d) && d >= 0 && d <= 9) {
      digits.push(d);
    } else {
      const wordDigit = SPOKEN_DIGITS[tok];
      if (wordDigit !== undefined) digits.push(wordDigit);
    }
  }

  if (digits.length >= 3) {
    const numStr = digits.slice(0, 3).join('');
    const num = parseInt(numStr);
    if (num >= 101 && num <= 110) {
      const candidate = 'ID-' + num;
      if (beneficiaries.find(b => b.id === candidate)) return candidate;
    }
  }

  // "do sau ek" → 201? Not in range; try to map to nearest
  // Try wordsToNumber for the entire string
  const spoken = wordsToNumber(tokens);
  if (spoken >= 101 && spoken <= 110) {
    const candidate = 'ID-' + Math.round(spoken);
    if (beneficiaries.find(b => b.id === candidate)) return candidate;
  }

  return null;
}

module.exports = {
  normalizeTranscript,
  extractWeight,
  extractDate,
  normalizeVaccination,
  normalizeVisitType,
  fuzzyMatchBeneficiary,
  normalizeBeneficiaryId
};
