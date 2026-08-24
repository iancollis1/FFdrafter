import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, loadFixturePlayers, loadFixtureSleeperRank } from './harness.mjs';

describe('need-zone multipliers', () => {
  test('RB in discount zone shows 0.4x mult exactly', () => {
    const { FF } = loadApp();
    // FLEX_MIN.RB = 2, discount starts at MIN+2 = 4
    assert.equal(FF.needState('RB', { RB: 4 }).mult, 0.4);
    assert.equal(FF.needState('RB', { RB: 4 }).zone, 'discount');
  });

  test('RB/WR urgent zone scales 1 + 0.15*remaining', () => {
    const { FF } = loadApp();
    // RB min=2, have=0 -> remaining=2 -> mult = 1.3
    const rb = FF.needState('RB', { RB: 0 });
    assert.equal(rb.zone, 'urgent');
    assert.equal(rb.mult, 1.3);
    // WR min=3, have=1 -> remaining=2 -> mult = 1.3
    const wr = FF.needState('WR', { WR: 1 });
    assert.equal(wr.zone, 'urgent');
    assert.equal(Math.round(wr.mult * 100) / 100, 1.3);
  });

  test('RB/WR neutral zone is exactly 1.0x', () => {
    const { FF } = loadApp();
    assert.equal(FF.needState('RB', { RB: 2 }).mult, 1.0);
    assert.equal(FF.needState('RB', { RB: 3 }).mult, 1.0);
    assert.equal(FF.needState('WR', { WR: 4 }).mult, 1.0);
  });

  test('personal QB/TE single-slot: urgent below 1, neutral at exactly 1, discount at 2+', () => {
    const { FF } = loadApp();
    const urgent = FF.mySingleSlotNeedState('QB', { QB: 0 });
    assert.equal(urgent.zone, 'urgent');
    assert.equal(urgent.mult, 1.15); // 1 + 0.15*1

    const neutral = FF.mySingleSlotNeedState('QB', { QB: 1 });
    assert.equal(neutral.zone, 'neutral');
    assert.equal(neutral.mult, 1.0);

    const discount = FF.mySingleSlotNeedState('TE', { TE: 2 });
    assert.equal(discount.zone, 'discount');
    assert.equal(discount.mult, 0.4);
  });

  test('K is pass-through for My Value (no need multiplier)', () => {
    const { FF } = loadApp();
    assert.equal(FF.myNeedMult('K', { K: 0 }), 1.0);
    assert.equal(FF.myNeedMult('K', { K: 5 }), 1.0);
  });
});

describe('opponent-modeling teamNeedMult -- must never share personal need tables', () => {
  test('opponent QB 2nd-pick boost is 1.2x, not 1.0', () => {
    const { FF } = loadApp();
    // GENERIC_MIN.QB = 1; have === 1 (their first QB already rostered) -> 1.2 boost
    assert.equal(FF.teamNeedMult('grwin15', 'QB', { QB: 1 }), 1.2);
  });

  test('opponent already has GENERIC_MAX -> 0.15 suppression', () => {
    const { FF } = loadApp();
    assert.equal(FF.teamNeedMult('grwin15', 'QB', { QB: 2 }), 0.15);
    assert.equal(FF.teamNeedMult('grwin15', 'TE', { TE: 2 }), 0.15);
    assert.equal(FF.teamNeedMult('grwin15', 'K', { K: 1 }), 0.15);
  });

  test('opponent below GENERIC_MIN -> 1.3x', () => {
    const { FF } = loadApp();
    assert.equal(FF.teamNeedMult('grwin15', 'QB', { QB: 0 }), 1.3);
    assert.equal(FF.teamNeedMult('grwin15', 'K', { K: 0 }), 1.3);
  });

  test('RB/WR opponent path routes through the SAME needState as personal (by design)', () => {
    const { FF } = loadApp();
    assert.equal(FF.teamNeedMult('RedSled', 'RB', { RB: 4 }), FF.needState('RB', { RB: 4 }).mult);
  });

  test('personal MY_SINGLE_SLOT and GENERIC_MIN/MAX are distinct tables (regression guard)', () => {
    const { FF } = loadApp();
    assert.notEqual(FF.MY_SINGLE_SLOT, FF.GENERIC_MIN);
    assert.notEqual(FF.MY_SINGLE_SLOT, FF.GENERIC_MAX);
    // Editing personal single-slot MIN must not be reachable from GENERIC_MIN/MAX
    assert.equal(FF.GENERIC_MIN.QB, 1);
    assert.equal(FF.GENERIC_MAX.QB, 2);
    assert.equal(FF.MY_SINGLE_SLOT.MIN, 1);
    assert.equal(FF.MY_SINGLE_SLOT.MAX, 2);
  });
});

