'use strict';

/**
 * dangerSignEngine.js — NHM Clinical Safety Shield
 * Implements maternal and newborn danger sign detection
 * per NHM Module 6 (Maternal Danger Signs) and Module 7 (Newborn Danger Signs)
 */

// ---------------------------------------------------------------------------
// NHM Module 6 — Maternal Danger Signs
// ---------------------------------------------------------------------------

// MAT_BLEEDING: Abnormal bleeding / hemorrhage
const MAT_BLEEDING_KEYWORDS = [
  // English
  'bleeding', 'spotting', 'blood loss', 'hemorrhage', 'haemorrhage',
  'heavy bleeding', 'vaginal bleeding', 'blood discharge',
  // Hindi
  'khoon', 'rakt', 'khoon ana', 'rakat', 'khoon aayi', 'khoon aa raha',
  'khooni', 'raktasrav', 'prasav mein khoon',
  // Kannada
  'raktasrava', 'hemmaarige', 'nettaru', 'raktaheenarogi', 'rakta baruvudu',
  'nettaru baruvudu', 'hemmaarige aagide',
  // Tamil
  'irattam', 'iratta porukku', 'ratta porukku', 'iratta varutal',
  'irattam varugiradu',
  // Telugu
  'rakta sraavam', 'netturu', 'netturu vadam', 'rakta posham',
  'rakt sravam'
];

// ASR phonetic mishearings for bleeding
const MAT_BLEEDING_PHONETIC = [
  'koon', 'rakthu', 'nettara', 'irattham', 'nettur'
];

// MAT_PREECLAMPSIA: Pre-eclampsia / eclampsia signs
const MAT_PREECLAMPSIA_KEYWORDS = [
  // English
  'severe headache', 'blurred vision', 'blurry vision', 'swelling', 'fits',
  'convulsions', 'eclampsia', 'pre-eclampsia', 'preeclampsia',
  'high blood pressure', 'hypertension', 'vision problems', 'seeing spots',
  // Hindi
  'daura', 'sirdarad', 'sar dard', 'aankhein dhundli', 'sujan', 'wajan',
  'jhade', 'fits aana', 'mirgi', 'bp zyada', 'haath paon sujan',
  'aankhon mein dhundhlapan',
  // Kannada
  'tale novu', 'munde kaana', 'oola', 'hida', 'novu', 'olume',
  'kaige oola', 'kalligu oola', 'kaalu oola',
  // Tamil
  'talai vali', 'padalam', 'veekkam', 'kaalgal veekkam', 'thalai vali',
  'mayal', 'valikam',
  // Telugu
  'talanoopulu', 'kanulu masinam', 'velupu', 'padamadam', 'vantulu',
  'kaalu velupu', 'nadumu velupu'
];

const MAT_PREECLAMPSIA_PHONETIC = [
  'dora', 'sirdard', 'andhe', 'ankhein dhundi', 'soojan',
  'tala noovu', 'padamal', 'talanopulu'
];

// ---------------------------------------------------------------------------
// NHM Module 7 — Newborn Danger Signs
// ---------------------------------------------------------------------------

// NB_HIGH_FEVER: Fever / hypothermia
const NB_HIGH_FEVER_KEYWORDS = [
  // English
  'high fever', 'fever', 'hypothermia', 'cold body', 'burning', 'very hot',
  'temperature high', 'body hot', 'too cold', 'baby cold',
  // Hindi
  'bukhar', 'tez bukhar', 'thanda', 'jwar', 'thand lagna', 'baby thanda',
  'bacha thanda', 'bachche ko bukhar',
  // Kannada
  'jvara', 'jora', 'jor', 'tappu', 'jvara ide', 'magu tappu',
  'jvara aagide',
  // Tamil
  'juram', 'kaichal', 'thapam', 'juram irukkiradu', 'kaichal irukkiradu',
  // Telugu
  'jvaram', 'vasana', 'jwaram', 'mee cheemidi', 'babu jvaram'
];

const NB_HIGH_FEVER_PHONETIC = [
  'bukaar', 'bhukar', 'tapoo', 'juraam', 'jwaram'
];

