// scripts/csv_to_json.js
const fs = require('fs');
const Papa = require('papaparse');

const CSV_PATH = 'spotlight-firms-data.csv';
const OUT_PATH = 'data.json';

const csvText = fs.readFileSync(CSV_PATH, 'utf8');
const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

// Ensure required columns exist
const required = ['State','City','Practice Area','Firm Name','Latitude','Longitude'];
const headers = parsed.meta.fields || [];
const missing = required.filter(h => !headers.includes(h));
if (missing.length) {
  console.error('Missing required CSV columns:', missing.join(', '));
  process.exit(1);
}

function buildNested(rows) {
  const data = {};
  for (const r of rows) {
    const state = (r['State']||'').trim();
    const city  = (r['City']||'').trim();
    const firm  = (r['Firm Name']||'').trim();
    const pa    = (r['Practice Area']||'').trim();
    const lat   = Number(r['Latitude']);
    const lon   = Number(r['Longitude']);
    if (!state || !city || !firm || Number.isNaN(lat) || Number.isNaN(lon)) continue;

    if (!data[state]) data[state] = { cities: {} };
    if (!data[state].cities[city]) data[state].cities[city] = { coords: [lon, lat], firms: [] };

    const cityObj = data[state].cities[city];
    let firmObj = cityObj.firms.find(f => f.name === firm);
    if (!firmObj) { firmObj = { name: firm, practiceAreas: [] }; cityObj.firms.push(firmObj); }
    if (pa && !firmObj.practiceAreas.includes(pa)) firmObj.practiceAreas.push(pa);
  }

  // Sort for stability
  const out = {};
  for (const st of Object.keys(data).sort()) {
    const sortedCities = {};
    for (const ct of Object.keys(data[st].cities).sort()) {
      const v = data[st].cities[ct];
      v.firms.sort((a,b)=>a.name.localeCompare(b.name));
      sortedCities[ct] = v;
    }
    out[st] = { cities: sortedCities };
  }
  return out;
}

const nested = buildNested(parsed.data);
fs.writeFileSync(OUT_PATH, JSON.stringify(nested));
console.log('Wrote', OUT_PATH);
