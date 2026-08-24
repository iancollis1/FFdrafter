// FFdrafter -- personal draft assistant for a 10-team half-PPR keeper league.
// Plain JS, no framework, no build step. See README.md for the scoring methodology.

// ---------------------------------------------------------------------------
// League configuration (exact -- do not change)
// ---------------------------------------------------------------------------

const MY_TEAM = 'IanCollis4';

const TEAMS = [
  { id: 'grwin15', name: 'grwin15' },
  { id: 'Dillard09', name: 'Dillard09' },
  { id: 'LackDaddy10', name: 'LackDaddy10' },
  { id: 'RedSled', name: 'RedSled' },
  { id: 'JCTorres97', name: 'JCTorres97' },
  { id: 'mmurphy2015', name: 'mmurphy2015' },
  { id: 'IanCollis4', name: 'IanCollis4 (you)' },
  { id: 'Alegre12', name: 'Alegre12' },
  { id: 'RJMess', name: 'RJMess' },
  { id: 'TheDayDay69', name: 'TheDayDay69' },
];

const DRAFT_ORDER = ['mmurphy2015', 'JCTorres97', 'RJMess', 'Alegre12', 'LackDaddy10',
  'TheDayDay69', 'Dillard09', 'grwin15', 'IanCollis4', 'RedSled'];
const TOTAL_ROUNDS = 17;

// Round 8 pick trades: LackDaddy10's pick -> RJMess (Josh Allen keeper trade);
// IanCollis4's (mine) -> TheDayDay69 (McBride-for-Hampton trade). Receiving
// teams get 2 picks in round 8; trading teams get 0.
const ROUND8_PICK_TRADES = { LackDaddy10: 'RJMess', IanCollis4: 'TheDayDay69' };

const SNAKE_ORDER = [];
for (let r = 1; r <= TOTAL_ROUNDS; r++) {
  const roundTeams = (r % 2 === 1) ? DRAFT_ORDER : [...DRAFT_ORDER].reverse();
  const finalTeams = (r === 8) ? roundTeams.map(t => ROUND8_PICK_TRADES[t] || t) : roundTeams;
  SNAKE_ORDER.push(...finalTeams);
}

const ROSTER_SLOTS = ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE', 'FLEX', 'FLEX', 'K'];

const PRESET_KEEPERS = [
  { name: 'Amon-Ra St. Brown', team: 'grwin15' },
  { name: 'Malik Nabers', team: 'grwin15' },
  { name: 'Jahmyr Gibbs', team: 'Dillard09' },
  { name: 'Ashton Jeanty', team: 'Dillard09' },
  { name: 'Jonathan Taylor', team: 'LackDaddy10' },
  { name: 'Josh Allen', team: 'LackDaddy10' },
  { name: 'Saquon Barkley', team: 'RedSled' },
  { name: 'James Cook III', team: 'RedSled' },
  { name: 'Bijan Robinson', team: 'JCTorres97' },
  { name: 'Kyren Williams', team: 'JCTorres97' },
  { name: 'Justin Jefferson', team: 'mmurphy2015' },
  { name: 'Drake London', team: 'mmurphy2015' },
  { name: 'Derrick Henry', team: 'Alegre12' },
  { name: 'Chase Brown', team: 'Alegre12' },
  { name: 'CeeDee Lamb', team: 'RJMess' },
  { name: 'Puka Nacua', team: 'RJMess' },
  { name: "Ja'Marr Chase", team: 'TheDayDay69' },
  { name: 'Jaxon Smith-Njigba', team: 'TheDayDay69' },
  { name: "De'Von Achane", team: 'IanCollis4' },
  { name: 'Omarion Hampton', team: 'IanCollis4' },
];

