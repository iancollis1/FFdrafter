#!/usr/bin/env node
// Builds data/players.json from the raw FantasyPros CSVs in data/raw/, following
// the exact methodology described in the FFdrafter build spec (README §"Data pipeline"):
//
//   1. Parse the Projections CSV in native order -- this is the "scaffold." Each
//      row's FPTS value is a fixed slot.
//   2. Parse the Draft Rankings (ECR) CSV to get an ordered list of names.
//   3. Re-label scaffold slot i with ECR name i.
//   4. Attach each named player's own true fpts/high/low from the Projections
//      file by name-match, where available.
//   5. Dedupe by name (keep first occurrence).
//   6. Reapply the manual risk/opportunity overrides by finding the row whose
//      slot FPTS matches the target player's own raw points-rank position (not
//      ECR rank) and swapping names. Guard swaps so they never collide.
//
// Run: node scripts/build_players.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, '..', 'data', 'raw');
const OUT_PATH = join(__dirname, '..', 'players.json');

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K'];

const RISK_FLAGS = {
  "Ja'Kobi Lane": ['risk', 'Model likes the talent more than experts trust the target share'],
  'Deebo Samuel Sr.': ['risk', 'Age/role concerns experts are pricing in'],
  'Samaje Perine': ['risk', 'Committee back, touches not guaranteed'],
  'Justice Hill': ['risk', 'Committee-role risk in the backfield'],
  'Tank Dell': ['risk', 'Recovering from a serious injury -- worth rechecking closer to the draft'],
  'Blake Grupe': ['risk', 'Kicker rankings are volatile and job-security driven'],
  'Cooper Kupp': ['risk', 'Age + new-team fit uncertainty'],
  'Pat Bryant': ['opportunity', 'Rookie -- experts see real role/target upside the model has not priced in yet'],
  'Jaylin Noel': ['opportunity', 'Rookie -- similar opportunity story ahead of the raw projection'],
};

