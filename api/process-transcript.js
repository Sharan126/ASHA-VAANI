// Vercel Serverless Function: /api/process-transcript
// Real-time clinical extraction & NHM safety shield fallback for cloud edge

const BENEFICIARIES = [
  { id: 'ID-101', name: 'Lakshmi', aliases: ['lakshmi', 'laxmi', 'laksmi'] },
  { id: 'ID-102', name: 'Meena', aliases: ['meena', 'mina'] },
  { id: 'ID-103', name: 'Priya', aliases: ['priya', 'piya'] },
  { id: 'ID-104', name: 'Kavitha', aliases: ['kavitha', 'kavita'] },
  { id: 'ID-105', name: 'Anita', aliases: ['anita', 'aneeta'] },
  { id: 'ID-106', name: 'Sunita', aliases: ['sunita', 'suneeta'] },
  { id: 'ID-107', name: 'Fatima', aliases: ['fatima', 'faathima'] },
  { id: 'ID-108', name: 'Radha', aliases: ['radha', 'raadha'] },
  { id: 'ID-109', name: 'Pushpa', aliases: ['pushpa', 'puspa'] },
  { id: 'ID-110', name: 'Sarala', aliases: ['sarala', 'sarla'] }
];

const ESCALATION_MESSAGES = {
  en: 'DANGER SIGN DETECTED. Refer patient to Primary Health Centre (PHC) IMMEDIATELY.',
  hi: 'खतरे का संकेत मिला है। तुरंत प्राथमिक स्वास्थ्य केंद्र (PHC) जाएं।',
  kn: 'ಅಪಾಯದ ಚಿಹ್ನೆ ಪತ್ತೆಯಾಗಿದೆ. ತಕ್ಷಣ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಕೇಂದ್ರಕ್ಕೆ ಹೋಗಿ.',
  ta: 'ஆபத்து அறிகுறி கண்டறியப்பட்டது. உடனே ஆரம்ப சுகாதார நிலையத்திற்கு செல்லுங்கள்.',
  te: 'ప్రమాద సంకేతం గుర్తించబడింది. వెంటనే ప్రాథమిక ఆరోగ్య కేంద్రానికి వెళ్ళండి.'
};

function analyzeDangerSigns(text, language = 'hi') {
  const lower = (text || '').toLowerCase();
  const flags = [];

  // NHM Module 6: Maternal Danger Signs
  const matBleeding = ['bleeding', 'spotting', 'khoon', 'rakt', 'raktasrava', 'nettaru', 'irattam', 'hemorrhage'];
  if (matBleeding.some(k => lower.includes(k))) flags.push('MAT_BLEEDING');

  const matPreeclampsia = ['severe headache', 'blurred vision', 'swelling', 'fits', 'convulsions', 'daura', 'sirdarad', 'tale novu', 'veekkam', 'talanoopulu', 'sar dard'];
  if (matPreeclampsia.some(k => lower.includes(k))) flags.push('MAT_PREECLAMPSIA');

  // NHM Module 7: Newborn Danger Signs
  const nbFever = ['high fever', 'fever', 'bukhar', 'tez bukhar', 'jvara', 'jora', 'juram', 'cold body', 'thanda', 'hypothermia'];
  if (nbFever.some(k => lower.includes(k))) flags.push('NB_HIGH_FEVER');

  const nbBreathing = ['difficulty breathing', 'chest indrawing', 'not feeding', 'unconscious', 'saans', 'takleef', 'doodh nahi', 'pee raha', 'ulisuvudu', 'saans lene'];
  if (nbBreathing.some(k => lower.includes(k))) flags.push('NB_BREATHING_FEEDING');

  const isHighRisk = flags.length > 0;
  const langKey = ESCALATION_MESSAGES[language] ? language : 'hi';
  const urgentMessage = isHighRisk ? ESCALATION_MESSAGES[langKey] : null;

  return { isHighRisk, flags, urgentMessage };
}