// Real live picks already made in the draft as of this build, in the exact
// order they happened (rounds 3 through 9.8) -- ported over from the
// in-progress draft so the tool boots straight into the current state
// instead of an empty board. Bootstrapped once via seedLivePicks() below;
// "Reset draft" intentionally does NOT re-apply this (a reset should mean a
// true reset back to just the keepers).
const LIVE_PICKS_SEED = [
  // Round 3
  { name: 'Christian McCaffrey', team: 'mmurphy2015' }, { name: 'A.J. Brown', team: 'JCTorres97' },
  { name: 'Kenneth Walker III', team: 'RJMess' }, { name: 'Brock Bowers', team: 'Alegre12' },
  { name: 'Nico Collins', team: 'LackDaddy10' }, { name: 'Trey McBride', team: 'TheDayDay69' },
  { name: 'Rashee Rice', team: 'Dillard09' }, { name: 'Jeremiyah Love', team: 'grwin15' },
  { name: 'Javonte Williams', team: 'IanCollis4' }, { name: 'Josh Jacobs', team: 'RedSled' },
  // Round 4
  { name: 'Chris Olave', team: 'RedSled' }, { name: 'Breece Hall', team: 'IanCollis4' },
  { name: 'George Pickens', team: 'grwin15' }, { name: 'Tetairoa McMillan', team: 'Dillard09' },
  { name: 'Travis Etienne Jr.', team: 'TheDayDay69' }, { name: 'DeVonta Smith', team: 'LackDaddy10' },
  { name: 'Zay Flowers', team: 'Alegre12' }, { name: 'Tee Higgins', team: 'RJMess' },
  { name: 'Lamar Jackson', team: 'JCTorres97' }, { name: 'Cam Skattebo', team: 'mmurphy2015' },
  // Round 5
  { name: 'Quinshon Judkins', team: 'mmurphy2015' }, { name: 'Emeka Egbuka', team: 'JCTorres97' },
  { name: 'Colston Loveland', team: 'RJMess' }, { name: 'Ladd McConkey', team: 'Alegre12' },
  { name: "D'Andre Swift", team: 'LackDaddy10' }, { name: 'David Montgomery', team: 'TheDayDay69' },
  { name: 'Jaylen Waddle', team: 'Dillard09' }, { name: 'Bucky Irving', team: 'grwin15' },
  { name: 'Garrett Wilson', team: 'IanCollis4' }, { name: 'Terry McLaurin', team: 'RedSled' },
  // Round 6
  { name: 'Joe Burrow', team: 'RedSled' }, { name: 'DJ Moore', team: 'IanCollis4' },
  { name: 'Bhayshul Tuten', team: 'grwin15' }, { name: 'Tyler Warren', team: 'Dillard09' },
  { name: 'Jadarian Price', team: 'TheDayDay69' }, { name: 'Jameson Williams', team: 'LackDaddy10' },
  { name: 'Christian Watson', team: 'Alegre12' }, { name: 'Luther Burden III', team: 'RJMess' },
  { name: 'Mike Evans', team: 'JCTorres97' }, { name: 'Brian Thomas Jr.', team: 'mmurphy2015' },
  // Round 7
  { name: 'Rome Odunze', team: 'mmurphy2015' }, { name: 'Jaylen Warren', team: 'JCTorres97' },
  { name: 'TreVeyon Henderson', team: 'RJMess' }, { name: 'Davante Adams', team: 'Alegre12' },
  { name: 'Carnell Tate', team: 'LackDaddy10' }, { name: 'Parker Washington', team: 'TheDayDay69' },
  { name: 'Drake Maye', team: 'Dillard09' }, { name: 'Kyle Pitts Sr.', team: 'grwin15' },
  { name: 'Marvin Harrison Jr.', team: 'IanCollis4' }, { name: 'Chuba Hubbard', team: 'RedSled' },
  // Round 8
  { name: 'DK Metcalf', team: 'RedSled' }, { name: 'Jalen Hurts', team: 'TheDayDay69' },
  { name: 'Rhamondre Stevenson', team: 'grwin15' }, { name: 'RJ Harvey', team: 'Dillard09' },
  { name: 'Tony Pollard', team: 'TheDayDay69' }, { name: 'Jonathon Brooks', team: 'RJMess' },
  { name: 'Patrick Mahomes II', team: 'Alegre12' }, { name: 'Jordyn Tyson', team: 'RJMess' },
  { name: 'Courtland Sutton', team: 'JCTorres97' }, { name: 'J.K. Dobbins', team: 'mmurphy2015' },
  // Round 9 (picks 9.1-9.8)
  { name: 'Dak Prescott', team: 'mmurphy2015' }, { name: 'Rico Dowdle', team: 'JCTorres97' },
  { name: 'Mark Andrews', team: 'RJMess' }, { name: 'Kyle Monangai', team: 'Alegre12' },
  { name: 'Jayden Daniels', team: 'LackDaddy10' }, { name: 'Michael Wilson', team: 'TheDayDay69' },
  { name: 'Alec Pierce', team: 'Dillard09' }, { name: 'Mike Washington Jr.', team: 'grwin15' },
  // Round 9 (picks 9.9-9.10) -- these two only came with a pick slot + player,
  // no team name, so the team is derived from SNAKE_ORDER for that slot.
  { name: 'Tucker Kraft', team: 'IanCollis4' }, { name: 'Sam LaPorta', team: 'RedSled' },
  // Round 10
  { name: 'Makai Lemon', team: 'RedSled' }, { name: 'Caleb Williams', team: 'IanCollis4' },
  { name: 'Jordan Addison', team: 'grwin15' }, { name: 'Jacory Croskey-Merritt', team: 'Dillard09' },
  { name: 'Chris Godwin Jr.', team: 'TheDayDay69' }, { name: 'Michael Pittman Jr.', team: 'LackDaddy10' },
  { name: 'Jordan Mason', team: 'Alegre12' }, { name: 'Quentin Johnston', team: 'RJMess' },
  { name: 'Harold Fannin Jr.', team: 'JCTorres97' }, { name: 'George Kittle', team: 'mmurphy2015' },
  // Round 11
  { name: 'Blake Corum', team: 'mmurphy2015' }, { name: 'Jayden Reed', team: 'JCTorres97' },
  { name: 'Rachaad White', team: 'RJMess' }, { name: 'Kenny Gainwell', team: 'Alegre12' },
  { name: 'Josh Downs', team: 'LackDaddy10' }, { name: 'Aaron Jones Sr.', team: 'TheDayDay69' },
  { name: "Wan'Dale Robinson", team: 'Dillard09' }, { name: 'Justin Herbert', team: 'grwin15' },
  { name: 'Travis Kelce', team: 'IanCollis4' }, { name: 'KC Concepcion', team: 'RedSled' },
  // Round 12 (through pick 12.8 -- 12.9 JCTorres97 is on the clock, left undrafted)
  { name: 'Xavier Worthy', team: 'RedSled' }, { name: 'Stefon Diggs', team: 'IanCollis4' },
  { name: 'Tyler Allgeier', team: 'grwin15' }, { name: 'Matthew Golden', team: 'Dillard09' },
  { name: "De'Zhaun Stribling", team: 'TheDayDay69' }, { name: 'Brandon Aubrey', team: 'LackDaddy10' },
  { name: 'Deebo Samuel Sr.', team: 'Alegre12' }, { name: 'Jakobi Meyers', team: 'RJMess' },
];

const FRAGILITY_DISCOUNT = { RB: 0.065, WR: 0.02, QB: 0.02, TE: 0.03, K: 0.0 };

// Per-team tendency leans, from multi-year real draft-history review (a lean is
// only kept here once it repeats across 2+ years of evidence).
const TEAM_LEAN = {
  RedSled: { RB: 1.6 },
  grwin15: { TE: 1.5 },
  Dillard09: { RB: 1.2 },
  JCTorres97: { RB: 1.15 },
  LackDaddy10: { QB: 1.4 },
  mmurphy2015: { RB: 1.15 },
  Alegre12: { RB: 1.15, TE: 1.3 },
  RJMess: { WR: 1.3, RB: 0.9 },
  TheDayDay69: { WR: 1.2 },
};

// Opponent-modeling single-slot demand (QB/TE/K). Kept entirely separate from
// mySingleSlotNeedState()'s MIN/MAX below -- these two must never share a
// lookup table (a real bug here once silently changed opponent behavior when
// personal need logic was edited).
const GENERIC_MAX = { QB: 2, TE: 2, K: 1 };
const GENERIC_MIN = { QB: 1, TE: 1, K: 1 };

