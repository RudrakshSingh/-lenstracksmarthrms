#!/usr/bin/env node
/* eslint-disable no-console */
const axios = require('axios');

const BASE_URL = process.env.PAYROLL_SERVICE_BASE_URL || 'http://localhost:3004';
const TOKEN = process.env.BACKFILL_BEARER_TOKEN || '';
const STORE_ID = process.env.BACKFILL_STORE_ID || '';
const FROM_YEAR = Number(process.env.BACKFILL_FROM_YEAR || new Date().getFullYear());
const FROM_MONTH = Number(process.env.BACKFILL_FROM_MONTH || 1);
const TO_YEAR = Number(process.env.BACKFILL_TO_YEAR || new Date().getFullYear());
const TO_MONTH = Number(process.env.BACKFILL_TO_MONTH || new Date().getMonth() + 1);
const TENANT_ID = process.env.BACKFILL_TENANT_ID || '';
const COMPANY_ID = process.env.BACKFILL_COMPANY_ID || '';

if (!TOKEN || !STORE_ID) {
  console.error('Missing BACKFILL_BEARER_TOKEN or BACKFILL_STORE_ID');
  process.exit(1);
}

function cycleRef(month, year) {
  return `PAYROLL-${year}-${String(month).padStart(2, '0')}`;
}

function headers() {
  return {
    Authorization: TOKEN.startsWith('Bearer ') ? TOKEN : `Bearer ${TOKEN}`,
    'X-Tenant-Id': TENANT_ID,
    'X-Company-Id': COMPANY_ID
  };
}

async function run() {
  const tasks = [];
  for (let y = FROM_YEAR; y <= TO_YEAR; y += 1) {
    const mStart = y === FROM_YEAR ? FROM_MONTH : 1;
    const mEnd = y === TO_YEAR ? TO_MONTH : 12;
    for (let m = mStart; m <= mEnd; m += 1) {
      tasks.push({ month: m, year: y, ref: cycleRef(m, y) });
    }
  }

  for (const item of tasks) {
    try {
      console.log(`Replaying ${item.ref}`);
      await axios.post(
        `${BASE_URL}/api/payroll-workflow/cycle/${item.ref}/replay`,
        { store_id: STORE_ID, payment_method: 'BANK_TRANSFER' },
        { headers: headers(), timeout: 20000 }
      );
      console.log(`SUCCESS ${item.ref}`);
    } catch (error) {
      console.error(`FAILED ${item.ref}:`, error.response?.data?.message || error.message);
    }
  }
}

run();
