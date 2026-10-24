/*
 * The Daily Pixel: the newspaper of the Pixel Universe.
 *
 * A reader of everything. A new edition is published at 00:00 UTC each day and covers the 24 hours before it.
 * Every edition is a pure function of its date: any visitor, on any day, reads the same paper.
 *
 * Load order: Glacial js/pixels.js, js/sim.js, js/league.js, then Weather, Senate, City and Bookmaker universe.js,
 * then this file. Glacial and the Weather Bureau are required. The Senate, City and Bookmaker desks are optional:
 * if one fails to load, the paper still prints and says which desk did not file.
 *
 * Seeds start "paper:". Registers window.PixelUniverse.paper.
 */
(function (root) {
  'use strict';

  const VERSION = '0.1.0';
  const MIN = 60000, H = 3600000, DAY = 86400000;
  const EPOCH = Date.UTC(2025, 11, 3);

  // ---------------------------------------------------------------- shared RNG (identical to Glacial's)
  function rng(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const seeded = (s) => rng(hash('paper:' + s));

  // ---------------------------------------------------------------- helpers
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const dayOf = (ms) => ms - (((ms % DAY) + DAY) % DAY);
  const ymd = (ms) => { const d = new Date(ms); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  const iso = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z');
  const num = (x) => Math.round(x).toLocaleString('en');
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const count = (n, one, many) => (n < WORDS.length ? WORDS[n] : num(n)) + ' ' + (n === 1 ? one : many || one + 's');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function dur(ms) {
    const m = Math.round(ms / MIN), h = Math.floor(m / 60), r = m % 60;
    if (h === 0) return count(r, 'minute');
    return count(h, 'hour') + (r ? ' ' + r + ' minute' + (r === 1 ? '' : 's') : '');
  }
  const pick = (r, list) => list[Math.floor(r() * list.length)];
  const list = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const ordinal = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const longDate = (ms) => { const d = new Date(ms); return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };

  // ---------------------------------------------------------------- upstream
  const U = () => root.PixelUniverse || {};
  const G = () => root.G;
  const ok = (s) => !!(s && (!s.ready || s.ready()));
  const desk = {
    weather: () => ok(U().climate) && U().climate,
    senate: () => ok(U().senate) && U().senate,
    city: () => ok(U().city) && U().city,
    bookmaker: () => ok(U().bookmaker) && U().bookmaker,
    commerce: () => ok(U().commerce) && U().commerce,
    freight: () => ok(U().commerce) && U().freight,
    society: () => ok(U().society) && U().society,
    bank: () => ok(U().commerce) && U().bank
  };
  const ready = () => { const g = G(); return !!(g && g.buildLeague && g.PIXELS && desk.weather()); };
  const PX = (id) => G().PX[id];
  const pname = (id) => (PX(id) ? PX(id).name : id);

  // ---------------------------------------------------------------- Glacial, replayed once and annotated
  let L = null, races = [];
  function ensureLeague(t) {
    if (L && t <= L.built) return;
    const g = G();
    L = g.buildLeague(t);
    races = L.races.slice();
    // annotate each completed race with what it meant at the time: records, streaks, ratings
    const best = { closest: Infinity, biggest: 0, nap: 0, speed: 0, fastest: Infinity, streak: 0 };
    const streak = {}, rating = {};
    g.PIXELS.forEach((p) => { streak[p.id] = 0; rating[p.id] = 1500; });
    for (const race of races) {
      const rec = [];
      const w = race.winner;
      if (race.marginPx < best.closest) { if (best.closest !== Infinity) rec.push({ kind: 'closest', value: race.marginPx, previous: best.closest }); best.closest = race.marginPx; }
      if (race.marginPx > best.biggest) { if (best.biggest) rec.push({ kind: 'biggest', value: race.marginPx, previous: best.biggest }); best.biggest = race.marginPx; }
      if (race.kind === 'crawl' && race.winMs < best.fastest) { if (best.fastest !== Infinity) rec.push({ kind: 'fastest', value: race.winMs, previous: best.fastest }); best.fastest = race.winMs; }
      for (const res of race.results) {
        if (res.longestNapMs > best.nap) { if (best.nap) rec.push({ kind: 'nap', id: res.id, value: res.longestNapMs, previous: best.nap }); best.nap = res.longestNapMs; }
        if (res.topSpeed > best.speed) { if (best.speed) rec.push({ kind: 'speed', id: res.id, value: res.topSpeed, previous: best.speed }); best.speed = res.topSpeed; }
      }
      if (race.kind === 'crawl') {
        for (const res of race.results) streak[res.id] = res.place === 0 ? streak[res.id] + 1 : 0;
        if (streak[w.id] > best.streak) { if (best.streak >= 3) rec.push({ kind: 'streak', id: w.id, value: streak[w.id], previous: best.streak }); best.streak = streak[w.id]; }
      }
      const before = {};
      for (const id in race.ratingDelta) { before[id] = rating[id]; rating[id] += race.ratingDelta[id]; }
      race.paper = { records: rec, streak: streak[w.id], ratingBefore: before, ratingAfter: Object.assign({}, rating) };
    }
  }
  const endOf = (race) => race.startMs + race.windowMs;
  const raceName = (race) => (race.kind === 'gp' ? race.name : 'Daily Crawl #' + race.number);

  /** Glacial's events, in the shared format, written by the paper because Glacial has no universe.js. */
  function glacialEvents(from, to) {
    const out = [];
    for (const race of races) {
      const fin = race.startMs + race.winner.finishMs;
      if (fin < from || fin >= to) continue;
      const second = race.results[1];
      out.push({ id: 'glacial:' + race.id + ':finish', time: iso(fin), ms: fin, source: 'glacial', type: 'race.finish', importance: race.kind === 'gp' ? 5 : 3,
        data: { race: race.id, winner: race.winner.id, second: second.id, margin_px: Math.round(race.marginPx) },
        headline: pname(race.winner.id) + ' wins the ' + raceName(race) + ' by ' + Math.round(race.marginPx) + ' pixels', race });
      for (const r of race.paper.records) {
        out.push({ id: 'glacial:' + race.id + ':record-' + r.kind, time: iso(endOf(race)), ms: endOf(race), source: 'glacial', type: 'record.' + r.kind, importance: 4,
          data: r, headline: recordLine(race, r), race });
      }
    }
    return out;
  }
  function recordLine(race, r) {
    switch (r.kind) {
      case 'closest': return 'Closest finish on record: ' + pname(race.winner.id) + ' wins by ' + r.value.toFixed(1) + ' pixels';
      case 'biggest': return 'Largest winning margin on record: ' + Math.round(r.value) + ' pixels';
      case 'fastest': return 'Fastest Daily Crawl on record: ' + dur(r.value);
      case 'nap': return pname(r.id) + ' sets a new record for the longest nap: ' + dur(r.value);
      case 'speed': return pname(r.id) + ' reaches a record ' + Math.round(r.value) + ' pixels an hour';
      case 'streak': return pname(r.id) + ' wins a record ' + r.value + ' Daily Crawls in a row';
    }
    return '';
  }

  // ---------------------------------------------------------------- the writers
  const QUOTES_WIN = ['about what I expected', 'the only sensible outcome', 'frankly overdue', 'a relief, mostly', 'never in doubt, apart from the middle part', 'deserved'];
  const QUOTES_LOSE = ['declined to comment', 'was seen leaving the shop shortly after midnight', 'said only that there would be other days', 'said the result would be studied carefully', 'asked not to be quoted, then asked to be quoted'];

  function longestNap(race) {
    let best = null;
    for (const e of race.events) if (e.type === 'nap' && (!best || e.dur > best.dur)) best = e;
    return best ? { id: race.lineup[best.i], ms: best.dur * race.segMs, x: best.x } : null;
  }
  const where = (x) => (x < 0.25 ? 'in the first quarter' : x < 0.5 ? 'before halfway' : x < 0.75 ? 'past halfway' : x < 0.9 ? 'in the final quarter' : 'within sight of the line');

  function bettorsOn(raceId, t) {
    const B = desk.bookmaker();
    if (!B) return null;
    const s = B.stateAt(t);
    if (!s.started) return null;
    return s.recent.filter((m) => m.raceId === raceId)[0] || null;
  }

  function writeRace(e, ctx) {
    const race = e.race, r = seeded(ymd(ctx.day) + ':' + race.id);
    const W = race.winner, Wn = pname(W.id), m = race.marginPx, mR = Math.round(m);
    const nap = longestNap(race);
    const body = [];
    let headline;
    if (race.kind === 'crawl') {
      const Ln = pname(race.results[1].id);
      const options = [Wn + ' beats ' + Ln + ' by ' + mR + ' pixels', Wn + ' holds off ' + Ln, Wn + ' takes Crawl #' + race.number];
      if (m < 15) options.push(Wn + ' edges ' + Ln + ' in a close one', 'Narrow win for ' + Wn);
      if (m > 200) options.push(Wn + ' wins by a distance', 'Comfortable day for ' + Wn);
      if (nap && nap.id !== W.id && nap.ms > 2 * H) options.push(Ln + ' sleeps, ' + Wn + ' wins');
      if (race.paper.streak >= 3) options.push(Wn + ' makes it ' + race.paper.streak + ' in a row');
      headline = pick(r, options);
      body.push(Wn + ' won ' + raceName(race) + ' yesterday, crossing the line ' + mR + ' pixel' + (mR === 1 ? '' : 's') + ' ahead of ' + Ln +
        ' after ' + dur(W.finishMs) + ' on the track.');
    } else {
      const podium = race.results.slice(0, 3).map((x) => pname(x.id));
      headline = pick(r, [Wn + ' wins the ' + race.name, race.name + ' to ' + Wn, Wn + ' takes the ' + race.name + ' after two days']);
      body.push(Wn + ' won the ' + race.name + ' yesterday after ' + dur(W.finishMs) + ', finishing ' + mR + ' pixel' + (mR === 1 ? '' : 's') + ' clear of ' + podium[1] +
        ', with ' + podium[2] + ' third.');
      const fin = race.results.filter((x) => x.finishMs !== null).length;
      body[0] += fin === 8 ? ' All eight finished inside the 48-hour window.' : ' ' + cap(count(fin, 'pixel')) + ' of the eight finished inside the 48-hour window.';
    }
    // the shape of the race
    let shape = race.leadChanges === 0 ? Wn + ' led from the start and was never headed.'
      : 'The lead changed hands ' + (race.leadChanges === 1 ? 'once' : race.leadChanges === 2 ? 'twice' : count(race.leadChanges, 'time')) + '.';
    if (nap && nap.ms >= 30 * MIN) shape += ' ' + pname(nap.id) + ' slept for ' + dur(nap.ms) + ' ' + where(nap.x) + (nap.id === W.id ? ' and won anyway.' : '.');
    const sprints = race.sprintCount;
    if (sprints) shape += ' There ' + (sprints === 1 ? 'was one sprint' : 'were ' + count(sprints, 'sprint')) + ' in all.';
    body.push(shape);
    // conditions at the stadium: reported, never blamed
    const Wx = desk.weather();
    if (Wx) {
      const s = Wx.sample(race.startMs + (race.kind === 'gp' ? DAY : 12 * H));
      body.push('Conditions at the Glacial Stadium were ' + (s.rain > 0 ? 'wet' : s.cloud > 0.7 ? 'overcast' : 'dry') + ', ' + Math.round(s.temp) + '°C at midday, with a ' +
        (s.wind >= 30 ? 'strong ' : 'light ') + s.compass + ' wind. Pixels are not affected by the weather, and none complained.');
    }
    // ratings and streaks
    const after = race.paper.ratingAfter, before = race.paper.ratingBefore;
    if (race.kind === 'crawl') {
      const Lid = race.results[1].id;
      body.push(Wn + '’s rating rises from ' + Math.round(before[W.id]) + ' to ' + Math.round(after[W.id]) + '; ' + pname(Lid) + ' falls to ' + Math.round(after[Lid]) + '.' +
        (race.paper.streak >= 3 ? ' It is ' + Wn + '’s ' + ordinal(race.paper.streak) + ' Daily Crawl win in a row.' : ''));
    } else {
      const pts = G().GP_POINTS;
      body.push('The win is worth ' + pts[0] + ' championship points. ' + list(race.results.slice(1, 3).map((x, i) => pname(x.id) + ' takes ' + pts[i + 1])) + '.');
    }
    // the shop
    const m2 = bettorsOn(race.id, endOf(race));
    if (m2) {
      const winners = m2.bets.filter((b) => b.result === 'won').sort((a, b) => b.payout - a.payout);
      const losers = m2.bets.filter((b) => b.result === 'lost').sort((a, b) => b.stake - a.stake);
      let s = Wn + ' started at ' + m2.sp[W.id].toFixed(2) + ' at the Bookmaker.';
      if (winners[0]) s += ' ' + winners[0].name + ' of ' + winners[0].district + ', who had ' + winners[0].stake + ' W on at ' + winners[0].odds.toFixed(2) + ', called it “' + pick(r, QUOTES_WIN) + '”.';
      if (losers[0]) s += ' ' + losers[0].name + ', who backed ' + pname(losers[0].runner) + ' for ' + losers[0].stake + ' W, ' + pick(r, QUOTES_LOSE) + '.';
      body.push(s);
    }
    return { headline, standfirst: race.kind === 'gp' ? 'Two days, eight pixels, one winner' : raceName(race) + ', ' + Wn + ' v ' + pname(race.results[1].id),
      body, color: PX(W.id).color, table: race.kind === 'gp' ? race.results.map((x) => [x.place + 1, pname(x.id), x.finishMs !== null ? dur(x.finishMs) : Math.round(x.endX * 100) + '% of the track']) : null };
  }

  function writeRecord(e) {
    const race = e.race, rec = e.data;
    const prev = rec.kind === 'fastest' || rec.kind === 'nap' ? dur(rec.previous) : rec.kind === 'speed' ? Math.round(rec.previous) + ' pixels an hour' : rec.kind === 'streak' ? rec.previous + ' wins' : Math.round(rec.previous * 10) / 10 + ' pixels';
    return { headline: e.headline, body: [e.headline + ', in ' + raceName(race) + '. The previous record was ' + prev + '. It will be entered in the books, which are kept by hand.'] };
  }

  const WRITERS = {
    'race.finish': writeRace,
    'record.closest': writeRecord, 'record.biggest': writeRecord, 'record.fastest': writeRecord, 'record.nap': writeRecord, 'record.speed': writeRecord, 'record.streak': writeRecord,
    'storm.watch': (e) => ({ headline: e.data.storm + ' on the way', body: [e.headline + '.', 'The Bureau advises residents to secure loose pixels.'] }),
    'storm.arrives': (e) => ({ headline: e.data.storm + ' arrives', body: [e.headline + '.', 'Racing continues as normal. It always does.'] }),
    'storm.clears': (e) => ({ headline: e.data.storm + ' moves on', body: [e.headline + '.', 'Clean-up crews were out by morning.'] }),
    'weather.record': (e) => ({ headline: e.headline.split(':')[0], body: [e.headline + '.', 'The Bureau confirmed the reading twice, then a third time to be sure.'] }),
    'weather.deluge': (e) => ({ headline: 'A very wet day', body: [e.headline + '.'] }),
    'forecaster.bust': (e) => ({ headline: 'Forecast misses', body: [e.headline + '.', 'Isobar Fairweather has issued a forecast every morning since the first Daily Crawl and does not intend to stop now.'] }),
    'dryspell': (e) => ({ headline: 'Still no rain', body: [e.headline + '. Gardeners have been asked to be patient.'] }),
    'dryspell.end': (e) => ({ headline: 'Rain, at last', body: [e.headline + '.'] }),
    'city.smog': (e) => ({ headline: 'Smog alert for the city', body: [e.headline + '.', 'Residents with sensitive pixels are advised to stay indoors and dim themselves where possible.'] }),
    'city.blackout': (e) => ({ headline: 'Lights out in ' + (e.data.districts && e.data.districts.length > 2 ? 'parts of the city' : 'the districts'), body: [e.headline + '.', 'The grid’s shortfall peaked at ' + (e.data.shortfall || 0) + ' MW.'] }),
    'city.record': (e) => ({ headline: 'Record demand on the grid', body: [e.headline + '.'] }),
    'city.closure': (e) => ({ headline: e.headline, body: [e.headline + '.'] }),
    'election.summary': (e) => {
      const c = e.data.composition;
      return { headline: e.data.hung ? 'No majority in the Senate' : 'A majority in the Senate', body: [e.headline + '.',
        'Brightness hold ' + c.B + ' seats, Verdant ' + c.V + ' and Legacy Mode ' + c.L + (c.I ? ', with ' + count(c.I, 'independent') : '') + '. Twenty-five are needed to govern alone.'] };
    },
    'senate.opening': (e) => ({ headline: 'The Senate sits', body: [e.headline + '.', 'Proceedings began at 19:00 UTC and were conducted with great seriousness.'] }),
    'bill.passed': (e) => ({ headline: e.data.title.replace(/ Bill$/, '') + ' passes', body: ['The Senate passed the ' + e.data.title + ' by ' + e.data.ayes + ' votes to ' + e.data.noes + '.' +
      (e.data.rebels && e.data.rebels.length ? ' ' + cap(count(e.data.rebels.length, 'senator')) + ' crossed the floor.' : ''), 'It takes effect at 00:00 UTC today.'] }),
    'bill.failed': (e) => ({ headline: e.data.title.replace(/ Bill$/, '') + ' defeated', body: ['The ' + e.data.title + ' was defeated by ' + e.data.noes + ' votes to ' + e.data.ayes + '.'] }),
    'filibuster.end': (e) => ({ headline: 'A long speech ends', body: [e.headline + '.'] }),
    'senator.scandal': (e) => ({ headline: 'Senator apologises', body: [e.headline + '.'] }),
    'record.payout': (e) => ({ headline: 'Record payout at the Bookmaker', body: [e.headline + '.'] }),
    'record.longshot': (e) => ({ headline: 'Longshot lands', body: [e.headline + '.'] }),
    'resident.ruined': (e) => ({ headline: 'A regular is cleaned out', body: [e.headline + '.', 'The stipend arrives on the 1st.'] }),
    // the business desk: the Exchange and the docks
    'business.closed': (e) => ({ headline: e.data.name + ' closes', body: [e.headline + '.', 'The business ' + (e.data.reason === 'ran out of credit' ? 'ran out of credit' : 'gave up after months of losses') + '. Its staff will be looking for work at the Job Centre.'] }),
    'market.boom': (e) => ({ headline: 'Sprite orders jump', body: [e.headline + '.', 'The Exchange expects the palette refineries and texture foundries to feel it within weeks.'] }),
    'market.slump': (e) => ({ headline: 'Sprite orders fall', body: [e.headline + '.', 'The Exchange expects the palette refineries and texture foundries to feel it within weeks.'] }),
    'market.shortage': (e) => ({ headline: 'Short of ' + e.data.market.toLowerCase(), body: [e.headline + '.'] }),
    'market.report': (e) => ({ headline: 'The month on the Exchange', body: [e.headline + '.', 'The shopping basket stands at ' + e.data.cpi.toFixed(1) + ', against 100 on the first day of trading.'] }),
    'freight.rawlow': (e) => ({ headline: 'Raw colour runs low', body: [e.headline + '.'] }),
    'freight.dockfull': (e) => ({ headline: 'The export dock is full', body: [e.headline + '.'] }),
    'freight.shelves': (e) => ({ headline: 'Empty shelves', body: [e.headline + '.', 'Shops can only sell what the rounds bring.'] }),
    // the society pages
    'fad.everywhere': (e) => ({ headline: e.data.category === 'song' ? 'The song of the moment' : e.data.category === 'colour' ? e.data.item + ', everywhere' : 'The craze of the moment', body: [e.headline + '.'] }),
    'bank.opened': (e) => ({ headline: 'The Bank of Pixel City opens', body: [e.headline + '.', 'Its first act was to take over every business\u2019s overdraft.'] }),
    'bank.rate': (e) => ({ headline: 'Bank rate ' + (e.data.rate > e.data.was ? 'up' : 'down') + ' to ' + e.data.rate + '%', body: [e.headline + '.', 'Prices in the shops have risen at a yearly pace of ' + e.data.inflation + '% over the last three months.'] }),
    'bank.default': (e) => ({ headline: 'A large bad debt', body: [e.headline + '.'] }),
    'bank.squeeze': (e) => ({ headline: 'The Bank tightens', body: [e.headline + '.', 'Its capital stands at ' + e.data.capitalRatio + '% of its lending.'] }),
    'bank.capital': (e) => ({ headline: 'The Bank stops lending', body: [e.headline + '.'] }),
    'bank.arrears': (e) => ({ headline: 'Home loans in arrears', body: [e.headline + '.'] }),
    // disasters
    'glitch.start': (e) => ({ headline: { corruption: 'Textures corrupt in ' + e.data.district, refresh: e.data.district + ' loses its signal', bleed: 'Palette bleed in ' + e.data.district, stuck: e.data.district + ' freezes', leak: 'Leak at the export dock' }[e.data.type] || e.data.label,
      body: [e.headline + '.', 'The city expects it to last about ' + e.data.hours + ' hours. ' + (e.data.type === 'refresh' ? 'The district is dark until then.' : e.data.type === 'stuck' ? 'Deliveries cannot get in.' : e.data.type === 'leak' ? 'The refineries will feel it.' : 'The patch shops are already busy.')] }),
    'glitch.spread': (e) => ({ headline: 'Glitch spreads to ' + e.data.district, body: [e.headline + '.', 'It is the ' + e.data.label.toLowerCase() + ' that began elsewhere, and it has not finished.'] }),
    // the city's comings and goings
    'society.migration': (e) => ({ headline: 'Comings and goings', body: [e.headline + '.'] }),
    'society.exodus': (e) => ({ headline: 'Pixels leave ' + e.data.district, body: [e.headline + '.', 'Senators who hold seats there face the voters with fewer of them.'] }),
    'society.full': (e) => ({ headline: e.data.district + ' is full', body: [e.headline + '.'] }),
    'society.turns': (e) => ({ headline: e.data.community + ' change sides', body: [e.headline + '.'] })
  };
  const SECTION = { glacial: 'Racing', weather: 'Weather', senate: 'The Senate', city: 'City', bookmaker: 'The Turf', commerce: 'Business', freight: 'Business', bank: 'Business', society: 'Society' };
  const SOURCE_RANK = { glacial: 0, senate: 1, weather: 2, city: 3, commerce: 4, bank: 4, freight: 5, society: 6, bookmaker: 7 };

  // ---------------------------------------------------------------- the edition
  const cache = new Map();
  function editionAt(t) {
    if (!ready()) return null;
    const d = dayOf(t);
    if (d < EPOCH) return null;
    if (cache.has(d)) return cache.get(d);
    ensureLeague(d + 1);
    const from = d - DAY + 1, to = d + 1; // the 24 hours up to and including the moment of publication
    const missing = [];
    const events = glacialEvents(from, to);
    for (const [key, name] of [['weather', 'climate'], ['senate', 'senate'], ['city', 'city'], ['bookmaker', 'bookmaker']]) {
      const s = desk[key]();
      if (!s) { missing.push(key); continue; }
      try { for (const e of s.eventsBetween(from, to)) events.push(Object.assign({ ms: Date.parse(e.time) }, e, { source: key === 'weather' ? 'weather' : e.source })); }
      catch (err) { missing.push(key); }
    }
    // the Exchange and Society post their results at the close, in the first minute after 00:00 UTC: this edition
    for (const key of ['commerce', 'freight', 'bank', 'society']) {
      const s = desk[key]();
      if (!s) { missing.push(key); continue; }
      try { for (const e of s.eventsBetween(from + MIN, to + MIN)) events.push(Object.assign({ ms: Date.parse(e.time) }, e)); }
      catch (err) { missing.push(key); }
    }
    const ctx = { day: d };

    // stories and briefs
    const stories = [], briefs = {};
    const brief = (sec, text) => (briefs[sec] = briefs[sec] || []).push(text);
    const agg = { coal: [0, 0], gas: [0, 0], intro: [], results: 0, held: [], closed: [], opened: [], fads: [], mended: 0 };
    for (const e of events) {
      const w = WRITERS[e.type];
      if (w && (e.importance >= 2 || e.type === 'race.finish') && !((e.type === 'business.closed' || e.type === 'bank.default') && e.importance < 3)) { // small closures go in the briefs
        const s = w(e, ctx);
        stories.push(Object.assign({ id: e.id, section: SECTION[e.source] || 'News', source: e.source, importance: e.importance, time: e.time, ms: e.ms }, s));
        continue;
      }
      if (e.type === 'port.coal') { agg.coal[0]++; agg.coal[1] += e.data.cargo; continue; }
      if (e.type === 'port.gas') { agg.gas[0]++; agg.gas[1] += e.data.cargo; continue; }
      if (e.type === 'port.held') { agg.held.push(e.data.ship); continue; }
      if (e.type === 'bill.introduced') { agg.intro.push(e.data.title); continue; }
      if (e.type === 'election.result') { agg.results++; continue; }
      if (e.type === 'bet.large' || e.type === 'market.open' || e.type === 'market.settled') continue; // in the Turf column
      if (e.type === 'forecaster.week') continue;
      if (e.type === 'business.closed') { agg.closed.push(e.data.name + ' (' + e.data.district + ')'); continue; }
      if (e.type === 'business.opened') { agg.opened.push(e.data.name + ' (' + e.data.district + ')'); continue; }
      if (e.type === 'fad.start') { agg.fads.push(e.headline); continue; }
      if (e.type === 'society.reconciled') { agg.mended++; continue; }
      brief(SECTION[e.source] || 'News', e.headline + '.');
    }
    if (agg.coal[0]) brief('City', cap(count(agg.coal[0], 'coal carrier')) + ' docked, bringing ' + num(agg.coal[1]) + ' t of coal for the power plants.');
    if (agg.gas[0]) brief('City', cap(count(agg.gas[0], 'gas tanker')) + ' docked with ' + num(agg.gas[1]) + ' t of gas for the peakers.');
    if (agg.held.length) brief('City', (agg.held.length === 1 ? 'The ' + agg.held[0] + ' was' : list(agg.held) + ' were') + ' held outside the harbour by the weather.');
    if (agg.intro.length) brief('The Senate', 'Introduced: ' + list(agg.intro) + '.');
    if (agg.closed.length) brief('Business', 'Closed: ' + list(agg.closed) + '.');
    if (agg.opened.length) brief('Business', 'Opened: ' + list(agg.opened) + '.');
    for (const f of agg.fads.slice(0, 3)) brief('Society', f + '.');
    if (agg.mended) brief('Society', cap(count(agg.mended, 'old quarrel')) + ' patched up.');
    if (agg.results) brief('The Senate', 'Results were declared in ' + count(agg.results, 'seat') + '. Full returns on page two, which does not exist.');

    stories.sort((a, b) => b.importance - a.importance || SOURCE_RANK[a.source] - SOURCE_RANK[b.source] || a.ms - b.ms);
    const lead = stories[0] || null;

    // fixed boxes
    const boxes = { racecard: racecard(d), standings: standings(d), weather: weatherBox(d), city: cityBox(d), turf: turfBox(d) };
    const yesterday = races.filter((r) => endOf(r) <= d).slice(-1)[0];

    const ed = {
      number: Math.floor((d - EPOCH) / DAY) + 1, date: ymd(d), day: d, longDate: longDate(d), published: iso(d), price: '1 W',
      winnerColor: yesterday ? PX(yesterday.winner.id).color : null,
      lead, stories: stories.slice(1), briefs, boxes, missing,
      quiet: !stories.length
    };
    if (cache.size > 40) cache.clear();
    cache.set(d, ed);
    return ed;
  }

  function racecard(d) {
    const g = G();
    // today's race: the one starting at d, or the Grand Prix still running on the 2nd
    const all = races.concat(L.current ? [L.current] : []);
    let race = all.filter((r) => r.startMs <= d && endOf(r) > d)[0] || (L.next && L.next.startMs === d ? L.next : null);
    if (!race) return null;
    const running = race.startMs < d;
    const B = desk.bookmaker();
    let prices = null;
    if (B && !running) {
      try {
        const s = B.stateAt(d - 1);
        const m = s.started && s.open && s.open.raceId === race.id ? s.open : null;
        if (m) { prices = {}; m.runners.forEach((x, i) => (prices[x.id] = m.prices[i])); }
      } catch (e) { prices = null; }
    }
    // ratings as they stood at publication
    const rating = {};
    g.PIXELS.forEach((p) => (rating[p.id] = 1500));
    for (const r of races) if (endOf(r) <= d) for (const id in r.ratingDelta) rating[id] += r.ratingDelta[id];
    let halfway = null;
    if (running && race.pos) {
      const ms = d - race.startMs;
      halfway = race.lineup.map((id, i) => ({ id, x: g.posAt(race, i, ms) })).sort((a, b) => b.x - a.x);
    }
    return {
      raceId: race.id, name: raceName(race), kind: race.kind, start: iso(race.startMs), running,
      runners: race.lineup.map((id) => ({ id, name: pname(id), color: PX(id).color, rating: Math.round(rating[id]), price: prices ? prices[id] : null, bio: PX(id).bio })),
      halfway: halfway && halfway.map((h) => ({ id: h.id, name: pname(h.id), color: PX(h.id).color, pct: Math.round(h.x * 1000) / 10 }))
    };
  }

  function standings(d) {
    const g = G();
    const year = new Date(d - 1).getUTCFullYear();
    const pts = {};
    g.PIXELS.forEach((p) => (pts[p.id] = 0));
    for (const r of races) {
      if (endOf(r) > d || new Date(r.startMs).getUTCFullYear() !== year) continue;
      for (const res of r.results) pts[res.id] += (r.kind === 'gp' ? g.GP_POINTS[res.place] : g.CRAWL_POINTS[res.place]) || 0;
    }
    return { year, table: g.PIXELS.map((p) => ({ id: p.id, name: p.name, color: p.color, points: pts[p.id] })).sort((a, b) => b.points - a.points || (a.id < b.id ? -1 : 1)).slice(0, 8) };
  }

  function weatherBox(d) {
    const Wx = desk.weather();
    if (!Wx) return null;
    const fc = Wx.forecastAt(d);
    const today = fc ? fc.days.filter((x) => x.date === ymd(d))[0] : null;
    const y = d - DAY >= EPOCH ? Wx.dayAt(d - DAY) : null;
    const v = d - DAY > EPOCH ? Wx.verify(d - DAY) : null;
    const st = Wx.forecasterStats(d);
    return {
      today: today && { text: today.text, max: today.max, min: today.min, chance: today.chance },
      outlook: fc ? fc.days.filter((x) => x.day > d).slice(0, 3).map((x) => ({ date: x.date, day: DAYS[new Date(x.day).getUTCDay()], text: x.text, max: x.max, min: x.min })) : [],
      yesterday: y && { cond: y.cond, max: y.max, min: y.min, rain: y.rain, gust: y.gust },
      verdict: v ? (v.hit ? 'Yesterday’s forecast was correct.' : v.bust ? 'Yesterday’s forecast was badly wrong.' : 'Yesterday’s forecast was close, but not close enough.') : null,
      accuracy: st && st.days ? Math.round(st.accuracy * 100) : null, forecaster: Wx.forecaster ? Wx.forecaster.name : 'The Bureau'
    };
  }

  function cityBox(d) {
    const C = desk.city();
    if (!C || d - DAY < EPOCH) return null;
    try {
      const day = C.historyBetween(d - DAY, d)[0];
      const s = C.stateAt(d - 1);
      if (!day || !s.started) return null;
      return { peak: day.peak, clean: day.clean, blackoutHours: day.blackoutHours, aqi: s.aqi, air: s.air, residents: s.residents };
    } catch (e) { return null; }
  }

  function turfBox(d) {
    const B = desk.bookmaker();
    if (!B) return null;
    try {
      const s = B.stateAt(d);
      if (!s.started) return null;
      const m = s.recent.filter((x) => x.startMs + x.windowMs === d)[0];
      if (!m) return null;
      const big = m.bets.slice().sort((a, b) => b.stake - a.stake)[0];
      return { race: m.name, winner: pname(m.winner), sp: m.sp[m.winner], bets: m.bets.length, taken: m.taken, paid: m.paid,
        biggest: big ? big.name + ' staked ' + big.stake + ' W on ' + pname(big.runner) + ' at ' + big.odds.toFixed(2) + (big.result === 'won' ? ', and collected ' + big.payout + ' W.' : big.result === 'void' ? ', and got it back.' : ', and lost it.') : null };
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------------- public API
  root.PixelUniverse = root.PixelUniverse || {};
  root.PixelUniverse.paper = {
    version: VERSION, source: 'paper', startDate: ymd(EPOCH), epoch: EPOCH, ready,
    /** Today's edition at time t (published at the most recent 00:00 UTC). */
    stateAt: (t) => (ready() ? { time: t, started: t >= EPOCH, edition: editionAt(t) } : { time: t, started: false, unavailable: 'Glacial or the Weather Bureau could not be reached' }),
    editionAt,
    /** The paper reports; it makes no news of its own. */
    eventsBetween: () => []
  };
})(typeof window !== 'undefined' ? window : globalThis);