// Personal single-slot demand (QB/TE), used only for My Value -- never read
// by the opponent simulation.
const MY_SINGLE_SLOT = { MIN: 1, MAX: 2 };

// Shared-FLEX demand (RB/WR), used by BOTH my own need multiplier and the
// opponent simulation's teamNeedMult() -- this one genuinely is shared logic.
const FLEX_MIN = { RB: 2, WR: 3 };

const STORAGE_KEY = 'ff-draft-live-2026';

let SIM_RUNS = 250;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let PLAYERS = [];
let PLAYER_BY_NAME = new Map();
let SLEEPER_RANK = {};

let drafted = {};   // name -> teamId
let pickOrder = []; // [{name, by, isPreset}]

let activePosTab = 'ALL';
let activeMode = 'league'; // league | mine | riskadj | nextpick | takenow
let showDrafted = false;
let searchQuery = '';
let showRadar = false;

// Cached per-render simulation output, recomputed only when the board state
// (drafted/pickOrder) changes -- the Monte Carlo pass is too expensive to
// rerun on every keystroke in the search box.
let simCache = null; // { survival: Map<name, frac>, nextPick: Map<name, frac>, positionReplacementAvg: {pos: avgMyValue} }

// ---------------------------------------------------------------------------
// Persistence (§7) -- localStorage only, corrupt/missing data falls back to
// empty state silently, never crashes the render.
// ---------------------------------------------------------------------------

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { drafted = {}; pickOrder = []; return; }
    const parsed = JSON.parse(raw);
    drafted = (parsed && typeof parsed.drafted === 'object' && parsed.drafted) || {};
    pickOrder = (parsed && Array.isArray(parsed.pickOrder)) ? parsed.pickOrder : [];
  } catch (e) {
    drafted = {};
    pickOrder = [];
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ drafted, pickOrder }));
  } catch (e) {
    // storage unavailable/full -- state simply won't persist this session
  }
}

// ---------------------------------------------------------------------------
// Keeper reconciliation -- ported from the original draft_tool.html verbatim.
// ---------------------------------------------------------------------------

function reconcilePresetKeepers() {
  const currentPairs = new Set(PRESET_KEEPERS.map(k => k.name + '|' + k.team));
  const existingPresetPairs = new Set(pickOrder.filter(p => p.isPreset).map(p => p.name + '|' + p.by));
  let changed = false;

  // Remove preset entries that no longer match the current keeper list (e.g. a
  // keeper correction). Only ever touches entries flagged isPreset -- real
  // live picks are never affected.
  pickOrder = pickOrder.filter(p => {
    if (!p.isPreset) return true;
    if (!currentPairs.has(p.name + '|' + p.by)) {
      delete drafted[p.name];
      changed = true;
      return false;
    }
    return true;
  });

  // Add any current presets that are missing, but never overwrite a name
  // that's already genuinely drafted (e.g. picked live in the meantime).
  PRESET_KEEPERS.forEach(k => {
    const key = k.name + '|' + k.team;
    if (!existingPresetPairs.has(key) && !drafted[k.name]) {
      drafted[k.name] = k.team;
      pickOrder.push({ name: k.name, by: k.team, isPreset: true });
      changed = true;
    }
  });

  return changed;
}

// Bootstraps the real live picks already made (LIVE_PICKS_SEED) into state,
// idempotently -- only adds a pick if that player isn't already drafted.
// Distinct from reconcilePresetKeepers(): these are real isPreset:false
// picks, never removed or re-checked against a changing source list.
function seedLivePicks() {
  let changed = false;
  LIVE_PICKS_SEED.forEach(k => {
    if (!drafted[k.name]) {
      drafted[k.name] = k.team;
      pickOrder.push({ name: k.name, by: k.team, isPreset: false });
      changed = true;
    }
  });
  return changed;
}

// ---------------------------------------------------------------------------
// Roster helpers
// ---------------------------------------------------------------------------

function playerByName(name) {
  return PLAYER_BY_NAME.get(name);
}

function teamPositionCounts(teamId) {
  const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0 };
  pickOrder.forEach(p => {
    if (p.by !== teamId) return;
    const player = playerByName(p.name);
    if (player && counts.hasOwnProperty(player.pos)) counts[player.pos]++;
  });
  return counts;
}

function undraftedPlayers(pos) {
  return PLAYERS.filter(p => !drafted[p.name] && (pos === 'ALL' || p.pos === pos));
}

// ---------------------------------------------------------------------------
// §5a League Value -- demand-adjusted replacement baseline
// ---------------------------------------------------------------------------

function remainingFlexSharedN(pos) {
  let guaranteedRemaining = 0;
  let flexCapacityRemaining = 0;
  TEAMS.forEach(t => {
    const counts = teamPositionCounts(t.id);
    guaranteedRemaining += Math.max(0, FLEX_MIN[pos] - (counts[pos] || 0));
    const excessRB = Math.max(0, (counts.RB || 0) - FLEX_MIN.RB);
    const excessWR = Math.max(0, (counts.WR || 0) - FLEX_MIN.WR);
    flexCapacityRemaining += Math.max(0, 2 - (excessRB + excessWR));
  });
  const share = pos === 'RB' ? 13 / 22 : 9 / 22;
  return Math.max(1, guaranteedRemaining + Math.round(flexCapacityRemaining * share));
}

function teamsStillNeeding(pos) {
  let filled = 0;
  TEAMS.forEach(t => {
    const have = pickOrder.some(p => p.by === t.id && playerByName(p.name) && playerByName(p.name).pos === pos);
    if (have) filled++;
  });
  return Math.max(1, TEAMS.length - filled);
}

function positionN(pos) {
  return (pos === 'RB' || pos === 'WR') ? remainingFlexSharedN(pos) : teamsStillNeeding(pos);
}

