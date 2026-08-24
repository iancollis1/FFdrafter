import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, loadFixturePlayers, loadFixtureSleeperRank } from './harness.mjs';

describe('snake order and pick window', () => {
  test('SNAKE_ORDER has 170 slots (17 rounds x 10 teams) and applies round-8 trades', () => {
    const { FF } = loadApp();
    assert.equal(FF.SNAKE_ORDER.length, 170);
    // Round 8 = indices 70-79 (0-based). LackDaddy10's slot -> RJMess, IanCollis4's -> TheDayDay69.
    const round8 = FF.SNAKE_ORDER.slice(70, 80);
    assert.ok(!round8.includes('LackDaddy10'));
    assert.ok(!round8.includes('IanCollis4'));
    assert.equal(round8.filter(t => t === 'RJMess').length, 2);
    assert.equal(round8.filter(t => t === 'TheDayDay69').length, 2);
  });

  test('pickWindowTeams after the 20 keeper picks returns exactly the teams before my next turn', () => {
    const { FF } = loadApp();
    FF.setPlayers(loadFixturePlayers());
    FF.setState({}, Array.from({ length: 20 }, (_, i) => ({ name: `k${i}`, by: 'x', isPreset: true })));
    const window = FF.pickWindowTeams();
    // Round 3 (index 20-29) is DRAFT_ORDER order; IanCollis4 sits at offset 8 within that round.
    assert.equal(window.length, 8);
    assert.equal(window[0], 'mmurphy2015');
    assert.equal(window[window.length - 1], 'grwin15');
    assert.ok(!window.includes(FF.MY_TEAM));
  });

  test('pickWindowTeams on my own turn returns the window AFTER this pick', () => {
    const { FF } = loadApp();
    // Build pickOrder up to just before my turn in round 3 (28 picks in: indices 0-27).
    const po = Array.from({ length: 28 }, (_, i) => ({ name: `p${i}`, by: FF.SNAKE_ORDER[i], isPreset: false }));
    FF.setState({}, po);
    assert.equal(FF.currentPicker(), FF.MY_TEAM);
    const window = FF.pickWindowTeams();
    assert.ok(!window.includes(FF.MY_TEAM));
    assert.equal(window[0], 'RedSled'); // next team after my round-3 slot
  });
});

describe('Monte Carlo survival/next-pick simulation', () => {
  test('survival fractions are within [0,1] and positionReplacementAvg is populated for all positions', () => {
    const { FF } = loadApp();
    FF.setPlayers(loadFixturePlayers());
    FF.setSleeperRank(loadFixtureSleeperRank());
    const po = Array.from({ length: 20 }, (_, i) => ({ name: FF.undraftedPlayers('ALL')[i]?.name, by: 'x', isPreset: true })).filter(p => p.name);
    FF.setState(Object.fromEntries(po.map(p => [p.name, p.by])), po);

    const baselines = FF.computeBaselines();
    const myCounts = FF.teamPositionCounts(FF.MY_TEAM);
    const { survival, nextPick, positionReplacementAvg } = FF.runSimulation(baselines, myCounts);

    let checked = 0;
    survival.forEach(frac => {
      assert.ok(frac >= 0 && frac <= 1);
      checked++;
    });
    assert.ok(checked > 0);
    nextPick.forEach(frac => assert.ok(frac >= 0 && frac <= 1));

    ['QB', 'RB', 'WR', 'TE', 'K'].forEach(pos => {
      assert.ok(pos in positionReplacementAvg);
      assert.ok(Number.isFinite(positionReplacementAvg[pos]));
    });
  });

  test('a player taken in every simulated run has survival 0; nobody taken has survival 1', () => {
    const { FF } = loadApp();
    // Tiny closed pool: 1 team picks once before my turn, 2 players available.
    FF.setPlayers([
      { name: 'OnlyRB', pos: 'RB', fpts: 300, team: 'AAA', bye: 1 },
      { name: 'OnlyK', pos: 'K', fpts: 1, team: 'BBB', bye: 1 },
    ]);
    FF.setSleeperRank({});
    // Force a 1-pick window: put everyone right before MY_TEAM's first slot in round 1,
    // except leave the immediately-prior slot open.
    const idxMe = FF.SNAKE_ORDER.indexOf(FF.MY_TEAM);
    const po = Array.from({ length: idxMe - 1 }, (_, i) => ({ name: `dummy${i}`, by: FF.SNAKE_ORDER[i], isPreset: true }));
    FF.setState({}, po);
    assert.equal(FF.pickWindowTeams().length, 1);

    const baselines = FF.computeBaselines();
    const myCounts = FF.teamPositionCounts(FF.MY_TEAM);
    const { survival } = FF.runSimulation(baselines, myCounts);
    // OnlyRB has overwhelmingly higher value/rank than OnlyK, so it should be taken
    // in effectively every run (deterministic argmax dominates the small noise band).
    assert.ok(survival.get('OnlyRB') < 0.05);
    assert.ok(survival.get('OnlyK') > 0.95);
  });
});

