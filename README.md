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

## Business and Society desks

The paper also files from the Pixel Exchange (`commerce`), its docks (`freight`) and Pixel City Society (`society`), in two sections, Business and Society. Big closures (25 jobs or more), booms and slumps in sprite orders, shortages, the Exchange's monthly report, raw colour running low, a full export dock, empty shelves, crazes that are everywhere and communities changing sides get stories; smaller closures, openings, new crazes and quarrels patched up go in the briefs. These desks post at the close of trading, in the first minute after 00:00 UTC, so the paper reads them a minute later and they make that day's edition. Like the other desks, they are optional: if one doesn't load, the paper still prints and says which desk did not file.

The Bank of Pixel City's desk (`bank`) files in Business: rate changes, its opening, large bad debts, tightened lending, capital trouble and arrears get stories; smaller bad debts go in the briefs.

Glitches (City's digital disasters) get stories when they start and when they spread; the all-clear goes in the City briefs. Society's monthly migration report, districts losing a tenth of their pixels and districts too full for new arrivals get stories too.

The University desk (from Pixel University, through the Census Office's working lives) files when the University opens, when each year begins on 1 March, and on graduation day each 1 December.