function computeBaselines() {
  const baselines = {};
  ['QB', 'RB', 'WR', 'TE', 'K'].forEach(pos => {
    const sorted = undraftedPlayers(pos).slice().sort((a, b) => b.fpts - a.fpts);
    if (sorted.length === 0) { baselines[pos] = 0; return; }
    const n = positionN(pos);
    const idx = Math.min(n - 1, sorted.length - 1);
    baselines[pos] = sorted[idx].fpts;
  });
  return baselines;
}

function leagueValue(player, baselines) {
  return player.fpts - (baselines[player.pos] ?? 0);
}

// ---------------------------------------------------------------------------
// §5b My Value -- need-adjusted, personal to MY_TEAM only
// ---------------------------------------------------------------------------

// Shared RB/WR zone logic -- used both for my own need multiplier AND, with a
// different team's counts, inside the opponent simulation's teamNeedMult().
function needState(pos, counts) {
  const have = counts[pos] || 0;
  const min = FLEX_MIN[pos];
  if (have < min) {
    const remaining = min - have;
    return { zone: 'urgent', mult: 1 + 0.15 * remaining };
  }
  if (have < min + 2) return { zone: 'neutral', mult: 1.0 };
  return { zone: 'discount', mult: 0.4 };
}

// Personal QB/TE single-slot zone logic. Deliberately its own function, never
// merged with teamNeedMult()'s GENERIC_MIN/MAX opponent-modeling path.
function mySingleSlotNeedState(pos, counts) {
  const have = counts[pos] || 0;
  if (have < MY_SINGLE_SLOT.MIN) {
    const remaining = MY_SINGLE_SLOT.MIN - have;
    return { zone: 'urgent', mult: 1 + 0.15 * remaining };
  }
  if (have === MY_SINGLE_SLOT.MIN) return { zone: 'neutral', mult: 1.0 };
  return { zone: 'discount', mult: 0.4 };
}

function myNeedMult(pos, myCounts) {
  if (pos === 'RB' || pos === 'WR') return needState(pos, myCounts).mult;
  if (pos === 'QB' || pos === 'TE') return mySingleSlotNeedState(pos, myCounts).mult;
  return 1.0; // K: pass-through, not need-adjusted
}

function myValue(player, baselines, myCounts) {
  return leagueValue(player, baselines) * myNeedMult(player.pos, myCounts);
}

// ---------------------------------------------------------------------------
// §5c Risk-Adjusted Value -- personal display-only lens, never feeds back
// into League Value, My Value, or the opponent simulation.
// ---------------------------------------------------------------------------

function riskAdjValue(myVal, pos) {
  return Math.round(myVal * (1 - (FRAGILITY_DISCOUNT[pos] || 0)) * 10) / 10;
}

// ---------------------------------------------------------------------------
// §5d Opponent-behavior simulation
// ---------------------------------------------------------------------------

function teamNeedMult(teamId, pos, counts) {
  if (pos === 'RB' || pos === 'WR') return needState(pos, counts).mult;
  const have = counts[pos] || 0;
  if (have >= GENERIC_MAX[pos]) return 0.15;
  if (have < GENERIC_MIN[pos]) return 1.3;
  if (pos === 'QB' && have === GENERIC_MIN[pos]) return 1.2;
  return 1.0;
}

function leagueValueWeight(pickNumber) {
  if (pickNumber <= 60) return 0.15;
  if (pickNumber >= 80) return 1.0;
  return 0.15 + (pickNumber - 60) / 20 * 0.85;
}

// The sequence of team ids that will pick before MY_TEAM's next turn. If it's
// currently my turn, this is the window AFTER this pick, up to my following
// turn (this pick itself is not simulated).
function pickWindowTeams() {
  let i = pickOrder.length;
  if (SNAKE_ORDER[i] === MY_TEAM) i++;
  const teams = [];
  while (i < SNAKE_ORDER.length && SNAKE_ORDER[i] !== MY_TEAM) {
    teams.push(SNAKE_ORDER[i]);
    i++;
  }
  return teams;
}

function currentPicker() {
  return SNAKE_ORDER[pickOrder.length] ?? null;
}

