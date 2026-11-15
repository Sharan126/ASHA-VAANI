'use strict';

/**
 * Synthetic beneficiary data for ASHA-Vaani
 * 10 records covering mixed South Indian and North Indian demographics
 */
const beneficiaries = [
  {
    id: 'ID-101',
    name: 'Lakshmi Devi',
    nameAliases: ['Laxmi Devi', 'Lakshmidevi', 'Lakshmi', 'Laxmi', 'Lakshmi Bai'],
    age: 24,
    village: 'Hoskote',
    lastVisitDate: '2026-10-15T00:00:00.000Z',
    gestationWeeks: 28,
    language: 'kn'
  },
  {
    id: 'ID-102',
    name: 'Priya Kumari',
    nameAliases: ['Priya Kumar', 'Priya', 'Pria Kumari', 'Priya Kumari'],
    age: 22,
    village: 'Anekal',
    lastVisitDate: '2026-10-20T00:00:00.000Z',
    gestationWeeks: 34,
    language: 'kn'
  },
  {
    id: 'ID-103',
    name: 'Sunita Yadav',
    nameAliases: ['Sunita Yaadav', 'Soneeta Yadav', 'Sunita', 'Suneeta Yadav'],
    age: 28,
    village: 'Chitradurga',
    lastVisitDate: '2026-10-10T00:00:00.000Z',
    gestationWeeks: 22,
    language: 'hi'
  },
  {
    id: 'ID-104',
    name: 'Meena Raju',
    nameAliases: ['Mina Raju', 'Meena Raju', 'Meena', 'Mena Raju'],
    age: 26,
    village: 'Tumkur',
    lastVisitDate: '2026-11-01T00:00:00.000Z',
    gestationWeeks: 38,
    language: 'kn'
  },
  {
    id: 'ID-105',
    name: 'Fatima Begum',
    nameAliases: ['Fathima Begum', 'Fatema Begum', 'Fatima', 'Fathima'],
    age: 30,
    village: 'Raichur',
    lastVisitDate: '2026-10-25T00:00:00.000Z',
    gestationWeeks: null,
    language: 'hi'
  },
  {
    id: 'ID-106',
    name: 'Annapurna Swamy',
    nameAliases: ['Anna Swamy', 'Annapurna', 'Anapurna Swamy', 'Annapurna Swami'],
    age: 25,
    village: 'Mysuru',
    lastVisitDate: '2026-11-05T00:00:00.000Z',
    gestationWeeks: 20,
    language: 'kn'
  },
  {
    id: 'ID-107',
    name: 'Kavitha Reddy',
    nameAliases: ['Kavita Reddy', 'Kavitha Redy', 'Kavitha', 'Kavita'],
    age: 23,
    village: 'Bellary',
    lastVisitDate: '2026-10-30T00:00:00.000Z',
    gestationWeeks: 32,
    language: 'te'
  },
  {
    id: 'ID-108',
    name: 'Sita Devi',
    nameAliases: ['Seeta Devi', 'Sita Bai', 'Sita', 'Seeta'],
    age: 27,
    village: 'Gulbarga',
    lastVisitDate: '2026-10-18T00:00:00.000Z',
    gestationWeeks: 26,
    language: 'hi'
  },
  {
    id: 'ID-109',
    name: 'Murugeswari',
    nameAliases: ['Murugesvari', 'Murugeswari Amma', 'Murugeshwari', 'Murugeswari'],
    age: 29,
    village: 'Krishnagiri',
    lastVisitDate: '2026-11-02T00:00:00.000Z',
    gestationWeeks: 36,
    language: 'ta'
  },
  {
    id: 'ID-110',
    name: 'Rukmini Bai',
    nameAliases: ['Rukhmini Bai', 'Rukmani Bai', 'Rukmini', 'Rukmani'],
    age: 31,
    village: 'Dharwad',
    lastVisitDate: '2026-10-28T00:00:00.000Z',
    gestationWeeks: null,
    language: 'kn'
  }
];

module.exports = { beneficiaries };