// NB_BREATHING_FEEDING: Breathing difficulties / feeding problems
const NB_BREATHING_FEEDING_KEYWORDS = [
  // English
  'difficulty breathing', 'fast breathing', 'rapid breathing', 'chest indrawing',
  'not feeding', 'unable to feed', 'not drinking milk', 'unconscious', 'lethargic',
  'stopped breathing', 'breath problem', 'not breastfeeding', 'refusing milk',
  'blue lips', 'cyanosis',
  // Hindi
  'saans', 'saans lena mushkil', 'doodh nahi peena', 'behosh', 'sans ki taklif',
  'ulti karana', 'doodh nahi pee raha', 'sans tez', 'chhati mein ghusna',
  'bebhosh', 'lethargy',
  // Kannada
  'ulisuvudu kashtakaramavagide', 'hale kudiyalla', 'nidsaake kashtada',
  'magu oosu aadalada', 'magu haalu kudiyalla', 'magu jaagide',
  'magu oosu tegaluvudu',
  // Tamil
  'maarpil irukkidam', 'palukollavillai', 'sollukollavillai', 'maarpai udaiyal',
  'paal kudikka maatengiradu', 'moocchu varavillai', 'moocchu siramam',
  // Telugu
  'unnasasam', 'palu taagadam ledu', 'oopu taagadam ledu', 'chaduvukolekunde',
  'chettas timaluki', 'mee cheemidi oopu'
];

const NB_BREATHING_FEEDING_PHONETIC = [
  'sans', 'saans ki', 'behosh', 'dudh nahi', 'haale kudiyalla',
  'oosu', 'moochu siramam', 'unnasasam ledu'
];

// ---------------------------------------------------------------------------
// Escalation messages per language (NHM protocol)
// ---------------------------------------------------------------------------
const ESCALATION_MESSAGES = {
  en: 'DANGER SIGN DETECTED. Take the patient to the Primary Health Centre IMMEDIATELY.',
  hi: 'खतरे का संकेत। अभी प्राथमिक स्वास्थ्य केंद्र जाएं।',
  kn: 'ಅಪಾಯದ ಚಿಹ್ನೆ. ತಕ್ಷಣ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರಕ್ಕೆ ಹೋಗಿ.',
  ta: 'ஆபத்து அறிகுறி. உடனே ஆரம்ப சுகாதார நிலையம் செல்லுங்கள்.',
  te: 'ప్రమాద సంకేతం. వెంటనే ప్రాథమిక ఆరోగ్య కేంద్రానికి వెళ్ళండి.'
};

// ---------------------------------------------------------------------------
// Helper: check if any keyword or phonetic variant appears in text
// ---------------------------------------------------------------------------
function containsAny(text, keywords, phoneticVariants) {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) return true;
  }
  if (phoneticVariants) {
    for (const pv of phoneticVariants) {
      if (lower.includes(pv.toLowerCase())) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main export: analyzeDangerSigns
// ---------------------------------------------------------------------------

/**
 * Analyzes transcript and extracted symptoms for NHM danger signs.
 *
 * @param {string} transcript - Raw or normalized transcript text
 * @param {string[]} extractedSymptoms - Array of symptom strings from LLM/normalizer
 * @param {string} language - Language code: 'en'|'hi'|'kn'|'ta'|'te'
 * @returns {{ isHighRisk: boolean, flags: string[], urgentMessage: string|null }}
 */
function analyzeDangerSigns(transcript, extractedSymptoms, language) {
  const flags = [];

  // Combine transcript and extracted symptoms into one search string
  const searchText = [
    transcript || '',
    ...(extractedSymptoms || [])
  ].join(' ');

  // --- NHM Module 6: Maternal Danger Signs ---

  // MAT_BLEEDING check
  if (containsAny(searchText, MAT_BLEEDING_KEYWORDS, MAT_BLEEDING_PHONETIC)) {
    flags.push('MAT_BLEEDING');
  }

  // MAT_PREECLAMPSIA check
  if (containsAny(searchText, MAT_PREECLAMPSIA_KEYWORDS, MAT_PREECLAMPSIA_PHONETIC)) {
    flags.push('MAT_PREECLAMPSIA');
  }

  // --- NHM Module 7: Newborn Danger Signs ---

  // NB_HIGH_FEVER check
  if (containsAny(searchText, NB_HIGH_FEVER_KEYWORDS, NB_HIGH_FEVER_PHONETIC)) {
    flags.push('NB_HIGH_FEVER');
  }

  // NB_BREATHING_FEEDING check
  if (containsAny(searchText, NB_BREATHING_FEEDING_KEYWORDS, NB_BREATHING_FEEDING_PHONETIC)) {
    flags.push('NB_BREATHING_FEEDING');
  }

  const isHighRisk = flags.length > 0;

  // Determine escalation language
  const lang = language && ESCALATION_MESSAGES[language] ? language : 'en';
  const urgentMessage = isHighRisk ? ESCALATION_MESSAGES[lang] : null;

  return { isHighRisk, flags, urgentMessage };
}

module.exports = { analyzeDangerSigns };