function runSimulation(baselines, myCounts) {
  const windowTeams = pickWindowTeams();
  const survivalCount = new Map();
  const nextPickCount = new Map();
  const posReplacementSums = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0 };
  const posReplacementCounts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0 };

  const basePool = PLAYERS.filter(p => !drafted[p.name]);
  basePool.forEach(p => survivalCount.set(p.name, 0));

  if (windowTeams.length === 0) {
    // Nobody picks before my turn (e.g. draft is effectively over, or it's my
    // turn with no further live picks left) -- everyone survives trivially.
    basePool.forEach(p => survivalCount.set(p.name, SIM_RUNS));
    const bestByPos = {};
    basePool.forEach(p => {
      const val = myValue(p, baselines, myCounts);
      if (!bestByPos[p.pos] || val > bestByPos[p.pos].val) bestByPos[p.pos] = { name: p.name, val };
    });
    Object.entries(bestByPos).forEach(([pos, b]) => {
      posReplacementSums[pos] = b.val;
      posReplacementCounts[pos] = 1;
      nextPickCount.set(b.name, SIM_RUNS);
    });
  } else {
    // League Value is fixed for the whole simulation (baselines don't change
    // mid-window), so the pool can be sorted ONCE and reused every run/step by
    // filtering (which preserves order) instead of re-sorting from scratch --
    // the filtered index IS the rank. This is the difference between an O(n
    // log n) sort and an O(n) filter on every single simulated pick.
    const sortedByLV = basePool.slice().sort((a, b) => leagueValue(b, baselines) - leagueValue(a, baselines));
    const lvRankFallback = new Map();
    sortedByLV.forEach((p, idx) => lvRankFallback.set(p.name, idx + 1));

    const teamInitialCounts = {};
    TEAMS.forEach(t => { teamInitialCounts[t.id] = teamPositionCounts(t.id); });

    for (let run = 0; run < SIM_RUNS; run++) {
      const takenThisRun = new Set();
      const simCounts = {};
      TEAMS.forEach(t => { simCounts[t.id] = { ...teamInitialCounts[t.id] }; });

      windowTeams.forEach((teamId, step) => {
        const pickNumber = pickOrder.length + step + 1;
        const candidates = sortedByLV.filter(p => !takenThisRun.has(p.name));
        if (candidates.length === 0) return;

        const w = leagueValueWeight(pickNumber);
        const lean = TEAM_LEAN[teamId] || null;
        const counts = simCounts[teamId];

        let best = null, bestScore = -Infinity;
        candidates.forEach((p, idx) => {
          const lvRank = idx + 1;
          const slRank = SLEEPER_RANK[p.name] ?? lvRankFallback.get(p.name) ?? lvRank;
          const blendedRank = w * lvRank + (1 - w) * slRank;
          const score = 1 / blendedRank;
          const noise = 0.75 + Math.random() * 0.5;
          const leanMult = (lean && lean[p.pos]) || 1.0;
          const need = teamNeedMult(teamId, p.pos, counts);
          const total = score * noise * leanMult * need;
          if (total > bestScore) { bestScore = total; best = p; }
        });

        if (best) {
          takenThisRun.add(best.name);
          counts[best.pos] = (counts[best.pos] || 0) + 1;
        }
      });

      basePool.forEach(p => {
        if (!takenThisRun.has(p.name)) survivalCount.set(p.name, survivalCount.get(p.name) + 1);
      });

      const survivors = basePool.filter(p => !takenThisRun.has(p.name));
      const bestByPos = {};
      survivors.forEach(p => {
        const val = myValue(p, baselines, myCounts);
        if (!bestByPos[p.pos] || val > bestByPos[p.pos].val) bestByPos[p.pos] = { name: p.name, val };
      });
      Object.entries(bestByPos).forEach(([pos, b]) => {
        posReplacementSums[pos] += b.val;
        posReplacementCounts[pos]++;
      });
      let overallBestName = null, overallBestVal = -Infinity;
      survivors.forEach(p => {
        const val = myValue(p, baselines, myCounts);
        if (val > overallBestVal) { overallBestVal = val; overallBestName = p.name; }
      });
      if (overallBestName) nextPickCount.set(overallBestName, (nextPickCount.get(overallBestName) || 0) + 1);
    }
  }

  const survival = new Map();
  survivalCount.forEach((count, name) => survival.set(name, count / SIM_RUNS));
  const nextPick = new Map();
  nextPickCount.forEach((count, name) => nextPick.set(name, count / SIM_RUNS));
  const positionReplacementAvg = {};
  ['QB', 'RB', 'WR', 'TE', 'K'].forEach(pos => {
    positionReplacementAvg[pos] = posReplacementCounts[pos] > 0
      ? posReplacementSums[pos] / posReplacementCounts[pos]
      : 0;
  });

  return { survival, nextPick, positionReplacementAvg };
}

// ---------------------------------------------------------------------------
// §5e Take-Now Score
// ---------------------------------------------------------------------------