function normalize(name) {
  return name.replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Minimal CSV line splitter -- fields here are simple quoted/unquoted values
// with no embedded commas-inside-quotes edge cases beyond the standard ones.
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function loadCsv(path) {
  const text = readFileSync(path, 'utf8');
  return text.split(/\r?\n/).filter(l => l.length > 0).map(parseCsvLine);
}

// --- ECR (Draft Rankings) parsing ---------------------------------------
// Header: "RK",TIERS,"PLAYER NAME",TEAM,"BYE",...
// Some rows are blank tier-divider rows (empty player name) -- skip those.
function parseEcr(pos) {
  const rows = loadCsv(join(RAW_DIR, `ecr_${pos}.csv`));
  const [header, ...body] = rows;
  const nameIdx = header.findIndex(h => h.toUpperCase() === 'PLAYER NAME');
  const teamIdx = header.findIndex(h => h.toUpperCase() === 'TEAM');
  const byeIdx = header.findIndex(h => h.toUpperCase().startsWith('BYE'));
  const list = [];
  for (const row of body) {
    const name = row[nameIdx];
    if (!name) continue;
    const byeRaw = row[byeIdx];
    const bye = byeRaw && byeRaw !== '-' ? parseInt(byeRaw, 10) : null;
    list.push({ name, team: row[teamIdx] || null, bye: Number.isFinite(bye) ? bye : null });
  }
  return list;
}

// --- Projections parsing -------------------------------------------------
// Header ends in FPTS. Each player is a 3-row group: main row, then a "high"
// row and a "low" row whose first column is blank and second column is the
// "high"/"low" marker. A stray blank row (" ","","") sometimes follows the
// header and is skipped.
function parseProjections(pos) {
  const rows = loadCsv(join(RAW_DIR, `proj_${pos}.csv`));
  const [header, ...body] = rows;
  const fptsIdx = header.length - 1; // FPTS is always the last column
  const scaffold = []; // native order, one entry per player: {name, team, fpts, high, low}
  let i = 0;
  while (i < body.length) {
    const row = body[i];
    const name = row[0];
    if (!name || name.trim() === '') { i++; continue; }
    const team = row[1] || null;
    const fpts = parseFloat(row[fptsIdx]) || 0;
    let high = fpts, low = fpts;
    if (body[i + 1] && body[i + 1][0] === '' && body[i + 1][1] === 'high') {
      high = parseFloat(body[i + 1][fptsIdx]) || fpts;
    }
    if (body[i + 2] && body[i + 2][0] === '' && body[i + 2][1] === 'low') {
      low = parseFloat(body[i + 2][fptsIdx]) || fpts;
    }
    scaffold.push({ name, team, fpts, high, low });
    i += 3;
  }
  return scaffold;
}

function buildPosition(pos) {
  const ecr = parseEcr(pos);
  const scaffold = parseProjections(pos);

  const projByName = new Map();
  scaffold.forEach((p, idx) => {
    const key = normalize(p.name);
    if (!projByName.has(key)) projByName.set(key, { ...p, rawIdx: idx });
  });

  // Step 3: re-label scaffold slot i with ECR name i. Slot count is bounded
  // by whichever list is shorter (ECR is usually longer than deep-bench
  // projections coverage, or vice versa -- clamp to avoid undefined slots).
  const n = Math.min(ecr.length, scaffold.length);
  const output = [];
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    const ecrPlayer = ecr[i];
    const key = normalize(ecrPlayer.name);
    if (seen.has(key)) continue; // step 5: dedupe by name, keep first occurrence
    seen.add(key);
    const own = projByName.get(key);
    output.push({
      name: ecrPlayer.name,
      pos,
      fpts: Math.round(scaffold[i].fpts * 10) / 10,
      trueFpts: own ? Math.round(own.fpts * 10) / 10 : undefined,
      high: own ? Math.round(own.high * 10) / 10 : undefined,
      low: own ? Math.round(own.low * 10) / 10 : undefined,
      team: ecrPlayer.team,
      bye: ecrPlayer.bye,
      _rawIdx: own ? own.rawIdx : null, // player's own raw-stats rank position, used for override swaps
    });
  }

  // Step 6: reapply manual risk/opportunity overrides.
  const lockedSlots = new Set();
  for (const [targetName, [flagType, flagWhy]] of Object.entries(RISK_FLAGS)) {
    const key = normalize(targetName);
    const curIdx = output.findIndex(p => normalize(p.name) === key);
    if (curIdx === -1) continue; // not a player at this position
    const target = output[curIdx];
    if (target._rawIdx === null || target._rawIdx === undefined) continue; // no raw rank to hold/promote to
    const rawIdx = target._rawIdx;
    if (rawIdx === curIdx) {
      target.flagType = flagType;
      target.flagWhy = flagWhy;
      continue;
    }
    if (lockedSlots.has(curIdx) || lockedSlots.has(rawIdx)) continue; // guard collisions
    if (rawIdx >= output.length) continue;

    const other = output[rawIdx];
    const idFieldsA = { name: target.name, team: target.team, bye: target.bye, trueFpts: target.trueFpts, high: target.high, low: target.low, _rawIdx: target._rawIdx };
    const idFieldsB = { name: other.name, team: other.team, bye: other.bye, trueFpts: other.trueFpts, high: other.high, low: other.low, _rawIdx: other._rawIdx };
    Object.assign(output[curIdx], idFieldsB);
    Object.assign(output[rawIdx], idFieldsA);
    output[rawIdx].flagType = flagType;
    output[rawIdx].flagWhy = flagWhy;
    lockedSlots.add(curIdx);
    lockedSlots.add(rawIdx);
  }

  output.forEach(p => delete p._rawIdx);
  return output;
}

const all = [];
for (const pos of POSITIONS) {
  const players = buildPosition(pos);
  console.log(`${pos}: ${players.length} players`);
  all.push(...players);
}

writeFileSync(OUT_PATH, JSON.stringify(all, null, 2));
console.log(`\nWrote ${all.length} players to ${OUT_PATH}`);

const flagged = all.filter(p => p.flagType);
console.log(`Flagged (risk/opportunity): ${flagged.length}`);
flagged.forEach(p => console.log(`  ${p.name} (${p.pos}) - ${p.flagType}`));