function extractClinicalFields(text, currentRecord = {}) {
  const lower = (text || '').toLowerCase();
  const record = { ...(currentRecord || {}) };
  const correctedFields = [];

  // 1. Beneficiary ID
  const idMatch = lower.match(/id[-\s]?(\d{3})/i);
  if (idMatch) {
    const matchedId = `ID-${idMatch[1]}`;
    if (record.beneficiary_id !== matchedId) {
      if (record.beneficiary_id) correctedFields.push('beneficiary_id');
      record.beneficiary_id = matchedId;
    }
  } else {
    // Check Hindi numbers like ek sau ek -> ID-101
    const hindiNumMap = {
      'ek sau ek': 'ID-101', '101': 'ID-101',
      'ek sau do': 'ID-102', '102': 'ID-102',
      'ek sau teen': 'ID-103', '103': 'ID-103',
      'ek sau char': 'ID-104', '104': 'ID-104',
      'ek sau paanch': 'ID-105', '105': 'ID-105',
      'ek sau chhah': 'ID-106', '106': 'ID-106',
      'ek sau saat': 'ID-107', '107': 'ID-107',
      'ek sau aath': 'ID-108', '108': 'ID-108',
      'ek sau nau': 'ID-109', '109': 'ID-109',
      'ek sau das': 'ID-110', '110': 'ID-110'
    };
    for (const [k, v] of Object.entries(hindiNumMap)) {
      if (lower.includes(k)) {
        if (record.beneficiary_id && record.beneficiary_id !== v) correctedFields.push('beneficiary_id');
        record.beneficiary_id = v;
        break;
      }
    }

    // Name matching
    if (!record.beneficiary_id) {
      for (const b of BENEFICIARIES) {
        if (b.aliases.some(a => lower.includes(a))) {
          record.beneficiary_id = b.id;
          break;
        }
      }
    }
  }

  // 2. Visit Type
  if (lower.includes('anc') || lower.includes('antenatal') || lower.includes('garbhavastha')) {
    if (record.visit_type && record.visit_type !== 'ANC') correctedFields.push('visit_type');
    record.visit_type = 'ANC';
  } else if (lower.includes('pnc') || lower.includes('postnatal')) {
    if (record.visit_type && record.visit_type !== 'PNC') correctedFields.push('visit_type');
    record.visit_type = 'PNC';
  } else if (lower.includes('newborn') || lower.includes('navjat') || lower.includes('bachche') || lower.includes('magu')) {
    if (record.visit_type && record.visit_type !== 'Newborn') correctedFields.push('visit_type');
    record.visit_type = 'Newborn';
  } else if (lower.includes('immunization') || lower.includes('tika')) {
    record.visit_type = 'Immunization';
  }

  // 3. Weight (kg)
  let weight = null;
  const wordDecimals = {
    'teen point do': 3.2,
    'do point aath': 2.8,
    'do point do': 2.2,
    'teen point paanch': 3.5,
    'char point do': 4.2,
    'ek point aath': 1.8,
    'do dashamlav aath': 2.8,
    'teen dashamlav do': 3.2
  };

  for (const [phrase, val] of Object.entries(wordDecimals)) {
    if (lower.includes(phrase)) {
      weight = val;
      break;
    }
  }

  if (weight === null) {
    const numMatch = lower.match(/(\d+[.,]\d+)\s*(?:kg|kilo|kilogram)?/i) || lower.match(/weight\s*(\d+[.,]?\d*)/i);
    if (numMatch) {
      weight = parseFloat(numMatch[1].replace(',', '.'));
    }
  }

  if (weight !== null) {
    if (record.weight_kg && record.weight_kg !== weight) {
      correctedFields.push('weight_kg');
    }
    record.weight_kg = weight;
  }

  // 4. Vaccinations Due
  const vaccs = new Set(Array.isArray(record.vaccinations_due) ? record.vaccinations_due : []);
  if (lower.includes('tt') || lower.includes('tetanus')) vaccs.add('TT Injection');
  if (lower.includes('ifa') || lower.includes('iron')) vaccs.add('IFA Tablets');
  if (lower.includes('bcg')) vaccs.add('BCG Vaccine');
  if (lower.includes('opv') || lower.includes('polio')) vaccs.add('OPV (Polio)');
  if (lower.includes('hep') || lower.includes('hepatitis')) vaccs.add('Hepatitis B');
  if (lower.includes('pentavalent') || lower.includes('dpt')) vaccs.add('Pentavalent Vaccine');
  record.vaccinations_due = Array.from(vaccs);

  // 5. Next Visit Date
  if (lower.includes('pandrah din') || lower.includes('15 days') || lower.includes('15 din')) {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    record.next_visit_date = d.toISOString().split('T')[0];
  } else if (lower.includes('ek mahina') || lower.includes('30 days') || lower.includes('1 month')) {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    record.next_visit_date = d.toISOString().split('T')[0];
  } else if (lower.includes('ek hafta') || lower.includes('7 days') || lower.includes('1 week')) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    record.next_visit_date = d.toISOString().split('T')[0];
  }

  // 6. Correction detection
  const isCorrection = lower.includes('nahi') || lower.includes('galat') || lower.includes('wrong') || lower.includes('correct') || lower.includes('correction') || correctedFields.length > 0;

  return { record, correctedFields, isCorrection };
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const body = req.body || {};
    const text = body.text || '';
    const language = body.language || 'hi';
    const currentRecord = body.currentRecord || {};

    if (!text) {
      return res.status(400).json({ error: 'Text prompt required' });
    }

    // 1. Analyze Danger Signs (NHM Clinical Safety Shield)
    const dangerResult = analyzeDangerSigns(text, language);

    // 2. Extract clinical fields
    const { record, correctedFields, isCorrection } = extractClinicalFields(text, currentRecord);

    if (dangerResult.isHighRisk) {
      record.reported_symptoms = Array.from(new Set([
        ...(record.reported_symptoms || []),
        ...dangerResult.flags
      ]));
    }

    // 3. Build Confirmation text for read-back
    let confirmText = '';
    if (dangerResult.isHighRisk) {
      confirmText = dangerResult.urgentMessage;
    } else {
      const parts = [];
      if (record.beneficiary_id) parts.push(`Patient ${record.beneficiary_id}`);
      if (record.visit_type) parts.push(`Visit ${record.visit_type}`);
      if (record.weight_kg) parts.push(`Weight ${record.weight_kg} kilo`);
      if (record.vaccinations_due?.length) parts.push(`Vaccination ${record.vaccinations_due.join(', ')}`);
      if (record.next_visit_date) parts.push(`Next visit ${record.next_visit_date}`);
      if (isCorrection) parts.push('Correction recorded');
      confirmText = parts.length ? parts.join('. ') + '.' : 'Record noted.';
    }

    // Return standardized EXTRACTION_RESULT compatible with WebSocket payload
    return res.status(200).json({
      type: 'EXTRACTION_RESULT',
      record,
      isHighRisk: dangerResult.isHighRisk,
      flags: dangerResult.flags,
      urgentMessage: dangerResult.urgentMessage,
      corrected_fields: correctedFields,
      confirmText,
      language
    });
  } catch (err) {
    console.error('Extraction error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
