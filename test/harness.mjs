// Loads index.html + app.js into a real jsdom document (no network fetches --
// external stylesheet/font <link> tags are left inert, and app.js is inlined
// directly so `fetch` is never invoked by accident during unit tests).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export function loadApp() {
  // Strip the app.js <script src> tag from the initial parse and inject it
  // AFTER DOMContentLoaded has already fired, so app.js's own
  // `window.addEventListener('DOMContentLoaded', init)` never fires
  // automatically (init() calls fetch(), which jsdom doesn't provide). Tests
  // drive state explicitly via FF.setPlayers/setState instead.
  let html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const appJs = readFileSync(join(ROOT, 'app.js'), 'utf8');
  html = html.replace('<script src="app.js"></script>', '');

  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  const { window } = dom;
  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = appJs;
  window.document.body.appendChild(scriptEl);

  const FF = window.FF;
  if (!FF) throw new Error('window.FF was not defined -- app.js failed to load in jsdom');
  return { dom, window, document: window.document, FF };
}

export function loadFixturePlayers() {
  const raw = readFileSync(join(ROOT, 'players.json'), 'utf8');
  return JSON.parse(raw);
}

export function loadFixtureSleeperRank() {
  const raw = readFileSync(join(ROOT, 'sleeper_rank.json'), 'utf8');
  return JSON.parse(raw);
}
