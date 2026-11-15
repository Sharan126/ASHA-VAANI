'use strict';

/**
 * seed.js — Seeds beneficiary data to console and writes seeded.json
 */

const path = require('path');
const fs = require('fs');
const { beneficiaries } = require('../data/beneficiaries');

console.log('\n========================================');
console.log('  ASHA-Vaani — Beneficiary Seed Data');
console.log('========================================\n');

console.log(`Total beneficiaries: ${beneficiaries.length}\n`);

for (const b of beneficiaries) {
  console.log(`ID: ${b.id}`);
  console.log(`  Name:          ${b.name}`);
  console.log(`  Aliases:       ${b.nameAliases.join(', ')}`);
  console.log(`  Age:           ${b.age}`);
  console.log(`  Village:       ${b.village}`);
  console.log(`  Last Visit:    ${b.lastVisitDate}`);
  console.log(`  Gestation:     ${b.gestationWeeks !== null ? b.gestationWeeks + ' weeks' : 'N/A'}`);
  console.log(`  Language:      ${b.language}`);
  console.log('');
}

// Write seeded.json
const outputPath = path.resolve(__dirname, '../data/seeded.json');
const output = {
  generatedAt: new Date().toISOString(),
  count: beneficiaries.length,
  beneficiaries
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ Seeded data written to: ${outputPath}`);
} catch (err) {
  console.error(`❌ Failed to write seeded.json: ${err.message}`);
  process.exit(1);
}

console.log('\n========================================\n');