describe('seedLivePicks', () => {
  test('bootstraps keepers + real live picks in order, leaving IanCollis4 on the clock at 9.9', () => {
    const { FF } = loadApp();
    FF.setPlayers(loadFixturePlayers());
    const drafted = {}, pickOrder = [];
    FF.PRESET_KEEPERS.forEach(k => { drafted[k.name] = k.team; pickOrder.push({ name: k.name, by: k.team, isPreset: true }); });
    FF.setState(drafted, pickOrder);

    const changed = FF.seedLivePicks();
    assert.equal(changed, true);

    const state = FF.getState();
    assert.equal(state.pickOrder.length, 20 + FF.LIVE_PICKS_SEED.length);
    assert.equal(state.pickOrder.length, 88);
    assert.equal(FF.currentPicker(), FF.MY_TEAM);
    assert.equal(state.drafted['Christian McCaffrey'], 'mmurphy2015'); // first round-3 pick
    assert.equal(state.drafted['Mike Washington Jr.'], 'grwin15'); // last seeded pick (9.8)
    assert.equal(state.drafted['Jahmyr Gibbs'], 'Dillard09'); // untouched keeper
  });

  test('is idempotent -- running it twice does not duplicate picks', () => {
    const { FF } = loadApp();
    FF.setPlayers(loadFixturePlayers());
    const drafted = {}, pickOrder = [];
    FF.PRESET_KEEPERS.forEach(k => { drafted[k.name] = k.team; pickOrder.push({ name: k.name, by: k.team, isPreset: true }); });
    FF.setState(drafted, pickOrder);

    FF.seedLivePicks();
    const lenAfterFirst = FF.getState().pickOrder.length;
    const changedSecond = FF.seedLivePicks();
    assert.equal(changedSecond, false);
    assert.equal(FF.getState().pickOrder.length, lenAfterFirst);
  });

  test('every seeded live-pick name resolves to a real player in the pool', () => {
    const { FF } = loadApp();
    FF.setPlayers(loadFixturePlayers());
    const byName = new Set(loadFixturePlayers().map(p => p.name));
    FF.LIVE_PICKS_SEED.forEach(k => assert.ok(byName.has(k.name), `${k.name} not found in players.json`));
  });
});

describe('reconcilePresetKeepers', () => {
  test('auto-drafts all 20 keepers from empty state', () => {
    const { FF } = loadApp();
    FF.setState({}, []);
    // init()'s empty-state branch: mimic it directly since init() also fetches data.
    const drafted = {};
    const pickOrder = [];
    FF.PRESET_KEEPERS.forEach(k => { drafted[k.name] = k.team; pickOrder.push({ name: k.name, by: k.team, isPreset: true }); });
    FF.setState(drafted, pickOrder);
    assert.equal(FF.getState().pickOrder.length, 20);
    assert.equal(FF.getState().drafted['Josh Allen'], 'LackDaddy10');
  });

  test('removes a stale keeper entry and adds the corrected one, never touching live picks', () => {
    const { FF } = loadApp();
    const drafted = { 'Josh Allen': 'LackDaddy10', 'Live Pick Guy': 'RedSled' };
    const pickOrder = [
      { name: 'Josh Allen', by: 'LackDaddy10', isPreset: true }, // stale: real PRESET_KEEPERS has this too, should survive
      { name: 'Live Pick Guy', by: 'RedSled', isPreset: false }, // real live pick, must never be touched
      { name: 'Old Wrong Keeper', by: 'RedSled', isPreset: true }, // stale, not in PRESET_KEEPERS at all
    ];
    FF.setState(drafted, pickOrder);
    const changed = FF.reconcilePresetKeepers();
    assert.equal(changed, true);
    const state = FF.getState();
    assert.ok(!state.pickOrder.some(p => p.name === 'Old Wrong Keeper'));
    assert.ok(!('Old Wrong Keeper' in state.drafted));
    assert.ok(state.pickOrder.some(p => p.name === 'Live Pick Guy' && !p.isPreset));
    assert.equal(state.drafted['Live Pick Guy'], 'RedSled');
    // All 20 real presets should now be present.
    assert.equal(state.pickOrder.filter(p => p.isPreset).length, 20);
  });

  test('never overwrites a name that was already genuinely (live) drafted', () => {
    const { FF } = loadApp();
    // Someone live-drafted a player who also happens to be a preset keeper's name,
    // onto a DIFFERENT team than the keeper list says (edge case / bad manual entry).
    const drafted = { "Ja'Marr Chase": 'RedSled' };
    const pickOrder = [{ name: "Ja'Marr Chase", by: 'RedSled', isPreset: false }];
    FF.setState(drafted, pickOrder);
    FF.reconcilePresetKeepers();
    const state = FF.getState();
    assert.equal(state.drafted["Ja'Marr Chase"], 'RedSled'); // untouched
    assert.equal(state.pickOrder.filter(p => p.name === "Ja'Marr Chase").length, 1);
  });
});
