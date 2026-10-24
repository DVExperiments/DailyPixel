/*
 * The printing press. Rendering only: reads PixelUniverse.paper and lays out an edition.
 * Only this file calls Date.now(). The edition shown is chosen by #YYYY-MM-DD, or today's by default.
 */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const P = window.PixelUniverse && window.PixelUniverse.paper;
  const DAY = 86400000;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dayOf = (ms) => ms - (ms % DAY);
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const ymd = (ms) => { const d = new Date(ms); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  const sw = (c) => (c ? '<span class="swatch" style="background:' + c + '"></span>' : '');
  const temp = (x) => Math.round(x) + '°';

  // ---------------------------------------------------------------- the masthead, set in pixels
  const GLYPHS = {
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['111', '010', '010', '010', '010', '010', '111'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    ' ': ['000', '000', '000', '000', '000', '000', '000']
  };
  function wordmark(dotColor) {
    let x = 0, rects = '';
    for (const ch of 'THE DAILY PIXEL') {
      const g = GLYPHS[ch];
      for (let y = 0; y < 7; y++) for (let i = 0; i < g[y].length; i++) if (g[y][i] === '1') rects += 'M' + (x + i) + ' ' + y + 'h1v1h-1z';
      x += g[0].length + 1;
    }
    // a single lit pixel after the name: yesterday's winner's colour
    const dot = '<rect x="' + x + '" y="6" width="1" height="1" fill="' + (dotColor || 'currentColor') + '"/>';
    return '<svg viewBox="-0.5 -0.5 ' + (x + 2) + ' 8" shape-rendering="crispEdges" role="img" aria-label="The Daily Pixel"><path d="' + rects + '" fill="currentColor"/>' + dot + '</svg>';
  }

  // ---------------------------------------------------------------- the Senate's laws, cosmetically
  const FONT_AXES = {
    'Space Grotesk': 'wght@500;700', 'Fraunces': 'opsz,wght@9..144,500;9..144,700;9..144,800', 'DM Serif Display': '',
    'Syne': 'wght@500;700;800', 'Archivo Narrow': 'wght@500;600;700', 'Source Serif 4': 'opsz,wght@8..60,400;8..60,600',
    'Work Sans': 'wght@400;500;600', 'Atkinson Hyperlegible': 'wght@400;700', 'IBM Plex Mono': 'wght@400;500;600', 'Literata': 'opsz,wght@7..72,400;7..72,600'
  };
  const loaded = {};
  function loadFont(name) {
    if (!name || loaded[name] || !(name in FONT_AXES)) return;
    loaded[name] = true;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + name.replace(/ /g, '+') + (FONT_AXES[name] ? ':' + FONT_AXES[name] : '') + '&display=swap';
    document.head.appendChild(l);
  }
  const dark = matchMedia('(prefers-color-scheme: dark)');
  /** Each edition is printed in the colours and type that were law on its day. */
  function applyLaws(t) {
    const senate = window.PixelUniverse && window.PixelUniverse.senate;
    if (!senate || !senate.styleVars || (senate.ready && !senate.ready())) return;
    try {
      const vars = senate.styleVars(t, dark.matches ? 'dark' : 'light');
      for (const k in vars) document.documentElement.style.setProperty(k, vars[k]);
      const laws = senate.lawsAt(t);
      loadFont(laws['style.display']);
      loadFont(laws['style.body']);
    } catch (e) { /* keep the default look */ }
  }

  // ---------------------------------------------------------------- an edition
  function storyHtml(s, cls, level) {
    const h = level || 'h3';
    return '<article class="' + cls + '"><span class="kicker">' + esc(s.section) + '</span>' +
      '<' + h + '>' + esc(s.headline) + '</' + h + '>' +
      (s.standfirst && cls === 'lead' ? '<p class="standfirst">' + sw(s.color) + esc(s.standfirst) + '</p>' : '') +
      '<div class="body">' + s.body.map((p) => '<p>' + esc(p) + '</p>').join('') + '</div>' +
      (s.table ? '<table class="results"><tbody>' + s.table.map((r) => '<tr><td>' + r[0] + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('') + '</tbody></table>' : '') +
      '</article>';
  }

  function racecardHtml(c, isToday) {
    if (!c) return '';
    let rows;
    if (c.halfway) {
      rows = c.halfway.map((h) => '<tr><td>' + sw(h.color) + '<b>' + esc(h.name) + '</b><div class="bar"><span style="width:' + h.pct + '%;background:' + h.color + '"></span></div></td><td class="r">' + h.pct + '%</td></tr>').join('');
      return '<section class="box"><h3>At halfway: ' + esc(c.name) + '</h3><table class="card"><tbody>' + rows + '</tbody></table><p class="small">Positions at 00:00 UTC, with a day still to run.</p></section>';
    }
    rows = c.runners.map((r) => '<tr><td>' + sw(r.color) + '<b>' + esc(r.name) + '</b><br><span class="small">Rating ' + r.rating + '</span></td><td class="r">' +
      (r.price ? '<span class="price">' + r.price.toFixed(2) + '</span>' : '') + '</td></tr>').join('');
    return '<section class="box"><h3>Today: ' + esc(c.name) + '</h3><table class="card"><tbody>' + rows + '</tbody></table>' +
      '<p class="small">Off at 00:00 UTC.' + (c.runners[0].price ? ' Prices are the Bookmaker’s at the close of betting.' : '') +
      (isToday ? ' <a href="https://dvexperiments.github.io/Glacial/">Watch live</a>' : '') + '</p></section>';
  }

  function weatherHtml(w) {
    if (!w) return '';
    let h = '<section class="box"><h3>Weather</h3>';
    if (w.today) h += '<p><span class="big-temp">' + temp(w.today.max) + '</span> <span class="small">low ' + temp(w.today.min) + ', rain ' + w.today.chance + '%</span></p><p>' + esc(w.today.text) + '</p>';
    if (w.outlook.length) h += '<ul class="outlook">' + w.outlook.map((o) => '<li><span>' + o.day + '</span><span>' + esc(o.text) + '</span><span>' + temp(o.max) + '/' + temp(o.min) + '</span></li>').join('') + '</ul>';
    if (w.yesterday) h += '<p class="small" style="margin-top:10px">Yesterday: ' + esc(w.yesterday.cond.toLowerCase()) + ', ' + temp(w.yesterday.max) + ' to ' + temp(w.yesterday.min) + (w.yesterday.rain ? ', ' + w.yesterday.rain + ' mm of rain' : '') + '. ' + esc(w.verdict || '') +
      (w.accuracy !== null ? ' ' + esc(w.forecaster) + ' is right ' + w.accuracy + '% of the time.' : '') + '</p>';
    return h + '</section>';
  }

  function tablesHtml(b, isToday) {
    const s = b.standings;
    let h = '<div class="tables">';
    h += '<section class="box"><h3>' + s.year + ' championship</h3><table class="card"><tbody>' + s.table.map((r, i) => '<tr><td>' + (i + 1) + '. ' + sw(r.color) + esc(r.name) + '</td><td class="r">' + r.points + ' pts</td></tr>').join('') + '</tbody></table></section>';
    if (b.city) h += '<section class="box"><h3>The city yesterday</h3><dl class="figures">' +
      '<div><dt>Peak demand</dt><dd>' + Math.round(b.city.peak) + ' MW</dd></div><div><dt>From clean energy</dt><dd>' + b.city.clean + '%</dd></div>' +
      '<div><dt>Air quality</dt><dd>' + b.city.aqi + '</dd></div><div><dt>Hours of blackout</dt><dd>' + b.city.blackoutHours + '</dd></div></dl><p class="small" style="margin-top:8px">Air: ' + esc(b.city.air) + '.</p></section>';
    if (b.turf) h += '<section class="box"><h3>The turf</h3><p>' + esc(b.turf.winner) + ' won the ' + esc(b.turf.race) + ' at ' + b.turf.sp.toFixed(2) + '. The regulars placed ' + b.turf.bets + ' bets worth ' + b.turf.taken.toLocaleString('en') + ' W; the house paid out ' + b.turf.paid.toLocaleString('en') + ' W.</p>' +
      (b.turf.biggest ? '<p class="small">Biggest bet: ' + esc(b.turf.biggest) + '</p>' : '') + (isToday ? '<p class="small"><a href="https://dvexperiments.github.io/Bookmaker/">Today’s prices at the Bookmaker</a></p>' : '') + '</section>';
    return h + '</div>';
  }

  const DESK = { senate: 'Senate', city: 'City', bookmaker: 'Bookmaker', weather: 'Weather Bureau', commerce: 'Exchange', freight: 'Freight', society: 'Society', bank: 'Bank', university: 'University' };
  function render(d) {
    const ed = P.editionAt(d);
    applyLaws(d + DAY / 2);
    $('wordmark').innerHTML = wordmark(ed.winnerColor);
    $('ed-no').textContent = 'No. ' + ed.number.toLocaleString('en');
    $('ed-date').textContent = ed.longDate;
    document.title = 'The Daily Pixel, ' + ed.longDate;
    const today = dayOf(Date.now());
    const prev = d - DAY, next = d + DAY;
    $('prev').href = '#' + ymd(prev); $('prev').setAttribute('aria-disabled', String(prev < P.epoch));
    $('next').href = '#' + ymd(next); $('next').setAttribute('aria-disabled', String(next > today));
    $('today').href = '#'; $('today').setAttribute('aria-disabled', String(d === today));
    $('pickdate').min = ymd(P.epoch); $('pickdate').max = ymd(today); $('pickdate').value = ymd(d);

    if (ed.missing.length) {
      $('notice').hidden = false;
      $('notice').textContent = 'The ' + ed.missing.map((k) => DESK[k]).join(', ') + ' desk' + (ed.missing.length === 1 ? ' did' : 's did') + ' not file in time for this edition. Reload the page to try again.';
    } else $('notice').hidden = true;

    let h = '<div class="front">';
    if (ed.lead) h += storyHtml(ed.lead, 'lead', 'h2');
    else h += '<div class="quiet"><span class="kicker">News</span><h2>' + (ed.number === 1 ? 'The first Daily Crawl begins today' : 'A quiet day in the Pixel Universe') + '</h2><p>' +
      (ed.number === 1 ? 'Two pixels will set off at 00:00 UTC. They are expected to finish tomorrow. This newspaper will be there.' : 'Nothing of note happened yesterday. Our reporters have been told to look harder.') + '</p></div>';
    h += '<aside class="rail">' + racecardHtml(ed.boxes.racecard, d === today) + weatherHtml(ed.boxes.weather) + '</aside></div>';
    if (ed.stories.length) h += '<div class="inside">' + ed.stories.map((s, i) => storyHtml(s, 'story' + (i === 0 && s.body.length > 2 ? ' wide' : ''))).join('') + '</div>';
    h += tablesHtml(ed.boxes, d === today);
    const secs = Object.keys(ed.briefs);
    if (secs.length) h += '<section class="briefs"><h2>In brief</h2><div class="brief-cols">' + secs.map((k) => '<div class="brief-sec"><h3>' + esc(k) + '</h3>' + ed.briefs[k].map((b) => '<p>' + esc(b) + '</p>').join('') + '</div>').join('') + '</div></section>';
    $('edition').innerHTML = h;
  }

  // ---------------------------------------------------------------- choosing the edition
  let shown = null;
  function wanted() {
    const today = dayOf(Date.now());
    const m = location.hash.match(/^#(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return today;
    const d = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return d < P.epoch ? P.epoch : d > today ? today : d;
  }
  function show() {
    const d = wanted();
    if (d === shown) return;
    shown = d;
    $('edition').innerHTML = '<p class="loading">Setting the type…</p>';
    setTimeout(() => { render(d); window.scrollTo(0, 0); }, 20);
  }

  if (!P || !P.ready()) {
    $('wordmark').innerHTML = wordmark();
    $('edition').innerHTML = '<div class="quiet"><h2>The presses have stopped</h2><p>Glacial or the Weather Bureau could not be reached, and the paper cannot be printed without them. Reload the page to try again.</p></div>';
    return;
  }
  window.addEventListener('hashchange', show);
  $('pickdate').addEventListener('change', (e) => { if (e.target.value) location.hash = e.target.value; });
  dark.addEventListener('change', () => { if (shown !== null) applyLaws(shown + DAY / 2); });
  show();
  // a new edition at 00:00 UTC: readers of today's paper get the next one without reloading
  setInterval(() => { if (!location.hash && dayOf(Date.now()) !== shown) show(); }, 30000);
})();
