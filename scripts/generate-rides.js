const fs = require('fs');
const path = require('path');

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'rides';

async function fetchAllRecords() {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    throw new Error('Missing Airtable env variables');
  }

  let allRecords = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('sort[0][field]', 'date');
    url.searchParams.set('sort[0][direction]', 'asc');

    if (offset) {
      url.searchParams.set('offset', offset);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Airtable error ${response.status}: ${text}`);
    }

    const json = await response.json();

    allRecords.push(...(json.records || []));
    offset = json.offset || null;
  } while (offset);

  return allRecords;
}

async function run() {
  const records = await fetchAllRecords();

  const items = records.map((record) => ({
    id: record.id || '',
    dealer: record.fields?.dealer || '',
    country: record.fields?.country || '',
    countryCode: record.fields?.countryCode || '',
    city: record.fields?.city || '',
    date: record.fields?.date || '',
    link: record.fields?.link || ''
  }));

  const output = {
    generatedAt: new Date().toISOString(),
    count: items.length,
    items
  };

  const filePath = path.join(process.cwd(), 'rides.json');
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));

  console.log(`rides.json updated: ${output.generatedAt}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});