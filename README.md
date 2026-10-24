# decision-deck

**Stop circling "which one should I buy?".** A kit to make a purchase decision with AI agents:
set your criteria first, let agents research with sources, audit what they found, then decide in two
steps — *do I like it?* (swipe) and *is it worth it?* (radar, tier list, price vs. value).

[Leer en español](README.es.md) · [Case study (Spanish)](docs/caso-de-estudio.md)

<p>
  <img src="docs/img/swipe.gif" alt="Swiping through options: yes, no or maybe, visuals only" width="300">
  <img src="docs/img/radar.gif" alt="Comparing three options on a radar chart, then the ranking and the price vs. value chart" width="300">
</p>

## What problem it solves

Too many tabs, contradicting reviews, prices without stock, and no criteria to weigh any of it. The
problem is rarely a lack of information; it is deciding. decision-deck turns that into a method:

```
criteria → research with agents → audit → data with sources → swipe (do I like it?) → radar and ranking (is it worth it?)
```

It has two halves:

| Half | What it is | For whom |
|---|---|---|
| **Method** (`skills/`, `AGENTS.md`) | Claude Code skills that guide each step: criteria interview, research, audit, build | Anyone using Claude Code, Cursor, Codex or another agent |
| **Template app** (`src/`) | A static web app that reads `decision.config.json` and the compiled data. No product category is hardcoded | Anyone who wants to see and decide |

## Quick start (3 steps)

1. **Clone** and install:
   ```
   git clone https://github.com/diegoalberto0104/decision-deck.git && cd decision-deck && npm install
   ```
2. **`/criterios`** in Claude Code: a one-question-at-a-time interview (real use, ideal budget and hard
   ceiling, deal-breakers, the axes that matter). It writes `decision.config.json`.
3. **`/investigar`**: agents research one segment each and write `data/<segment>.json`, with a source
   and a date for every price and score.

Then `/auditar` (catch made-up models, unsourced claims, prices without stock) and `/compilar`, and
`npm run dev`. Swipe first, look at the numbers later.

No agent at hand? Each skill is a plain Markdown file in `skills/`: read it and follow it, or point any
agent to [`AGENTS.md`](AGENTS.md).

**Just want to see it?** `npm install && npm run dev` opens the example (waterproof walking shoes).
`npm run data:audifonos && npx vite` opens the second one (noise-cancelling headphones).

## How the method works

| Step | Skill | Output |
|---|---|---|
| 1. Criteria | [`criterios`](skills/criterios/SKILL.md) | `decision.config.json`: budget, segments, axes and weights, deal-breakers, badges |
| 2. Research | [`investigar`](skills/investigar/SKILL.md) | `data/*.json`: items, specs, 1–5 scores with sources, offers with final price and availability |
| 3. Audit | [`auditar`](skills/auditar/SKILL.md) | `data/auditoria.md`: finding, risk and action for each problem |
| 4. Build | [`compilar`](skills/compilar/SKILL.md) | `public/data/datos.json`, validated against the JSON Schema |

The app then:

- **Swipe** one card at a time (photo, model, price). Yes, no or maybe — visuals only. Items within
  budget and in stock come first; the rest come last, labelled.
- **Results**: a computed recommendation, adjustable weights, and side-by-side comparison of up to 3
  items on a radar with the best value in each row highlighted.
- **Ranking**: tier list by total score or by any axis, and a price vs. value chart with the
  best-value frontier.
- **Stores**: where the research looked, what was blocked, and a form to suggest a store.

Everything specific to the category lives in [`decision.config.json`](schema/config.schema.json)
(currency, budget, segments, axes, deal-breakers, badges, UI words). `npm run check:dominio` makes sure
`src/` and `scripts/` stay generic.

## Limits and research ethics

- **A score without a source is shown as empty.** An honest gap beats a made-up number.
- **Final price only**: shipping, taxes and card fees included, in your currency.
- **Slow and polite research.** No bypassing anti-bot protection or captchas, no fake accounts, no
  logging in. If a store blocks, it is recorded and the research moves on. A store only counts as
  blocked after trying in a real browser.
- **No store photos in the repo** (copyright). `public/img/` is git-ignored; examples use their own SVG
  illustrations. Your local runs can download product images for your own use.
- **Agents draft, you decide.** The audit step exists because agent output is a draft until checked
  against the source. Prices and stock change: check again before buying.
- The headphones example comes from a **short web research** (RTINGS reviews, list prices and prices quoted by media, October 2026): stock was not read in stores.
- The UI comes in Spanish and English: set `"idioma": "en-US"` in the config. Your own data (names, pros and cons) is shown as written.

## Commands

```
npm run dev              # build data and open the app
npm run data             # validate and compile data (root config, or the default example)
npm run data -- --config examples/audifonos/decision.config.json
npm run build            # data + types + production build
npm run check:dominio    # no category words in src/ and scripts/
npm run check:privado    # no personal data (terms from terminos.privados.local or the PRIVADO_TERMINOS secret)
npm run check:ejemplos   # build with every example
```

## Propose a category

Have a purchase decision that would make a good example? [Open an issue](https://github.com/diegoalberto0104/decision-deck/issues/new?template=proponer-categoria.md).

## License

[MIT](LICENSE)