describe('Risk-Adjusted Value isolation', () => {
  test('formula matches FRAGILITY_DISCOUNT exactly and never mutates inputs', () => {
    const { FF } = loadApp();
    assert.equal(FF.riskAdjValue(100, 'RB'), 93.5); // 100 * (1 - 0.065)
    assert.equal(FF.riskAdjValue(100, 'WR'), 98.0);
    assert.equal(FF.riskAdjValue(100, 'K'), 100.0); // 0 discount
  });

  test('computing riskAdjValue does not change League Value or My Value for the same player', () => {
    const { FF } = loadApp();
    FF.setPlayers(loadFixturePlayers());
    FF.setSleeperRank(loadFixtureSleeperRank());
    FF.setState({}, []);
    const baselines = FF.computeBaselines();
    const myCounts = FF.teamPositionCounts(FF.MY_TEAM);
    const player = FF.undraftedPlayers('RB')[0];

    const lvBefore = FF.leagueValue(player, baselines);
    const mvBefore = FF.myValue(player, baselines, myCounts);
    FF.riskAdjValue(mvBefore, player.pos); // exercise it
    const lvAfter = FF.leagueValue(player, baselines);
    const mvAfter = FF.myValue(player, baselines, myCounts);

    assert.equal(lvBefore, lvAfter);
    assert.equal(mvBefore, mvAfter);
  });
});

describe('leagueValueWeight blend', () => {
  test('mostly Sleeper early, mostly League Value late, linear in between', () => {
    const { FF } = loadApp();
    assert.equal(FF.leagueValueWeight(1), 0.15);
    assert.equal(FF.leagueValueWeight(60), 0.15);
    assert.equal(FF.leagueValueWeight(80), 1.0);
    assert.equal(FF.leagueValueWeight(150), 1.0);
    assert.equal(Math.round(FF.leagueValueWeight(70) * 1000) / 1000, 0.575);
  });
});

describe('Take-Now Score boundary cases', () => {
  test('100% survival -> urgency premium is exactly zero, score === myValue', () => {
    const { FF } = loadApp();
    const p = { pos: 'RB', myValue: 50 };
    const score = FF.takeNowScore(p, 1, { RB: 30 });
    assert.equal(score, 50);
  });

  test('0% survival -> full gap-to-replacement is added as urgency premium', () => {
    const { FF } = loadApp();
    const p = { pos: 'RB', myValue: 50 };
    const score = FF.takeNowScore(p, 0, { RB: 30 });
    assert.equal(score, 50 + (50 - 30));
  });

  test('0% survival but near-identical replacement -> score stays close to myValue (no inflated urgency)', () => {
    const { FF } = loadApp();
    const p = { pos: 'RB', myValue: 50 };
    const score = FF.takeNowScore(p, 0, { RB: 49.5 });
    assert.equal(score, 50.5); // gap is only 0.5, not inflated
    assert.ok(score - p.myValue < 1);
  });

  test('replacement above myValue never produces a negative premium', () => {
    const { FF } = loadApp();
    const p = { pos: 'RB', myValue: 50 };
    const score = FF.takeNowScore(p, 0, { RB: 80 });
    assert.equal(score, 50); // gapToReplacement clamped to 0
  });
});
