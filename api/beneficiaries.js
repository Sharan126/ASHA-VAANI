const beneficiaries = [
  { id: 'ID-101', name: 'Lakshmi', age: 24, village: 'Basavanahalli', lastVisitDate: '2026-10-15', gestationWeeks: 28, language: 'kn' },
  { id: 'ID-102', name: 'Meena', age: 22, village: 'Chikkanahalli', lastVisitDate: '2026-10-20', gestationWeeks: 32, language: 'kn' },
  { id: 'ID-103', name: 'Priya', age: 26, village: 'Doddaballapur', lastVisitDate: '2026-10-25', gestationWeeks: 20, language: 'ta' },
  { id: 'ID-104', name: 'Kavitha', age: 25, village: 'Erananahalli', lastVisitDate: '2026-11-01', gestationWeeks: 36, language: 'te' },
  { id: 'ID-105', name: 'Anita', age: 23, village: 'Fattepur', lastVisitDate: '2026-10-18', gestationWeeks: 18, language: 'hi' },
  { id: 'ID-106', name: 'Sunita', age: 27, village: 'Gulbarga Road', lastVisitDate: '2026-10-10', gestationWeeks: 34, language: 'hi' },
  { id: 'ID-107', name: 'Fatima', age: 24, village: 'Hoskote', lastVisitDate: '2026-10-28', gestationWeeks: 30, language: 'kn' },
  { id: 'ID-108', name: 'Radha', age: 21, village: 'Indiranagar Camp', lastVisitDate: '2026-11-05', gestationWeeks: 24, language: 'hi' },
  { id: 'ID-109', name: 'Pushpa', age: 28, village: 'Jayanagar Cross', lastVisitDate: '2026-10-12', gestationWeeks: 38, language: 'kn' },
  { id: 'ID-110', name: 'Sarala', age: 23, village: 'Kothanur', lastVisitDate: '2026-10-30', gestationWeeks: 22, language: 'te' }
];

module.exports = (req, res) => {
  res.status(200).json({ beneficiaries });
};
