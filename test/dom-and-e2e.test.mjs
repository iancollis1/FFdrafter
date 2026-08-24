import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, loadFixturePlayers, loadFixtureSleeperRank } from './harness.mjs';

function setupWithKeepers(FF) {
  FF.setPlayers(loadFixturePlayers());
  FF.setSleeperRank(loadFixtureSleeperRank());
  const drafted = {}, pickOrder = [];
  FF.PRESET_KEEPERS.forEach(k => { drafted[k.name] = k.team; pickOrder.push({ name: k.name, by: k.team, isPreset: true }); });
  FF.setState(drafted, pickOrder);
  FF.renderTabs();
  FF.render();
  FF.wireEvents();
}

describe('DOM-driven draft pick (real simulated events)', () => {
  test('a real click on a rendered Draft button updates drafted state and localStorage', () => {
    const { FF, document, window } = loadApp();
    setupWithKeepers(FF);

    const firstRow = document.querySelector('#board .row:not(.hdr)');
    assert.ok(firstRow, 'expected at least one rendered player row');
    const draftBtn = firstRow.querySelector('button[data-action="draft"]');
    assert.ok(draftBtn, 'expected a Draft button on the first undrafted row');
    const name = draftBtn.dataset.name;
    const countBefore = FF.getState().pickOrder.length;

    const expectedTeam = FF.currentPicker(); // dropdown defaults to whoever's on the clock
    draftBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const state = FF.getState();
    assert.equal(state.pickOrder.length, countBefore + 1);
    assert.equal(state.drafted[name], expectedTeam);

    const stored = JSON.parse(window.localStorage.getItem('ff-draft-live-2026'));
    assert.equal(stored.pickOrder.length, countBefore + 1);
  });

  test('a real click on Undo removes the pick and restores the player to the board', () => {
    const { FF, document, window } = loadApp();
    setupWithKeepers(FF);

    const firstRow = document.querySelector('#board .row:not(.hdr)');
    const name = firstRow.querySelector('button[data-action="draft"]').dataset.name;
    const expectedTeam = FF.currentPicker();
    firstRow.querySelector('button[data-action="draft"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(FF.getState().drafted[name], expectedTeam);

    // Drafted rows are hidden by default (Show Drafted is off) -- reveal them to find Undo.
    document.getElementById('showDraftedToggle').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const draftedRow = Array.from(document.querySelectorAll('#board .row')).find(r => r.dataset.name === name);
    const undoBtn = draftedRow.querySelector('button[data-action="undo"]');
    assert.ok(undoBtn, 'expected an Undo button on the now-drafted row');
    undoBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    assert.equal(FF.getState().drafted[name], undefined);
  });

  test('the team-select dropdown defaults to whoever is on the clock, not always MY_TEAM', () => {
    const { FF, document } = loadApp();
    setupWithKeepers(FF);
    // After 20 keepers, round 3 pick 1 (mmurphy2015) is on the clock, not IanCollis4.
    assert.equal(FF.currentPicker(), 'mmurphy2015');

    const firstRow = document.querySelector('#board .row:not(.hdr)');
    const sel = firstRow.querySelector('[data-team-select]');
    assert.equal(sel.value, 'mmurphy2015');
  });

  test('the team-select dropdown defaults to MY_TEAM when it actually is my turn', () => {
    const { FF, document } = loadApp();
    FF.setPlayers(loadFixturePlayers());
    FF.setSleeperRank(loadFixtureSleeperRank());
    // Build pickOrder up through the pick right before my round-3 turn.
    const po = Array.from({ length: 28 }, (_, i) => ({ name: `p${i}`, by: FF.SNAKE_ORDER[i], isPreset: false }));
    FF.setState({}, po);
    assert.equal(FF.currentPicker(), FF.MY_TEAM);
    FF.renderTabs();
    FF.render();

    const firstRow = document.querySelector('#board .row:not(.hdr)');
    const sel = firstRow.querySelector('[data-team-select]');
    assert.equal(sel.value, FF.MY_TEAM);
  });

  test('clicking a position tab filters the board to that position', () => {
    const { FF, document, window } = loadApp();
    setupWithKeepers(FF);

    document.querySelector('#posTabs [data-pos="QB"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const rows = Array.from(document.querySelectorAll('#board .row:not(.hdr)'));
    assert.ok(rows.length > 0);
    rows.forEach(r => assert.ok(r.querySelector('.pb-QB'), 'every row should be a QB after filtering'));
  });
});

describe('Hide Kickers toggle', () => {
  test('defaults on: K is filtered from the ALL view but still shows on the K tab', () => {
    const { FF, document } = loadApp();
    setupWithKeepers(FF);

    assert.equal(FF.getState().hideKickers, true);
    const allRows = Array.from(document.querySelectorAll('#board .row:not(.hdr)'));
    assert.ok(allRows.length > 0);
    assert.ok(!allRows.some(r => r.querySelector('.pb-K')), 'no kickers should render in the ALL view');

    document.querySelector('#posTabs [data-pos="K"]').click();
    const kRows = Array.from(document.querySelectorAll('#board .row:not(.hdr)'));
    assert.ok(kRows.length > 0);
    assert.ok(kRows.every(r => r.querySelector('.pb-K')), 'the K tab should still show kickers even while hideKickers is on');
  });

  test('a real click on the toggle shows kickers in the ALL view again, and persists the choice', () => {
    const { FF, document, window } = loadApp();
    setupWithKeepers(FF);

    document.getElementById('hideKickersToggle').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(FF.getState().hideKickers, false);
    const rows = Array.from(document.querySelectorAll('#board .row:not(.hdr)'));
    assert.ok(rows.some(r => r.querySelector('.pb-K')), 'kickers should reappear in the ALL view once toggled off');

    const stored = JSON.parse(window.localStorage.getItem('ff-draft-live-2026'));
    assert.equal(stored.prefs.hideKickers, false);
  });

  test('loadState restores a persisted hideKickers=false choice; missing/older saved state defaults to true', () => {
    const { FF, window } = loadApp();
    window.localStorage.setItem('ff-draft-live-2026', JSON.stringify({ drafted: {}, pickOrder: [], prefs: { hideKickers: false } }));
    FF.loadState();
    assert.equal(FF.getState().hideKickers, false);

    window.localStorage.setItem('ff-draft-live-2026', JSON.stringify({ drafted: {}, pickOrder: [] })); // no prefs at all
    FF.loadState();
    assert.equal(FF.getState().hideKickers, true);
  });
});

describe('Risk Radar rendering', () => {
  test('toggling the radar via a real click renders dots and quadrant labels into the SVG', () => {
    const { FF, document, window } = loadApp();
    setupWithKeepers(FF);

    const panel = document.getElementById('radarPanel');
    assert.equal(panel.style.display, 'none');

    document.getElementById('radarToggle').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    assert.notEqual(panel.style.display, 'none');
    const svg = document.getElementById('radarSvg');
    assert.ok(svg.querySelectorAll('.radar-dot').length > 0, 'expected at least one plotted player');
    assert.ok(svg.innerHTML.includes('TAKE-NOW'));
    assert.ok(svg.innerHTML.includes('SAFE-TO-WAIT'));
  });
});

describe('Full draft-day end-to-end simulation', () => {
  test('drafting all 170 picks to completion throws zero errors', { timeout: 60000 }, () => {
    const { FF } = loadApp();
    FF.setPlayers(loadFixturePlayers());
    FF.setSleeperRank(loadFixtureSleeperRank());
    FF.setSimRuns(40); // full 170-pick draft x 250 runs each is too slow for a test suite; 40 still exercises every code path

    const drafted = {}, pickOrder = [];
    FF.PRESET_KEEPERS.forEach(k => { drafted[k.name] = k.team; pickOrder.push({ name: k.name, by: k.team, isPreset: true }); });
    FF.setState(drafted, pickOrder);
    FF.seedLivePicks(); // start from the real current draft state, not just keepers

    assert.doesNotThrow(() => FF.render());

    let guard = 0;
    while (FF.currentPicker() !== null && guard < FF.SNAKE_ORDER.length + 5) {
      guard++;
      const team = FF.currentPicker();
      const baselines = FF.computeBaselines();
      const pool = FF.undraftedPlayers('ALL');
      assert.ok(pool.length > 0, `ran out of undrafted players at pick ${guard}`);

      let best = pool[0], bestVal = -Infinity;
      pool.forEach(p => {
        const v = FF.leagueValue(p, baselines);
        if (v > bestVal) { bestVal = v; best = p; }
      });

      assert.doesNotThrow(() => FF.draftPlayer(best.name, team), `draftPlayer threw at pick ${guard}`);
    }

    const state = FF.getState();
    assert.equal(state.pickOrder.length, FF.SNAKE_ORDER.length);
    assert.equal(FF.currentPicker(), null);
    assert.equal(state.pickOrder.length, FF.TOTAL_ROUNDS * FF.TEAMS.length);

    assert.doesNotThrow(() => FF.render());
  });
});