function takeNowScore(p, survivalFraction, positionReplacementAvg) {
  const replacementValue = positionReplacementAvg[p.pos] ?? p.myValue;
  const gapToReplacement = Math.max(0, p.myValue - replacementValue);
  const urgencyPremium = (1 - survivalFraction) * gapToReplacement;
  return p.myValue + urgencyPremium;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function refreshSimCache() {
  const baselines = computeBaselines();
  const myCounts = teamPositionCounts(MY_TEAM);
  simCache = { baselines, myCounts, ...runSimulation(baselines, myCounts) };
}

function computeRows() {
  const { baselines, myCounts, survival, nextPick, positionReplacementAvg } = simCache;
  const pool = showDrafted ? PLAYERS : undraftedPlayers('ALL');
  const byPos = activePosTab === 'ALL' ? pool : pool.filter(p => p.pos === activePosTab);
  const bySearch = searchQuery
    ? byPos.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : byPos;

  const rows = bySearch.map(p => {
    const lv = leagueValue(p, baselines);
    const mv = myValue(p, baselines, myCounts);
    const rav = riskAdjValue(mv, p.pos);
    const surv = survival.get(p.name) ?? 1;
    const npPct = nextPick.get(p.name) ?? 0;
    const tns = takeNowScore({ ...p, myValue: mv }, surv, positionReplacementAvg);
    return {
      player: p,
      isDrafted: !!drafted[p.name],
      draftedBy: drafted[p.name] || null,
      leagueValue: lv,
      myValue: mv,
      riskAdjValue: rav,
      survival: surv,
      nextPickPct: npPct,
      takeNowScore: tns,
    };
  });

  const modeKey = { league: 'leagueValue', mine: 'myValue', riskadj: 'riskAdjValue', nextpick: 'nextPickPct', takenow: 'takeNowScore' }[activeMode];
  rows.sort((a, b) => (b[modeKey] ?? 0) - (a[modeKey] ?? 0));
  return rows;
}

function render() {
  try {
    if (!simCache) refreshSimCache();
    renderTurnBanner();
    renderRunAlert();
    renderNeedBar();
    renderGuidance();
    renderBoard();
    renderRoster();
    const radarPanel = document.getElementById('radarPanel');
    if (radarPanel) radarPanel.style.display = showRadar ? '' : 'none';
    if (showRadar) renderRadar(); else clearRadar();
  } catch (e) {
    const boardEl = document.getElementById('board');
    if (boardEl) {
      boardEl.innerHTML = `<div class="row" style="color:var(--red);padding:16px;">
        The draft tool failed to render. Error: ${(e && e.message) ? String(e.message).replace(/</g, '&lt;') : 'unknown'}.
        Try closing and reopening. If this keeps happening, this exact message is worth sharing so it can be fixed.
      </div>`;
    }
    console.error('render() failed:', e);
  }
}

function renderTurnBanner() {
  const el = document.getElementById('turnBanner');
  if (!el) return;
  const picker = currentPicker();
  if (picker === MY_TEAM) {
    el.textContent = "YOUR TURN TO PICK";
    return;
  }
  if (picker === null) {
    el.textContent = 'Draft complete';
    return;
  }
  const windowTeams = pickWindowTeams();
  const counts = {};
  windowTeams.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  const desc = Object.entries(counts).map(([id, n]) => {
    const label = TEAMS.find(t => t.id === id)?.name || id;
    return n > 1 ? `${label} x${n}` : label;
  }).join(', ');
  el.textContent = `${windowTeams.length} pick${windowTeams.length === 1 ? '' : 's'} until your turn (currently ${TEAMS.find(t => t.id === picker)?.name || picker}): ${desc}`;
}

function renderRunAlert() {
  const el = document.getElementById('runAlert');
  if (!el) return;
  const last5 = pickOrder.slice(-5);
  const posCounts = {};
  last5.forEach(p => {
    const player = playerByName(p.name);
    if (!player) return;
    posCounts[player.pos] = (posCounts[player.pos] || 0) + 1;
  });
  const runPos = Object.entries(posCounts).find(([, n]) => n >= 3);
  if (runPos) {
    el.style.display = '';
    el.textContent = `RUN ALERT: ${runPos[1]} of the last 5 picks were ${runPos[0]}`;
  } else {
    el.style.display = 'none';
  }
}

function renderNeedBar() {
  const el = document.getElementById('needBar');
  if (!el) return;
  const myCounts = teamPositionCounts(MY_TEAM);
  const parts = ['QB', 'RB', 'WR', 'TE', 'K'].map(pos => {
    const zone = pos === 'K' ? 'neutral' : (pos === 'RB' || pos === 'WR'
      ? needState(pos, myCounts).zone
      : mySingleSlotNeedState(pos, myCounts).zone);
    return `<span class="needchip ${zone}"><span class="tag">${pos}</span>${myCounts[pos] || 0} (${zone})</span>`;
  });
  el.innerHTML = parts.join('');
}

function renderGuidance() {
  const el = document.getElementById('guidance');
  if (!el) return;
  const picker = currentPicker();
  const { baselines, myCounts, survival, nextPick, positionReplacementAvg } = simCache;
  // Kickers are excluded from these recommendation cards: the demand-adjusted
  // baseline correctly reflects that most teams already have a kicker, which
  // shrinks the effective replacement pool and can make a K's Take-Now/Next-Pick
  // numbers look inflated despite being strategically irrelevant this early
  // (documented, expected quirk -- see README).
  const pool = undraftedPlayers('ALL').filter(p => p.pos !== 'K').map(p => {
    const mv = myValue(p, baselines, myCounts);
    return { player: p, myValue: mv, survival: survival.get(p.name) ?? 1, nextPickPct: nextPick.get(p.name) ?? 0 };
  });

  if (picker !== MY_TEAM) {
    const top4 = pool.slice().sort((a, b) => b.nextPickPct - a.nextPickPct).slice(0, 4);
    el.innerHTML = `<h2>Waiting -- likely available at your turn</h2>` + top4.map(r =>
      `<div class="rec"><div class="rectag">NEXT PICK ${(r.nextPickPct * 100).toFixed(0)}%</div>
       <div class="recname">${r.player.name} <span class="posbadge pb-${r.player.pos}">${r.player.pos}</span></div>
       <div class="recval">${r.myValue.toFixed(1)}</div></div>`
    ).join('');
    return;
  }

  const topOverall = pool.slice().sort((a, b) => takeNowScore({ ...a.player, myValue: a.myValue }, a.survival, positionReplacementAvg) - takeNowScore({ ...b.player, myValue: b.myValue }, b.survival, positionReplacementAvg)).pop();
  const bestValue = pool.slice().sort((a, b) => b.myValue - a.myValue)[0];
  const urgentPos = ['QB', 'RB', 'WR', 'TE'].map(pos => ({
    pos,
    zone: (pos === 'RB' || pos === 'WR') ? needState(pos, myCounts).zone : mySingleSlotNeedState(pos, myCounts).zone,
  })).find(z => z.zone === 'urgent');
  const fillsHole = urgentPos
    ? pool.filter(r => r.player.pos === urgentPos.pos).sort((a, b) => b.myValue - a.myValue)[0]
    : bestValue;
  const safestFloor = pool.slice().sort((a, b) => (b.player.low ?? b.player.fpts) - (a.player.low ?? a.player.fpts))[0];

  const cards = [
    ['Top overall pick', topOverall],
    ['Best raw value', bestValue],
    ['Fills biggest roster hole' + (urgentPos ? ` (${urgentPos.pos})` : ''), fillsHole],
    ['Safest floor', safestFloor],
  ];
  el.innerHTML = `<h2>Your turn</h2>` + cards.filter(([, r]) => r).map(([tag, r], i) =>
    `<div class="rec${i === 0 ? ' main' : ''}"><div class="rectag">${tag.toUpperCase()}</div>
     <div class="recname">${r.player.name} <span class="posbadge pb-${r.player.pos}">${r.player.pos}</span></div>
     <div class="recval">${r.myValue.toFixed(1)}</div></div>`
  ).join('');
}

function tierBreakN(pos) {
  return positionN(pos);
}

function renderBoard() {
  const el = document.getElementById('board');
  if (!el) return;
  const rows = computeRows();
  const activeValueLabel = { league: 'LEAGUE', mine: 'MINE', riskadj: 'RISK-ADJ', nextpick: 'NEXT PICK %', takenow: 'TAKE-NOW' }[activeMode];
  const cutoff = activePosTab !== 'ALL' ? tierBreakN(activePosTab) : null;

  const myCounts = teamPositionCounts(MY_TEAM);
  const myByePositions = {};
  pickOrder.filter(p => p.by === MY_TEAM).forEach(p => {
    const pl = playerByName(p.name);
    if (!pl || pl.bye == null) return;
    (myByePositions[pl.pos] = myByePositions[pl.pos] || new Set()).add(pl.bye);
  });

  let html = `<div class="row hdr"><div>#</div><div>Player</div><div>FPTS</div><div>${activeValueLabel}</div><div>Survives</div><div>Draft</div></div>`;

  rows.forEach((r, i) => {
    if (cutoff !== null && i === cutoff) {
      html += `<div class="tierbreak">-- replacement level (top ${cutoff}) --</div>`;
    }
    const p = r.player;
    const valField = { league: r.leagueValue, mine: r.myValue, riskadj: r.riskAdjValue, nextpick: r.nextPickPct * 100, takenow: r.takeNowScore }[activeMode];
    const valDisplay = activeMode === 'nextpick' ? `${valField.toFixed(0)}%` : valField.toFixed(1);
    const byeConflict = !r.isDrafted && myByePositions[p.pos] && myByePositions[p.pos].has(p.bye);
    const flag = p.flagType ? `<span class="flagtag ${p.flagType}" title="${(p.flagWhy || '').replace(/"/g, '&quot;')}">${p.flagType}</span>` : '';
    const teamOptions = TEAMS.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

    html += `<div class="row${r.isDrafted ? ' drafted' : ''}" data-name="${p.name.replace(/"/g, '&quot;')}">
      <div class="cell-rank rank">${i + 1}</div>
      <div class="cell-name name">${p.name}<span class="posbadge pb-${p.pos}">${p.pos}</span>${p.bye != null ? `<span class="byetag${byeConflict ? ' conflict' : ''}">bye ${p.bye}</span>` : ''}${flag}</div>
      <div class="cell-fpts fpts"><span class="mini-label">FPTS</span>${p.fpts.toFixed(1)}</div>
      <div class="cell-val val ${valField >= 0 ? 'pos' : 'neg'}"><span class="mini-label">${activeValueLabel}</span>${valDisplay}</div>
      <div class="cell-survival fpts"><span class="mini-label">SURV</span>${(r.survival * 100).toFixed(0)}%</div>
      <div class="cell-acts acts">
        ${r.isDrafted
        ? `<span class="byetag">${TEAMS.find(t => t.id === r.draftedBy)?.name || r.draftedBy}</span><button class="btn undo" data-action="undo" data-name="${p.name.replace(/"/g, '&quot;')}">Undo</button>`
        : `<select class="teamsel" data-team-select="${p.name.replace(/"/g, '&quot;')}">${teamOptions}</select><button class="btn" data-action="draft" data-name="${p.name.replace(/"/g, '&quot;')}">Draft &rarr;</button>`}
      </div>
    </div>`;
  });

  el.innerHTML = html || `<div class="row" style="padding:16px;color:var(--text-mute);">No players match.</div>`;

  el.querySelectorAll('[data-team-select]').forEach(sel => {
    sel.value = MY_TEAM;
  });
}

function populateRosterTeamSelect() {
  const sel = document.getElementById('rosterTeamSelect');
  if (!sel || sel.options.length > 0) return; // populate once; value persists across renders
  TEAMS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });
  sel.value = MY_TEAM;
}

// Shows one team's roster at a time (switchable via #rosterTeamSelect) instead
// of stacking all 10 -- avoids a very long scroll on a phone.
function renderRoster() {
  const el = document.getElementById('rosterPanel');
  if (!el) return;
  populateRosterTeamSelect();
  const sel = document.getElementById('rosterTeamSelect');
  const teamId = (sel && sel.value) || MY_TEAM;
  const team = TEAMS.find(t => t.id === teamId) || TEAMS[0];

  const picks = pickOrder.filter(p => p.by === team.id).map(p => playerByName(p.name)).filter(Boolean);
  const slots = assignRosterSlots(picks);
  const byeConflicts = findByeConflicts(slots);
  const slotRows = slots.map(s =>
    `<div class="slot"><span class="slotlabel">${s.slot}</span><span class="slotname${s.player ? '' : ' empty'}">${s.player ? `${s.player.name} (bye ${s.player.bye ?? '-'})` : '--'}</span></div>`
  ).join('');
  el.innerHTML = `<div class="panel">${byeConflicts.length ? `<div class="byetag conflict" style="margin-bottom:8px;">Bye-week conflict: ${byeConflicts.join(', ')}</div>` : ''}${slotRows}</div>`;
}

function assignRosterSlots(picks) {
  const remaining = picks.slice();
  const slots = ROSTER_SLOTS.map(slotType => {
    let idx = -1;
    if (slotType === 'FLEX') {
      idx = remaining.findIndex(p => p.pos === 'RB' || p.pos === 'WR');
    } else {
      idx = remaining.findIndex(p => p.pos === slotType);
    }
    if (idx === -1) return { slot: slotType, player: null };
    const [player] = remaining.splice(idx, 1);
    return { slot: slotType, player };
  });
  return slots;
}

function findByeConflicts(slots) {
  const byPos = {};
  slots.forEach(s => {
    if (!s.player || s.player.bye == null) return;
    (byPos[s.player.pos] = byPos[s.player.pos] || []).push(s.player.bye);
  });
  const conflicts = [];
  Object.entries(byPos).forEach(([pos, byes]) => {
    const seen = new Set();
    byes.forEach(b => { if (seen.has(b)) conflicts.push(pos); seen.add(b); });
  });
  return conflicts;
}

function renderRadar() {
  const svg = document.getElementById('radarSvg');
  if (!svg) return;
  const { baselines, myCounts, survival } = simCache;
  // Same K exclusion as renderGuidance() -- see the comment there.
  const pool = undraftedPlayers('ALL').filter(p => p.pos !== 'K').map(p => ({
    player: p,
    myValue: myValue(p, baselines, myCounts),
    survival: survival.get(p.name) ?? 1,
  })).sort((a, b) => b.myValue - a.myValue).slice(0, 40);

  const W = 640, H = 320, PAD = 30;
  const maxVal = Math.max(1, ...pool.map(p => p.myValue));
  const minVal = Math.min(0, ...pool.map(p => p.myValue));
  const xScale = v => PAD + (v - minVal) / (maxVal - minVal || 1) * (W - 2 * PAD);
  const yScale = surv => PAD + (surv) * (H - 2 * PAD); // y = inverted survival (low survival = top)

  let html = `<line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" stroke="var(--line)" />
    <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="var(--line)" />
    <text x="${W - PAD}" y="${PAD}" class="radar-quadrant-label" text-anchor="end">TAKE-NOW</text>
    <text x="${PAD}" y="${H - PAD}" class="radar-quadrant-label">SAFE-TO-WAIT</text>`;

  pool.forEach(p => {
    const x = xScale(p.myValue);
    const y = yScale(1 - p.survival);
    html += `<circle class="radar-dot" cx="${x}" cy="${y}" r="4" fill="var(--gold)"><title>${p.player.name}</title></circle>`;
  });

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = html;
}

function clearRadar() {
  const svg = document.getElementById('radarSvg');
  if (svg) svg.innerHTML = '';
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

function draftPlayer(name, teamId) {
  if (drafted[name]) return;
  drafted[name] = teamId;
  pickOrder.push({ name, by: teamId, isPreset: false });
  saveState();
  simCache = null;
  render();
}

function undraftPlayer(name) {
  const idx = pickOrder.findIndex(p => p.name === name);
  if (idx === -1) return;
  pickOrder.splice(idx, 1);
  delete drafted[name];
  saveState();
  simCache = null;
  render();
}

function renderTabs() {
  const posTabsEl = document.getElementById('posTabs');
  if (posTabsEl) {
    ['ALL', 'QB', 'RB', 'WR', 'TE', 'K'].forEach(pos => {
      const tab = posTabsEl.querySelector(`[data-pos="${pos}"]`);
      if (tab) tab.classList.toggle('active', activePosTab === pos);
    });
  }
  const modeTabsEl = document.getElementById('modeTabs');
  if (modeTabsEl) {
    modeTabsEl.querySelectorAll('.modetab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === activeMode);
    });
  }
}

function wireEvents() {
  document.getElementById('posTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('[data-pos]');
    if (!tab) return;
    activePosTab = tab.dataset.pos;
    renderTabs();
    render();
  });

  document.getElementById('modeTabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.modetab');
    if (!tab) return;
    activeMode = tab.dataset.mode;
    renderTabs();
    render();
  });

  document.getElementById('searchBox')?.addEventListener('input', e => {
    searchQuery = e.target.value;
    render();
  });

  document.getElementById('showDraftedToggle')?.addEventListener('click', e => {
    showDrafted = !showDrafted;
    e.target.classList.toggle('on', showDrafted);
    render();
  });

  document.getElementById('radarToggle')?.addEventListener('click', e => {
    showRadar = !showRadar;
    e.target.classList.toggle('on', showRadar);
    render();
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (!confirm('Reset the entire draft board? This clears all picks (keepers will be re-applied).')) return;
    drafted = {};
    pickOrder = [];
    PRESET_KEEPERS.forEach(k => { drafted[k.name] = k.team; pickOrder.push({ name: k.name, by: k.team, isPreset: true }); });
    saveState();
    simCache = null;
    render();
  });

  document.getElementById('board')?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const name = btn.dataset.name;
    if (btn.dataset.action === 'draft') {
      const sel = Array.from(document.querySelectorAll('[data-team-select]')).find(s => s.dataset.teamSelect === name);
      const teamId = sel ? sel.value : MY_TEAM;
      draftPlayer(name, teamId);
    } else if (btn.dataset.action === 'undo') {
      undraftPlayer(name);
    }
  });

  document.getElementById('rosterTeamSelect')?.addEventListener('change', () => {
    renderRoster();
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function loadData() {
  const [playersRes, sleeperRes] = await Promise.all([
    fetch('players.json'),
    fetch('sleeper_rank.json'),
  ]);
  PLAYERS = await playersRes.json();
  SLEEPER_RANK = await sleeperRes.json();
  PLAYER_BY_NAME = new Map(PLAYERS.map(p => [p.name, p]));
}

async function init() {
  try {
    await loadData();
    loadState();
    if (pickOrder.length === 0) {
      PRESET_KEEPERS.forEach(k => { drafted[k.name] = k.team; pickOrder.push({ name: k.name, by: k.team, isPreset: true }); });
      saveState();
    } else {
      const changed = reconcilePresetKeepers();
      if (changed) saveState();
    }
    if (seedLivePicks()) saveState();
    renderTabs();
    render();
    wireEvents();
  } catch (e) {
    const boardEl = document.getElementById('board');
    if (boardEl) {
      boardEl.innerHTML = `<div class="row" style="color:var(--red);padding:16px;">
        The draft tool failed to load. Error: ${(e && e.message) ? String(e.message).replace(/</g, '&lt;') : 'unknown'}.
        Try closing and reopening. If this keeps happening, this exact message is worth sharing so it can be fixed.
      </div>`;
    }
    console.error('init() failed:', e);
  }
}

if (typeof window !== 'undefined') {
  window.FF = {
    MY_TEAM, TEAMS, DRAFT_ORDER, TOTAL_ROUNDS, ROUND8_PICK_TRADES, SNAKE_ORDER, ROSTER_SLOTS,
    PRESET_KEEPERS, LIVE_PICKS_SEED, FRAGILITY_DISCOUNT, TEAM_LEAN, GENERIC_MAX, GENERIC_MIN, MY_SINGLE_SLOT, FLEX_MIN,
    needState, mySingleSlotNeedState, myNeedMult, teamNeedMult, leagueValueWeight,
    leagueValue, myValue, riskAdjValue, takeNowScore,
    remainingFlexSharedN, teamsStillNeeding, positionN, computeBaselines,
    teamPositionCounts, undraftedPlayers, playerByName,
    reconcilePresetKeepers, seedLivePicks, loadState, saveState, draftPlayer, undraftPlayer,
    runSimulation, refreshSimCache, computeRows, pickWindowTeams, currentPicker,
    assignRosterSlots, findByeConflicts, init, render, wireEvents, renderTabs,
    setPlayers(players) { PLAYERS = players; PLAYER_BY_NAME = new Map(players.map(p => [p.name, p])); },
    setSleeperRank(rank) { SLEEPER_RANK = rank; },
    setSimRuns(n) { SIM_RUNS = n; }, // test-only override; production always uses the default 250
    getState() { return { drafted, pickOrder }; },
    setState(d, po) { drafted = d; pickOrder = po; simCache = null; },
  };
  window.addEventListener('DOMContentLoaded', init);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {};
}
