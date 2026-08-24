# FFdrafter

A personal fantasy football draft assistant for one specific 10-team half-PPR
keeper league. Single-device, no login, no backend -- plain HTML/CSS/JS
persisted to `localStorage`, served as a static site.

## Running it

Open `index.html` through any static file server (it fetches `players.json`
and `sleeper_rank.json`, which requires `http(s)://`, not `file://`):

```
python3 -m http.server 8000
# then visit http://localhost:8000/index.html
```

## Rebuilding the player pool

`players.json` is generated from the FantasyPros CSVs in `data/raw/` by:

```
node scripts/build_players.mjs
```

To refresh rankings for a new week: replace `data/raw/ecr_<POS>.csv` (Draft
Rankings/ECR export) and `data/raw/proj_<POS>.csv` (Projections export) for
QB/RB/WR/TE/K, then rerun the script. See the comment header in
`scripts/build_players.mjs` for the exact methodology (scaffold FPTS slots
re-labeled by ECR order, own true FPTS/high/low attached by name match, and
the manual risk/opportunity overrides reapplied by raw-stats-rank).

`sleeper_rank.json` (real Sleeper consensus draft ranks) is a hand-compiled
lookup, not part of this regenerated pipeline -- update it directly if real
Sleeper ADP changes meaningfully.

## Tests

```
npm install
npm test
```

Node's built-in test runner + jsdom. Loads the real `index.html`/`app.js`,
drives real DOM events (clicking Draft/Undo/tabs), and asserts on exact
computed values (need-zone multipliers, opponent boosts, Take-Now boundary
cases, etc.), plus one full 170-pick draft-day simulation with zero thrown
errors.

## Known quirk: kickers late in a draft

The demand-adjusted replacement baseline correctly reflects that once most
teams already have a kicker, the effective replacement pool shrinks -- which
can make a K's League/My Value (and therefore Take-Now/Next-Pick) look
inflated relative to skill positions, even though nobody should draft a
kicker that early. This is expected, not a bug. Kickers are excluded from
the Pick Guidance cards and the Risk Radar (both are "what should I actually
take" recommendation surfaces); the sortable board itself still shows K's
real numbers when you filter to the K tab or sort by any mode.

## Deploying to GitHub Pages

Settings -> Pages -> Deploy from a branch -> select this branch, folder
`/ (root)`. The whole app is static (`index.html`, `app.js`, `styles.css`,
`players.json`, `sleeper_rank.json`) and needs no build step to serve.
