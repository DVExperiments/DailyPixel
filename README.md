# The Daily Pixel

The newspaper of the Pixel Universe. A new edition is published every day at 00:00 UTC, covering the 24 hours before it, and every past edition can be read from the archive. Each edition is a pure function of its date, so everyone reads the same paper.

Follows the [Pixel Universe Shared Conventions](../Pixel_Universe_Shared_Conventions.md).

## Place in the universe

A **reader of everything**; nothing reads it. It makes no news of its own (`eventsBetween` returns nothing).

| Desk | Source | Required? |
| --- | --- | --- |
| Racing | Glacial's `js/pixels.js`, `js/sim.js`, `js/league.js` | Yes |
| Weather | Weather Bureau `universe.js` | Yes |
| The Senate | Senate `universe.js` | No |
| City | City `universe.js` | No |
| The Turf | Bookmaker `universe.js` | No |

If an optional desk fails to load, the edition still prints and says which desk did not file. Glacial has no `universe.js`, so the paper writes Glacial's events itself (`race.finish`, and `record.*` for new records), in the shared format with `source: "glacial"`.

## What goes in an edition

- **Stories.** Events with a writer and importance 2 or more become written stories; the most important is the lead. Ties go to racing, then the Senate, weather, city and the turf. Race reports draw on the race itself (naps, lead changes, sprints, ratings, streaks), the weather at the stadium (reported, never blamed) and a quote from a Bookmaker regular who won or lost on it.
- **Briefs.** Everything else, grouped by desk. Ship arrivals, bills introduced and seat results are rolled into one line each.
- **Fixed boxes.** Today's racecard with the Bookmaker's closing prices, or halfway positions on Grand Prix day two; the Bureau's forecast and how yesterday's went; the championship; the city's grid and air; the turf.
- **Masthead.** Set in pixels, ending in a single square lit in the colour of yesterday's winner.
- **Archive editions** are printed in the colours and typefaces that were Senate law on their day.

## Links

- Today: `https://dvexperiments.github.io/DailyPixel/`
- Any edition: `https://dvexperiments.github.io/DailyPixel/#2026-10-03`

## Adding a writer

Add an entry to `WRITERS` in `universe.js`, keyed by event type, returning `{ headline, body: [paragraphs] }`. Event types without a writer appear as briefs automatically, so new sites show up in the paper before anyone writes for them.

## Repo layout

```
index.html      the paper
universe.js     builds editions, no DOM
js/app.js       the printing press
css/style.css   Glacial's variables, so Senate laws restyle the paper
```
