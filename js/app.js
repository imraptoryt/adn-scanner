/* ============================================================
   TERMINAL SOVEREIGN — ANALYSE GÉNÉTIQUE
   Accès biométrique → extraction → microscope → reconnexion
   → séquençage (recherche en base) → dossier + rapport toxicologique.
   JavaScript « classique » (sans modules) : GitHub Pages et NUI FiveM.
   ============================================================ */
(function () {
  'use strict';

  const D = window.ADN_DATA;
  const S = window.SFX;

  /* ---------- utilitaires ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hhmmss = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const NBSP = ' ';

  /* ---------- réglages du jeu ---------- */
  const TOTAL_PARTICLES = 8;
  const TOTAL_STRANDS = 5;
  const REQ_MAG = 400;          // grossissement à atteindre
  const ZOOM_RATE = 0.1;        // vitesse max du zoom (≈ 8 s image nette, ≈ 16 s image floue)
  const HOLD_TIME = 0.8;        // maintien de l'extracteur sur une particule (s)
  const HOLD_DECAY = 0.35;      // retombée de la jauge quand on la perd (s)
  const AUTH_TIME = 1.0;        // maintien sur l'empreinte (s)
  const STORE_KEY = 'sovereign-adn-scanner-v3';
  const magFromZ = (z) => Math.round(10 * Math.pow(100, z));
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const BREAKS = [[290, 152], [183, 288], [205, 338], [268, 418], [345, 438]];
  const RESIDUES = [[318, 115], [178, 225], [313, 378]];
  const SYMBOL_FR = { diamond: 'losange', triangle: 'triangle', circle: 'cercle', square: 'carré', cross: 'croix' };
  const STR_LOCI = [['D3S1358', 12, 19], ['vWA', 11, 21], ['FGA', 18, 30], ['D8S1179', 8, 19], ['D21S11', 24, 38], ['D18S51', 9, 26], ['D5S818', 7, 16], ['D13S317', 7, 15]];
  const BOOT_LINES = [
    ['SOVEREIGN//OS 4.2.1 · ЯДРО ЗАГРУЖЕНО', ''],
    ['Module génétique', 'OK'],
    ['Capteurs optiques · калибровка', 'OK'],
    ['Base citoyenne — 1 204 557 profils', 'OK'],
    ['Canal chiffré · AES-512', 'OK'],
    ['Lecteur biométrique', 'PRÊT']
  ];
  const MODES = {
    scope1: ['ZONE D\'ÉCHANTILLON', 'ЗОНА ОБРАЗЦА'],
    scope2: ['OBSERVATION MICROSCOPIQUE', 'МИКРОСКОПИЯ'],
    repair: ['RECONNEXION MOLÉCULAIRE', 'СРАЩИВАНИЕ'],
    seq: ['SÉQUENÇAGE · BASE CITOYENNE', 'СЕКВЕНИРОВАНИЕ'],
    dossier: ['DOSSIER D\'IDENTIFICATION', 'ЛИЧНОЕ ДЕЛО']
  };

  /* ---------- références DOM ---------- */
  const el = {
    app: $('#app'), stage: $('#stage'), scope: $('#scope'), scopeInner: $('#scopeInner'), zoomStack: $('#zoomStack'),
    layerDish: $('#layerDish'), layerCells: $('#layerCells'), layerHelix: $('#layerHelix'),
    breaks: $('#breaks'), residues: $('#residues'), particles: $('#particles'),
    glitch: $('#glitchFlash'), iris: $('#iris'), scaleTxt: $('#scaleTxt'),
    reservoir: $('#reservoir'), rTube: $('#rTube'), rGauge: $('#rGauge'), rCount: $('#rCount'),
    micPanel: $('#micPanel'), magValue: $('#magValue'), magReq: $('#magReq'), knobZoom: $('#knobZoom'), knobFocus: $('#knobFocus'), focusScope: $('#focusScope'),
    views: { scope: $('#viewScope'), repair: $('#viewRepair'), seq: $('#viewSeq'), dossier: $('#viewDossier') },
    board: $('#board'), ends: $('#ends'), sockets: $('#sockets'), wires: $('#wires'), boardDone: $('#boardDone'),
    launch: $('#launchWrap'), btnSequence: $('#btnSequence'),
    seqCanvas: $('#seqCanvas'), baseCanvas: $('#baseCanvas'), seqPct: $('#seqPct'), seqMsg: $('#seqMsg'), seqMsgRu: $('#seqMsgRu'), seqBar: $('#seqBar'), seqList: $('#seqList'),
    cand: $('#cand'), candId: $('#candId'), candPct: $('#candPct'), candBar: $('#candBar'), candImg: $('#cand .cand-photo img'),
    tractor: $('#tractor'), tractorCore: $('#tractorCore'), beam: $('#beamPath'), fx: $('#fx'), toolCursor: $('#toolCursor'),
    toast: $('#toast'), resetOverlay: $('#resetOverlay'),
    hudMode: $('#hudMode'), hudModeRu: $('#hudModeRu'), hudCounter: $('#hudCounter'), pips: $$('#pips i'),
    sampleId: $('#sampleId'), scannerState: $('#scannerState'), clock: $('#clock'),
    btnSound: $('#btnSound'), btnGuide: $('#btnGuide'), btnClose: $('#btnClose'),
    btnNew: $('#btnNew'), btnCloseFile: $('#btnCloseFile'), btnReopen: $('#btnReopen'), closed: $('#closed'),
    mParticles: $('#mParticles'), mMag: $('#mMag'), mStrands: $('#mStrands'), mIntegrity: $('#mIntegrity'), mResidue: $('#mResidue'), mTox: $('#mTox'),
    pgPct: $('#pgPct'), pgBar: $('#pgBar'), pgStep: $('#pgStep'), log: $('#log'), tip: $('#tip'),
    guide: $('#guide'), gDoc: $('#gDoc'), gToc: $('#gToc'), gBack: $('#gBack'),
    boot: $('#boot'), bootLog: $('#bootLog'), bootAuth: $('#bootAuth'), authPad: $('#authPad'), authRing: $('#authRing'), authFp: $('#authPad .ba-fp'),
    authHint: $('#authHint'), bootGranted: $('#bootGranted'),
    dos: {
      view: $('#viewDossier'), file: $('#dosFile'), date: $('#dosDate'), name: $('#dosName'), id: $('#dosId'), ru: $('#dosRuName'),
      fields: $('#dosFields'), badge: $('#dosMatchBadge'), stamp: $('#stamp'), tox: $('#toxBox'), toxList: $('#toxList'),
      extra: $('#dosExtra'), actions: $('.dos-actions')
    }
  };

  const embedded = typeof window.GetParentResourceName === 'function' || window.self !== window.top;
  if (embedded) { document.body.classList.add('embedded'); document.documentElement.classList.add('embedded'); }

  /* ============================================================
     ÉTAT
     ============================================================ */
  let st = null;
  let visible = true;
  let bootActive = true;
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const ptr = { x: 0, y: 0, in: false };
  const geo = { sl: 0, st: 0, W: 0, cx: 0, cy: 0, R: 0, rem: 16 };
  const snd = { suck: null, motor: null, lastType: 0, lastHover: 0, lastTick: 0 };

  function deathDateFrom(d) {
    const y = d.getFullYear() - D.DEATH_YEARS_AGO, m = d.getMonth(), day = d.getDate();
    const t = new Date(y, m, day);
    return t.getMonth() !== m ? new Date(y, m + 1, 0) : t;      // 29 février → 28 février
  }
  const fmtDate = (d) => `${d.getDate() === 1 ? '1er' : d.getDate()} ${D.MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const fmtDateRu = (d) => `${d.getDate()} ${D.MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
  const ruYears = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'год' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет');
  const fmtPct = (v) => v.toFixed(1).replace('.', ',') + NBSP + '%';

  function eligibleProfiles(now) {
    const death = deathDateFrom(now);
    return D.PROFILES.filter((p) => (death - new Date(p.birth[0], p.birth[1] - 1, p.birth[2])) / (365.25 * 864e5) >= D.MIN_AGE_AT_DEATH);
  }

  function freshState() {
    const pool = eligibleProfiles(new Date());
    const fixed = D.PROFILE_MODE === 'fixed' && D.PROFILES.find((x) => x.id === D.FIXED_PROFILE_ID);
    const profile = fixed || pick(pool.length ? pool : D.PROFILES);
    // 5 brins pour 3 symboles : la base complémentaire devient décisive
    const syms = shuffle(Object.keys(D.SYMBOLS)).slice(0, 3);
    const bases = ['A', 'T', 'C', 'G'];
    const ends = shuffle([syms[0], syms[0], syms[1], syms[1], syms[2]]).map((sym, i) => ({ id: 'e' + i, n: i + 1, sym, base: pick(bases), toxic: false }));
    syms.forEach((s) => {
      const g = ends.filter((e) => e.sym === s);
      if (g.length > 1 && g[0].base === g[1].base) g[1].base = pick(bases.filter((b) => b !== g[0].base));
    });
    shuffle(ends.map((_, i) => i)).slice(0, 3).forEach((i) => { ends[i].toxic = true; });
    const needed = ends.map((e) => ({ sym: e.sym, base: D.COMPLEMENT[e.base], pair: e.id }));
    const decoys = [];                                          // 2 ancrages leurres
    for (let g = 0; decoys.length < 2 && g < 200; g++) {
      const sym = pick(syms), base = pick(bases);
      if (!needed.concat(decoys).some((n) => n.sym === sym && n.base === base)) decoys.push({ sym, base, pair: null });
    }
    const socks = shuffle(needed.concat(decoys)).map((s, i) => ({ id: 's' + i, n: i + 1, sym: s.sym, base: s.base, pair: s.pair }));
    return {
      step: 1, tool: 'extractor',
      particles: [], extracted: 0,
      z: 0, zT: 0, focus: 0.5, fT: 0.5, sharp: 1, ph1: rand(0, 6.28), ph2: rand(0, 6.28), revealed: false,
      ends, socks, links: {}, fixed: 0, warned: false, drag: null,
      seq: { running: false, p: 0, dur: 0, t0: 0, msg: -1, finishing: false },
      complete: false, toxShown: false,
      profile, analysisDate: null,
      sampleId: `GX-${randInt(1000, 9999)}-${pick(['ЛК', 'ВР', 'ДН', 'ЖС', 'ТМ', 'КР'])}`,
      logs: [], pgShown: 0
    };
  }

  /* ---------- sauvegarde locale : progression et réussite conservées ---------- */
  let saveTimer = 0;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
  function saveNow() {
    if (!st) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        v: 3, step: st.step, extracted: st.extracted, z: st.z, zT: st.zT, revealed: st.revealed,
        ends: st.ends, socks: st.socks, links: st.links, fixed: st.fixed, warned: st.warned,
        complete: st.complete, toxShown: st.toxShown, profileId: st.profile.id,
        analysisDate: st.analysisDate ? st.analysisDate.toISOString() : null,
        sampleId: st.sampleId, logs: st.logs.slice(-60)
      }));
    } catch (e) { /* stockage indisponible : on continue sans */ }
  }
  function loadSaved() {
    try { const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); return d && d.v === 3 ? d : null; } catch (e) { return null; }
  }
  function clearSaved() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignoré */ } }
  function applySaved(d) {
    Object.assign(st, {
      step: d.step, extracted: d.extracted, z: d.z, zT: d.zT, revealed: d.revealed,
      ends: d.ends, socks: d.socks, links: d.links || {}, fixed: d.fixed, warned: d.warned,
      complete: d.complete, toxShown: d.toxShown, sampleId: d.sampleId, logs: d.logs || []
    });
    const p = D.PROFILES.find((x) => x.id === d.profileId); if (p) st.profile = p;
    st.analysisDate = d.analysisDate ? new Date(d.analysisDate) : null;
    if (st.step === 1 && st.extracted >= TOTAL_PARTICLES) st.step = 2;
    if (st.step === 2 && st.revealed) st.step = 3;
    if (st.step === 3) st.warned = true;
    st.tool = st.complete ? null : st.step === 1 ? 'extractor' : st.step === 2 ? 'microscope' : st.step === 3 ? 'splice' : null;
  }

  /* ============================================================
     JOURNAL / TOAST / SONS / EFFETS D'ÉCRAN
     ============================================================ */
  function renderLog(e) {
    const ln = document.createElement('div');
    ln.className = 'ln ' + (e.cls || '');
    ln.innerHTML = `<time>${e.t}</time><span>${e.html}${e.ru ? `<span class="ru">${e.ru}</span>` : ''}</span>`;
    el.log.appendChild(ln);
    while (el.log.children.length > 90) el.log.firstChild.remove();
    el.log.scrollTop = el.log.scrollHeight;
  }
  function log(html, cls = '', ru = '') {
    const e = { t: hhmmss(), cls, html, ru };
    st.logs.push(e); if (st.logs.length > 80) st.logs.shift();
    renderLog(e); saveSoon();
  }

  let toastTimer = 0;
  function toast(msg, bad = false) {
    el.toast.textContent = msg;
    el.toast.classList.toggle('bad', bad);
    el.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('on'), 2000);
  }

  const sfx = (name, ...a) => { if (S && S[name]) S[name](...a); };
  function typeSnd() { const n = performance.now(); if (n - snd.lastType > 30) { snd.lastType = n; sfx('type'); } }
  function tickSnd() { const n = performance.now(); if (n - snd.lastTick > 35) { snd.lastTick = n; sfx('tick'); } }
  function stopLoops() {
    if (snd.suck) { snd.suck.stop(); snd.suck = null; }
    if (snd.motor) { snd.motor.stop(); snd.motor = null; }
  }

  function restartClass(node, cls, ms) {
    node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
    if (ms) setTimeout(() => node.classList.remove(cls), ms);
  }
  const shake = () => restartClass(el.app, 'shake', 420);
  function glitch() { restartClass(el.app, 'glitching', 360); sfx('glitch'); }

  /* ---------- grain de pellicule (généré une fois) ---------- */
  (function makeGrain() {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const g = c.getContext('2d'), img = g.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = Math.random() * 110 | 0; }
      g.putImageData(img, 0, 0);
      document.documentElement.style.setProperty('--grain', `url(${c.toDataURL()})`);
    } catch (e) { /* sans grain */ }
  })();

  /* ============================================================
     GÉOMÉTRIE (mise en cache : aucune mesure DOM à chaque image)
     ============================================================ */
  function measure() {
    const sr = el.stage.getBoundingClientRect(), ir = el.scopeInner.getBoundingClientRect();
    geo.sl = sr.left; geo.st = sr.top;
    geo.W = ir.width; geo.R = ir.width / 2;
    geo.cx = ir.left - sr.left + ir.width / 2; geo.cy = ir.top - sr.top + ir.height / 2;
    geo.rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    [el.focusScope, el.seqCanvas, el.baseCanvas].forEach((c) => { c._w = c.clientWidth; c._h = c.clientHeight; });
    geo.curW = el.toolCursor.offsetWidth; geo.curH = el.toolCursor.firstElementChild.offsetHeight || geo.curW * 1.2;
  }
  function onResize() {
    const r = el.stage.getBoundingClientRect();
    document.documentElement.style.setProperty('--S', Math.max(Math.min(r.height * 0.97, r.width * 0.64), 120) + 'px');
    measure();
    layoutWires();
    if (st && st.step === 1) extractionTick(0, performance.now(), true);
  }

  /* ============================================================
     VUES ET RENDU GLOBAL
     ============================================================ */
  function currentView() {
    if (st.complete) return 'dossier';
    if (st.seq.running) return 'seq';
    if (st.step >= 4) return 'repair';
    if (st.step === 3 && st.tool === 'splice') return 'repair';
    return 'scope';
  }
  function scannerLabel() {
    if (st.complete) return ['PROFIL IDENTIFIÉ', 'ok', 'ПРОФИЛЬ'];
    if (st.seq.running) return ['SÉQUENÇAGE', 'on', 'АНАЛИЗ'];
    if (st.step === 1) return ['EXTRACTION', 'on', 'ИЗВЛЕЧЕНИЕ'];
    if (st.step === 2) return ['OBSERVATION', 'on', 'НАБЛЮДЕНИЕ'];
    if (st.step === 3) return st.tool === 'splice' ? ['RECONNEXION', 'on', 'СРАЩИВАНИЕ'] : ['RUPTURES', 'on', 'РАЗРЫВЫ'];
    return ['PRÊT', 'ok', 'ГОТОВ'];
  }

  function ui() {
    const view = currentView();
    Object.entries(el.views).forEach(([k, v]) => v.classList.toggle('on', k === view));
    el.scope.classList.toggle('mic', st.step >= 2 && view === 'scope');

    el.pips.forEach((p, i) => {
      p.classList.toggle('done', i + 1 < st.step || st.complete);
      p.classList.toggle('cur', i + 1 === st.step && !st.complete);
    });
    const mode = view === 'scope' ? (st.step >= 2 ? MODES.scope2 : MODES.scope1) : MODES[view];
    el.hudMode.textContent = mode[0]; el.hudModeRu.textContent = mode[1];
    updateHudCounter();

    const [sl, sc, slr] = scannerLabel();
    el.scannerState.className = 'state ' + sc;
    $('em', el.scannerState).innerHTML = `${sl}<small>${slr}</small>`;

    if (!(view === 'scope' && st.step === 1)) { el.toolCursor.classList.remove('on'); el.scope.classList.remove('use-cursor'); }
    el.reservoir.classList.toggle('dim', st.step === 2 && view === 'scope');
    el.reservoir.classList.toggle('gone', st.step >= 3 || view !== 'scope');
    el.micPanel.classList.toggle('show', view === 'scope' && (st.step === 2 || st.step === 3));
    el.micPanel.classList.toggle('locked', st.step !== 2);
    el.magReq.textContent = st.revealed ? `×${REQ_MAG} ✓` : `CIBLE ×${REQ_MAG}`;
    el.magReq.classList.toggle('ok', st.revealed);
    renderKnob(el.knobZoom, st.zT); renderKnob(el.knobFocus, st.focus);

    const canSeq = st.step === 4 && !st.seq.running && !st.complete;
    el.btnSequence.disabled = !canSeq;
    el.launch.classList.toggle('show', canSeq);
    el.boardDone.classList.toggle('on', st.fixed >= TOTAL_STRANDS);

    setMetric(el.mParticles, `${st.extracted}<small>/${TOTAL_PARTICLES}</small>`, st.extracted / TOTAL_PARTICLES);
    setMetric(el.mStrands, `${st.fixed}<small>/${TOTAL_STRANDS}</small>`, st.fixed / TOTAL_STRANDS);
    const integ = st.revealed ? clamp(58 + st.fixed * 8, 0, 98) : null;
    setMetric(el.mIntegrity, integ === null ? '—' : `${integ}<small>%</small>`, integ === null ? 0 : integ / 100);
    const res = $('b', el.mResidue);
    el.mResidue.classList.toggle('alert', st.revealed && !st.complete);
    el.mResidue.classList.toggle('hot', st.complete);
    res.innerHTML = st.complete ? 'DÉTECTÉS<small>ОБНАРУЖЕНЫ · 3 ОЧАГА</small>' : st.revealed ? 'SUSPECTS<small>ТРЕБУЕТСЯ АНАЛИЗ</small>' : 'NON ÉVALUÉS<small>НЕ ОЦЕНЕНЫ</small>';
    el.mTox.classList.toggle('locked', !st.toxShown);
    el.mTox.classList.toggle('hot', st.toxShown);
    $('b', el.mTox).innerHTML = `<img src="assets/img/biohazard.png" alt="">${st.toxShown ? 'AGENT TOXIQUE<small>ТОКСИЧНЫЙ АГЕНТ · ПОДТВЕРДИТЬ</small>' : 'VERROUILLÉE<small>ЗАБЛОКИРОВАНО</small>'}`;
    el.pgStep.textContent = st.complete ? 'TERMINÉ · ЗАВЕРШЕНО' : `ÉTAPE ${st.step}/5 · ЭТАП`;
    saveSoon();
  }

  function setMetric(m, html, ratio) {
    const b = $('b', m);
    if (b.innerHTML !== html) { b.innerHTML = html; restartClass(m, 'bump'); }
    const u = $('u', m); if (u) u.style.width = (clamp(ratio, 0, 1) * 100) + '%';
  }

  function updateHudCounter() {
    const view = currentView();
    let html;
    if (view === 'scope' && st.step === 1) html = `PARTICULES<b>${st.extracted}/${TOTAL_PARTICLES}</b>`;
    else if (view === 'scope') html = `GROSSISSEMENT<b>×${magFromZ(st.z)}</b>`;
    else if (view === 'repair') html = `BRINS<b>${st.fixed}/${TOTAL_STRANDS}</b>`;
    else if (view === 'seq') html = `SÉQUENÇAGE<b>${Math.floor(st.seq.p)}%</b>`;
    else html = `CORRESPONDANCE<b>${fmtPct(st.profile.match)}</b>`;
    if (el.hudCounter.innerHTML !== html) {
      const same = el.hudCounter.dataset.k === view + st.step;
      el.hudCounter.innerHTML = html; el.hudCounter.dataset.k = view + st.step;
      if (same && (view === 'repair' || (view === 'scope' && st.step === 1))) restartClass(el.hudCounter, 'bump');
    }
  }

  /* ============================================================
     DÉMARRAGE ET AUTHENTIFICATION BIOMÉTRIQUE
     ============================================================ */
  const auth = { p: 0, holding: false, done: false, shown: false, scan: null, tries: 0 };
  let bootTimers = [];
  const bootLater = (fn, ms) => { const t = setTimeout(fn, ms); bootTimers.push(t); return t; };

  function runBoot(full) {
    bootActive = true; stopLoops();
    bootTimers.forEach(clearTimeout); bootTimers = [];
    Object.assign(auth, { p: 0, holding: false, done: false, shown: false, tries: 0 });
    el.app.classList.add('booting'); el.app.classList.remove('powering');
    el.boot.classList.remove('out', 'gone');
    el.bootAuth.classList.remove('on'); el.bootGranted.classList.remove('on'); el.authHint.classList.remove('on');
    el.authPad.classList.remove('scanning', 'done', 'denied');
    setAuth(0);
    el.bootLog.innerHTML = '';
    if (!full) { bootLater(showAuth, 150); return; }
    let li = 0;
    const next = () => {
      if (li >= BOOT_LINES.length) { bootLater(showAuth, 260); return; }
      const [txt, tag] = BOOT_LINES[li++];
      const row = document.createElement('div'); row.className = 'cur'; el.bootLog.appendChild(row);
      let k = 0;
      const step = () => {
        k += 3; row.textContent = txt.slice(0, k);
        if (k < txt.length) { bootLater(step, 14); return; }
        row.classList.remove('cur');
        if (tag) { const s = document.createElement('span'); s.className = 'ok'; s.textContent = `  [ ${tag} ]`; row.appendChild(s); }
        bootLater(next, 110);
      };
      step();
    };
    bootLater(next, 350);
  }
  function showAuth() {
    if (auth.shown) return;
    auth.shown = true;
    el.bootAuth.classList.add('on');
  }
  function setAuth(p) {
    el.authRing.style.strokeDashoffset = (100 - p * 100).toFixed(1);
    el.authFp.style.filter = `grayscale(${(0.9 - p * 0.9).toFixed(2)}) brightness(${(0.45 + p * 0.85).toFixed(2)}) drop-shadow(0 0 ${(p * 1.2).toFixed(2)}rem rgba(255,138,31,${(p * 0.8).toFixed(2)}))`;
  }
  function authPress() {
    if (!auth.shown) { bootTimers.forEach(clearTimeout); bootTimers = []; showAuth(); return; }
    if (auth.done || auth.holding) return;
    if (S) { S.init(); }
    auth.holding = true;
    el.authPad.classList.remove('denied'); el.authPad.classList.add('scanning');
    if (S) auth.scan = S.scanner();
  }
  function authRelease() {
    if (!auth.holding || auth.done) return;
    auth.holding = false;
    el.authPad.classList.remove('scanning');
    if (auth.scan) { auth.scan.stop(); auth.scan = null; }
    if (auth.p < 1) {
      auth.tries++;
      sfx('denied');
      restartClass(el.authPad, 'denied', 600);
      el.authHint.classList.remove('on'); void el.authHint.offsetWidth; el.authHint.classList.add('on');
    }
  }
  function authTick(dt) {
    if (auth.done || !auth.shown) return;
    auth.p = clamp(auth.p + (auth.holding ? dt / AUTH_TIME : -dt * 1.6), 0, 1);
    setAuth(auth.p);
    if (auth.scan) auth.scan.set(auth.p);
    if (auth.p >= 1) authGranted();
  }
  function authGranted() {
    auth.done = true; auth.holding = false;
    if (auth.scan) { auth.scan.stop(); auth.scan = null; }
    el.authPad.classList.remove('scanning'); el.authPad.classList.add('done');
    el.authHint.classList.remove('on');
    sfx('granted');
    el.bootGranted.classList.add('on');
    bootLater(() => {
      el.boot.classList.add('out');
      el.app.classList.remove('booting'); el.app.classList.add('powering');
      sfx('powerOn'); if (S) S.ambient();
      bootActive = false;
      onResize(); ui();
      if (!st.logs.length) bootLog(); else if (!st.restoredLogged) { st.restoredLogged = true; log('Session restaurée.', 'ok', 'Сеанс восстановлен'); }
    }, 950);
    bootLater(() => { el.boot.classList.add('gone'); el.app.classList.remove('powering'); measure(); }, 2600);
  }
  function bootLog() {
    log('Opérateur authentifié — session ouverte.', 'ok', 'Оператор подтверждён');
    log(`Échantillon <b>${st.sampleId}</b> chargé.`, '', 'Образец загружен');
  }

  /* ============================================================
     ÉTAPE 1 — EXTRACTION (particules fuyantes, faisceau d'aspiration)
     ============================================================ */
  function spawnParticles() {
    el.particles.innerHTML = '';
    st.particles = [];
    for (let i = st.extracted; i < TOTAL_PARTICLES; i++) {
      const ang = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 0.27;
      const node = document.createElement('div');
      node.className = 'particle';
      node.innerHTML = `<img src="assets/img/orb-${(i % 7) + 1}.webp" alt="" draggable="false">`;
      el.particles.appendChild(node);
      const sp = rand(0.05, 0.085), dir = rand(0, Math.PI * 2);
      st.particles.push({ i, node, collected: false, x: Math.cos(ang) * r, y: Math.sin(ang) * r,
        vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp, base: sp, charge: 0, w: 0,
        size: rand(0.105, 0.135), ph: rand(0, 6.28), near: false });
    }
  }
  function syncReservoir() {
    el.rCount.textContent = st.extracted;
    $$('i', el.rGauge).forEach((g, i) => g.classList.toggle('on', i < st.extracted));
    el.rTube.style.setProperty('--fill', (st.extracted / TOTAL_PARTICLES).toFixed(3));
  }

  function extractionTick(dt, now, renderOnly) {
    const W = geo.W; if (!W) return;
    const active = !renderOnly && st.step === 1 && st.tool === 'extractor' && ptr.in && !bootActive && !guideOpen();
    let inside = false, flee = null;
    if (active) {
      const dx = ptr.x - geo.cx, dy = ptr.y - geo.cy, d = Math.hypot(dx, dy);
      inside = d <= geo.R;
      if (d <= geo.R * 1.15) flee = { x: dx / W, y: dy / W };
    }
    let best = null;
    for (const p of st.particles) {
      if (p.collected) continue;
      if (!renderOnly) {
        const turn = (Math.random() - 0.5) * 3.4 * dt, c = Math.cos(turn), s = Math.sin(turn);
        let vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c;
        if (flee) {                                    // la particule s'écarte de la pipette
          const fx = p.x - flee.x, fy = p.y - flee.y, fd = Math.hypot(fx, fy), R = 0.13;
          if (fd < R && fd > 0.0001) { const k = (1 - fd / R) * 1.2; vx += (fx / fd) * k * dt; vy += (fy / fd) * k * dt; }
        }
        const sp = Math.hypot(vx, vy) || 0.0001, cur = clamp(sp, 0, 0.24);
        const ns = cur + (p.base - cur) * Math.min(1, dt * 1.4);
        p.vx = (vx / sp) * ns; p.vy = (vy / sp) * ns;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const lim = 0.37 - p.size / 2, d = Math.hypot(p.x, p.y);
        if (d > lim) {
          const nx = p.x / d, ny = p.y / d, dot = p.vx * nx + p.vy * ny;
          p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny; p.x = nx * lim; p.y = ny * lim;
        }
      }
      const w = p.size * W;
      const cx = geo.cx + p.x * W, cy = geo.cy + p.y * W;
      if (!renderOnly) {
        let locked = false;
        if (inside) locked = Math.hypot(ptr.x - cx, ptr.y - cy) < w * 0.42 + 0.35 * geo.rem;
        p.charge = clamp(p.charge + (locked ? dt / HOLD_TIME : -dt / HOLD_DECAY), 0, 1);
        const near = p.charge > 0.01;
        if (near !== p.near) { p.near = near; p.node.classList.toggle('near', near); }
        if (near) p.node.style.setProperty('--c', p.charge.toFixed(3));
        if (p.charge > 0.01 && (!best || p.charge > best.charge)) best = p;
      }
      if (p.w !== w) { p.w = w; p.node.style.width = p.node.style.height = w + 'px'; }
      const j = p.charge * 2.4, sc = (1 + 0.05 * Math.sin(now * 0.002 + p.ph)) * (1 - 0.22 * p.charge);
      p.node.style.transform = `translate(${((0.5 + p.x) * W - w / 2 + (Math.random() - 0.5) * j).toFixed(1)}px,${((0.5 + p.y) * W - w / 2 + (Math.random() - 0.5) * j).toFixed(1)}px) scale(${sc.toFixed(3)})`;
      if (!renderOnly && p.charge >= 1) collectParticle(p, cx, cy, w);
    }
    if (renderOnly) return;
    // faisceau d'aspiration entre la pointe et la particule visée
    if (best && !best.collected) {
      const bx = geo.cx + best.x * W, by = geo.cy + best.y * W;
      const mx = (ptr.x + bx) / 2, my = (ptr.y + by) / 2;
      const nx = -(by - ptr.y), ny = bx - ptr.x, nl = Math.hypot(nx, ny) || 1, wob = Math.sin(now * 0.025) * 7 * best.charge;
      const d = `M${ptr.x.toFixed(1)} ${ptr.y.toFixed(1)} Q${(mx + nx / nl * wob).toFixed(1)} ${(my + ny / nl * wob).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
      el.tractor.setAttribute('d', d); el.tractorCore.setAttribute('d', d);
      const o = (0.25 + best.charge * 0.75).toFixed(2);
      el.tractor.style.opacity = o; el.tractorCore.style.opacity = o;
      el.toolCursor.classList.add('suck');
      if (!snd.suck && S) snd.suck = S.suction();
      if (snd.suck) snd.suck.set(best.charge);
    } else {
      el.tractor.style.opacity = 0; el.tractorCore.style.opacity = 0;
      el.toolCursor.classList.remove('suck');
      if (snd.suck) { snd.suck.stop(); snd.suck = null; }
    }
  }

  function collectParticle(p, px, py, w) {
    if (p.collected) return;                       // une particule ne se récolte qu'une fois
    p.collected = true;
    const src = $('img', p.node).src;
    p.node.remove();
    sfx('capture');
    const sr = el.stage.getBoundingClientRect(), tr = el.rTube.getBoundingClientRect();
    const tx = tr.left - sr.left + tr.width / 2, ty = tr.top - sr.top + tr.height * 0.12;
    el.beam.setAttribute('d', `M${px} ${py} Q ${(px + tx) / 2} ${Math.min(py, ty) - 50} ${tx} ${ty}`);
    restartClass(el.beam, 'go');
    const fx = document.createElement('div');
    fx.className = 'fxp'; fx.style.width = fx.style.height = w + 'px';
    fx.innerHTML = `<img src="${src}" alt="">`;
    el.fx.appendChild(fx);
    const sx = px - w / 2, sy = py - w / 2, ex = tx - w / 2, ey = ty - w / 2;
    const mx = (sx + ex) / 2 + (ex > sx ? -1 : 1) * 70, my = Math.min(sy, ey) - 70;
    const anim = fx.animate([
      { transform: `translate(${sx}px,${sy}px) scale(.8)`, opacity: 1 },
      { transform: `translate(${mx}px,${my}px) scale(.6)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${ex}px,${ey}px) scale(.12)`, opacity: .8 }
    ], { duration: 760 + rand(0, 140), easing: 'cubic-bezier(.45,.05,.7,.6)', fill: 'forwards' });
    let arrived = false;
    const arrive = () => {
      if (arrived) return; arrived = true;
      fx.remove();
      if (!st || st.step !== 1) return;
      st.extracted++;
      syncReservoir();
      restartClass(el.reservoir, 'pulse', 520);
      sfx('drop');
      log(`Particule <b>${st.extracted}/${TOTAL_PARTICLES}</b> verrouillée.`, '', `Частица ${st.extracted} из ${TOTAL_PARTICLES}`);
      if (st.extracted === TOTAL_PARTICLES) {
        log('Échantillon complet.', 'ok', 'Образец собран');
        later(() => sfx('success'), 200);
        later(enterObservation, 1300);
      }
      ui();
    };
    anim.onfinish = arrive;
    setTimeout(arrive, 1100);                      // filet de sécurité (onglet en arrière-plan)
  }

  /* ============================================================
     ÉTAPE 2 — MICROSCOPE (molettes, mise au point qui dérive)
     ============================================================ */
  function enterObservation() {
    if (!st || st.step !== 1) return;
    st.step = 2; st.tool = 'microscope';
    if (snd.suck) { snd.suck.stop(); snd.suck = null; }
    el.tractor.style.opacity = 0; el.tractorCore.style.opacity = 0;
    restartClass(el.iris, 'on', 850); sfx('shutter');
    log('Microscope engagé.', 'ok', 'Микроскоп подключён');
    ui();
  }
  const micActive = () => st.step === 2 && st.tool === 'microscope' && !bootActive && !guideOpen();

  function buildKnob(k) {
    const svg = $('.k-ticks', k); let h = '';
    const N = 28;
    for (let i = 0; i <= N; i++) {
      const a = (-135 + i * 270 / N - 90) * Math.PI / 180, r1 = i % 7 === 0 ? 39 : 43;
      h += `<line x1="${(50 + Math.cos(a) * r1).toFixed(2)}" y1="${(50 + Math.sin(a) * r1).toFixed(2)}" x2="${(50 + Math.cos(a) * 48).toFixed(2)}" y2="${(50 + Math.sin(a) * 48).toFixed(2)}"/>`;
    }
    svg.innerHTML = h;
    k._lines = $$('line', svg); k._n = -1;
  }
  function renderKnob(k, v) {
    k.style.setProperty('--a', (-135 + v * 270).toFixed(1) + 'deg');
    const n = Math.round(v * (k._lines.length - 1));
    if (k._n !== n) { k._lines.forEach((l, i) => l.classList.toggle('on', i <= n)); k._n = n; }
    k.setAttribute('aria-valuenow', Math.round(v * 100));
  }
  function bindKnob(k, get, set) {
    let drag = null;
    k.addEventListener('pointerdown', (e) => {
      if (!micActive()) return;
      e.preventDefault(); try { k.setPointerCapture(e.pointerId); } catch (x) { /* pointeur synthétique */ }
      drag = { x: e.clientX, y: e.clientY, v: get() };
      k.classList.add('grab'); sfx('click');
    });
    k.addEventListener('pointermove', (e) => {
      if (!drag) return;
      set(drag.v + ((drag.y - e.clientY) + (e.clientX - drag.x)) / (8 * geo.rem));
    });
    const end = () => { if (drag) { drag = null; k.classList.remove('grab'); } };
    k.addEventListener('pointerup', end); k.addEventListener('pointercancel', end); k.addEventListener('lostpointercapture', end);
    k.addEventListener('wheel', (e) => {
      if (!micActive()) return;
      e.preventDefault(); e.stopPropagation();
      set(get() - Math.sign(e.deltaY) * 0.05);
    }, { passive: false });
    k.addEventListener('keydown', (e) => {
      if (!micActive()) return;
      const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 0.02 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -0.02 : 0;
      if (d) { e.preventDefault(); set(get() + d); }
    });
  }
  function setZoomTarget(v) {
    if (!micActive()) return;
    const nv = clamp(v, 0, 1);
    if (Math.floor(nv * 40) !== Math.floor(st.zT * 40)) tickSnd();
    st.zT = nv; renderKnob(el.knobZoom, nv);
  }
  function setFocus(v) {
    if (!micActive()) return;
    const nv = clamp(v, 0, 1);
    if (Math.floor(nv * 50) !== Math.floor(st.focus * 50)) tickSnd();
    st.focus = nv; renderKnob(el.knobFocus, nv);
  }

  function applyZoom() {
    const z = st.z;
    el.layerDish.style.opacity = (1 - smooth(0.2, 0.46, z)).toFixed(3);
    el.layerDish.style.transform = `scale(${(1 + 9 * z).toFixed(3)})`;
    el.layerCells.style.opacity = (smooth(0.24, 0.44, z) * (1 - smooth(0.6, 0.8, z))).toFixed(3);
    el.layerCells.style.transform = `scale(${lerp(0.55, 1.9, smooth(0.24, 0.8, z)).toFixed(3)})`;
    el.layerHelix.style.opacity = smooth(0.58, 0.8, z).toFixed(3);
    el.layerHelix.style.transform = `scale(${lerp(0.45, 1.08, smooth(0.55, 1, z)).toFixed(3)})`;
    el.particles.style.opacity = (1 - smooth(0.02, 0.12, z)).toFixed(3);
    const mag = magFromZ(z);
    el.magValue.textContent = mag;
    el.scaleTxt.textContent = `${Math.max(1, Math.round(2000 / mag))} µm`;
    $('b', el.mMag).textContent = st.step >= 2 ? '×' + mag : '—';
    const u = $('u', el.mMag); if (u) u.style.width = (st.step >= 2 ? z * 100 : 0) + '%';
    return mag;
  }

  let lastBlur = -1;
  function microscopeTick(dt, now) {
    st.fT = 0.5 + 0.14 * Math.sin(now * 0.00022 + st.ph1) + 0.04 * Math.sin(now * 0.0006 + st.ph2);   // dérive lente et faible
    const sharp = clamp(1 - Math.abs(st.focus - st.fT) / 0.4, 0, 1);                                     // grande tolérance
    st.sharp = sharp;
    const blur = +((1 - Math.pow(sharp, 0.7)) * 5).toFixed(1);
    if (blur !== lastBlur) { lastBlur = blur; el.zoomStack.style.filter = blur > 0.1 ? `blur(${blur}px)` : 'none'; }
    const prev = st.z, dz = st.zT - st.z;
    if (dz > 0) st.z += Math.min(dz, ZOOM_RATE * (0.5 + 0.5 * sharp) * dt);   // le zoom avance toujours, plus vite si l'image est nette
    else if (dz < 0) st.z += Math.max(dz, -0.14 * dt);
    const speed = dt > 0 ? Math.abs(st.z - prev) / dt : 0;
    if (speed > 0.003) { if (!snd.motor && S) snd.motor = S.motor(); if (snd.motor) snd.motor.set(clamp(speed / ZOOM_RATE, 0.15, 1)); }
    else if (snd.motor) { snd.motor.stop(); snd.motor = null; }
    const mag = applyZoom();
    updateHudCounter();
    drawFocusScope(now, sharp);
    if (mag >= REQ_MAG && !st.revealed) reveal();
    if (speed > 0) saveSoon();
  }

  function fitCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv._w || 0, h = cv._h || 0;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv._ctx || (cv._ctx = cv.getContext('2d')); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }
  const PEAKS = [0.14, 0.31, 0.47, 0.62, 0.8, 0.92];
  function drawFocusScope(now, sharp) {
    const { ctx, w, h } = fitCanvas(el.focusScope);
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(150,172,210,.1)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 8; i++) { ctx.moveTo(i * w / 8, 0); ctx.lineTo(i * w / 8, h); }
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    const wd = lerp(0.07, 0.009, sharp), amp = 0.22 + 0.78 * sharp;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const t = i / 120; let v = 0;
      for (const pk of PEAKS) v += Math.exp(-((t - pk) * (t - pk)) / (2 * wd * wd));
      v = v * amp / (1 + (1 - sharp) * 1.4) + (Math.random() - 0.5) * 0.12 * (1 - sharp) + Math.sin(t * 30 + now * 0.006) * 0.05 * (1 - sharp);
      const y = h - 3 - clamp(v, -0.05, 1.05) * (h - 6);
      if (i) ctx.lineTo(t * w, y); else ctx.moveTo(t * w, y);
    }
    const good = sharp > 0.5;
    ctx.strokeStyle = good ? 'rgba(255,138,31,.35)' : 'rgba(150,172,210,.18)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = good ? '#ffb066' : 'rgba(150,172,210,.6)'; ctx.lineWidth = 1.4; ctx.stroke();
  }

  function reveal() {
    if (st.revealed) return;
    st.revealed = true;
    el.layerHelix.classList.add('revealed');
    el.zoomStack.style.filter = 'none'; lastBlur = 0;
    restartClass(el.scope, 'glitch', 800); restartClass(el.glitch, 'on', 800);
    glitch(); sfx('alarm');
    st.step = 3; st.tool = null;
    stopLoops();
    log(`×${REQ_MAG} — double hélice résolue.`, 'ok', 'Двойная спираль');
    later(() => log(`<b>${TOTAL_STRANDS} ruptures</b> détectées.`, 'warn', 'Обнаружены разрывы'), 450);
    later(() => log('Résidus chimiques suspects — analyse requise.', 'warn', 'Химические остатки'), 900);
    later(enterRepair, 3200);
    ui();
  }

  /* ============================================================
     ÉTAPE 3 — RECONNEXION DES BRINS
     ============================================================ */
  function enterRepair() {
    if (!st || st.step !== 3 || st.tool === 'splice') return;
    st.tool = 'splice';
    sfx('whoosh');
    if (!st.warned) {
      st.warned = true;
      const toxic = st.ends.filter((e) => e.toxic).map((e) => pad(e.n)).join(', ');
      log('Reconnexion engagée.', 'ok', 'Сращивание');
      later(() => log(`Segments ${toxic} : traces de substances chimiques dangereuses détectées sur les brins analysés.`, 'warn', 'Опасные химические вещества'), 600);
    }
    ui();
    requestAnimationFrame(() => { measure(); layoutWires(); });
  }

  const symbolSvg = (sym) => `<svg viewBox="0 0 24 24" aria-hidden="true">${D.SYMBOLS[sym]}</svg>`;
  function buildBoard() {
    el.ends.innerHTML = ''; el.wires.innerHTML = '';
    st.ends.forEach((e) => {
      const d = document.createElement('div');
      d.className = 'end' + (st.links[e.id] ? ' linked' : ''); d.dataset.id = e.id;
      d.innerHTML = `<div class="e-meta"><b>BRIN ${pad(e.n)}<em>НИТЬ</em></b>` +
        (e.toxic ? '<span class="hz-row"><img class="hz" src="assets/img/biohazard.png" alt="" data-tip="Résidus chimiques suspects — analyse requise"></span>' : '<span class="hz-row"></span>') +
        `</div><div class="chip">${symbolSvg(e.sym)}<span class="base">${e.base}</span></div><div class="port"></div>`;
      el.ends.appendChild(d);
    });
    renderSockets();
  }
  function renderSockets() {
    el.sockets.innerHTML = '';
    const linked = new Set(Object.values(st.links));
    st.socks.forEach((s) => {
      const d = document.createElement('div');
      d.className = 'sock' + (linked.has(s.id) ? ' linked' : ''); d.dataset.id = s.id;
      d.innerHTML = `<div class="port"></div><div class="chip">${symbolSvg(s.sym)}<span class="base">${s.base}</span></div><div class="e-meta"><b>ANCRAGE ${pad(s.n)}<em>ЯКОРЬ</em></b></div>`;
      el.sockets.appendChild(d);
    });
  }
  function reshuffleSockets() {
    if (!st || st.step !== 3) return;
    const used = new Set(Object.values(st.links));
    const idx = st.socks.map((s, i) => i).filter((i) => !used.has(st.socks[i].id));
    const mixed = shuffle(idx.map((i) => st.socks[i]));
    idx.forEach((i, k) => { st.socks[i] = mixed[k]; });
    restartClass(el.sockets, 'shuffling', 460);
    renderSockets(); layoutWires(); saveSoon();
  }

  const boardPos = (elm) => {
    const r = elm.getBoundingClientRect(), b = el.board.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
  };
  const curve = (a, b) => { const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45); return `M${a.x} ${a.y} C${a.x + dx} ${a.y},${b.x - dx} ${b.y},${b.x} ${b.y}`; };
  function svgEl(tag, attrs) { const n = document.createElementNS(SVG_NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }

  function layoutWires() {
    if (!st) return;
    $$('.wire-link', el.wires).forEach((n) => n.remove());
    for (const eid in st.links) {
      const e = st.ends.find((x) => x.id === eid), s = st.socks.find((x) => x.id === st.links[eid]);
      const pe = $(`.end[data-id="${eid}"] .port`), ps = $(`.sock[data-id="${s.id}"] .port`);
      if (!pe || !ps) continue;
      const a = boardPos(pe), b = boardPos(ps), d = curve(a, b), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const g = svgEl('g', { class: 'wire-link' });
      g.appendChild(svgEl('path', { class: 'wire ok', d }));
      g.appendChild(svgEl('path', { class: 'wire core wire-flow', d }));
      g.appendChild(svgEl('circle', { class: 'rung', cx: mid.x, cy: mid.y, r: 17 }));
      const t = svgEl('text', { x: mid.x, y: mid.y + 4.5 }); t.textContent = `${e.base}–${s.base}`;
      g.appendChild(t);
      el.wires.appendChild(g);
    }
  }

  const dragAllowed = () => st.step === 3 && st.tool === 'splice' && !st.seq.running && !st.complete && !bootActive;
  function onEndDown(ev) {
    const end = ev.target.closest('.end');
    if (!end || end.classList.contains('linked') || !dragAllowed() || st.drag) return;
    ev.preventDefault();
    const live = svgEl('path', { class: 'wire live' }), orb = svgEl('circle', { class: 'orb', r: 6 });
    el.wires.appendChild(live); el.wires.appendChild(orb);
    end.classList.add('dragging');
    st.drag = { id: end.dataset.id, end, live, orb, target: null };
    sfx('click');
    moveDrag(ev);
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }
  function socketAt(ev) {
    const rem = geo.rem;
    let best = null, bd = 1e9;
    for (const s of $$('.sock:not(.linked)', el.sockets)) {
      const r = s.getBoundingClientRect();
      if (ev.clientX < r.left - rem * 1.2 || ev.clientX > r.right + rem || ev.clientY < r.top - rem * 0.5 || ev.clientY > r.bottom + rem * 0.5) continue;
      const d = Math.abs(ev.clientY - (r.top + r.height / 2));
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function moveDrag(ev) {
    const d = st.drag; if (!d) return;
    const b = el.board.getBoundingClientRect(), p = { x: ev.clientX - b.left, y: ev.clientY - b.top };
    d.live.setAttribute('d', curve(boardPos($('.port', d.end)), p));
    d.orb.setAttribute('cx', p.x); d.orb.setAttribute('cy', p.y);
    const t = socketAt(ev);
    if (t !== d.target) { if (d.target) d.target.classList.remove('target'); if (t) { t.classList.add('target'); sfx('hover'); } d.target = t; }
  }
  function endDrag(ev) {
    const d = st.drag; if (!d) return;
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    st.drag = null;
    d.end.classList.remove('dragging');
    if (d.target) d.target.classList.remove('target');
    const target = ev && ev.type !== 'pointercancel' ? socketAt(ev) : null;
    if (!target) { retract(d, false); return; }
    const end = st.ends.find((e) => e.id === d.id), sock = st.socks.find((s) => s.id === target.dataset.id);
    const okSym = end.sym === sock.sym, okBase = D.COMPLEMENT[end.base] === sock.base;
    if (okSym && okBase) success(d, end, sock, target); else fail(d, end, sock, target, okSym, okBase);
  }
  function retract(d, bad) {
    d.live.classList.toggle('bad', !!bad);
    const a = boardPos($('.port', d.end)), p0 = { x: +d.orb.getAttribute('cx'), y: +d.orb.getAttribute('cy') };
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / 320, 0, 1), k = 1 - Math.pow(1 - t, 3), p = { x: lerp(p0.x, a.x, k), y: lerp(p0.y, a.y, k) };
      d.live.setAttribute('d', curve(a, p)); d.orb.setAttribute('cx', p.x); d.orb.setAttribute('cy', p.y);
      if (t < 1) requestAnimationFrame(step); else { d.live.remove(); d.orb.remove(); }
    };
    requestAnimationFrame(step);
    setTimeout(() => { d.live.remove(); d.orb.remove(); }, 600);
  }
  function fail(d, end, sock, targetEl, okSym, okBase) {
    const reason = !okSym && !okBase ? 'symbole et base incompatibles' : !okSym ? 'symbole différent' : 'base non complémentaire';
    const endEl = $(`.end[data-id="${d.id}"]`);
    [endEl, targetEl].forEach((n) => restartClass(n, 'err', 650));
    retract(d, true);
    sfx('error'); shake();
    toast('CONNEXION REFUSÉE · ОТКЛОНЕНО', true);
    log(`Connexion refusée — ${reason}.`, 'err', 'Отклонено');
    later(() => { glitch(); log('Ancrages réorganisés.', 'err', 'Якоря перестроены'); reshuffleSockets(); }, 520);
  }
  function success(d, end, sock, targetEl) {
    st.links[end.id] = sock.id;
    st.fixed++;
    const endEl = $(`.end[data-id="${end.id}"]`);
    d.live.remove(); d.orb.remove();
    [endEl, targetEl].forEach((n) => n.classList.add('linked', 'pop'));
    later(() => { endEl.classList.remove('pop'); targetEl.classList.remove('pop'); }, 700);
    layoutWires();
    sfx('lock');
    const bp = boardPos($('.port', targetEl));
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('i'); s.className = 'spark';
      s.style.left = bp.x + 'px'; s.style.top = bp.y + 'px';
      el.board.appendChild(s);
      const ang = rand(0, Math.PI * 2), dist = rand(20, 70);
      const a = s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(0)`, opacity: 0 }], { duration: rand(450, 800), easing: 'ease-out' });
      a.onfinish = () => s.remove(); setTimeout(() => s.remove(), 900);
    }
    log(`Brin <b>${pad(end.n)}</b> reconnecté (${end.base}–${sock.base})` + (end.toxic ? ' — résidu isolé.' : '.'), end.toxic ? 'warn' : 'ok', end.toxic ? 'Остаток изолирован' : `Нить ${end.n}`);
    if (st.fixed >= TOTAL_STRANDS) {
      st.step = 4; st.tool = null;
      later(() => sfx('success'), 250);
      log('Intégrité restaurée — <b>5/5</b>.', 'ok', 'Целостность восстановлена');
    }
    ui();
  }

  /* ============================================================
     ÉTAPE 4 — SÉQUENÇAGE : hélice, flux de bases, recherche en base
     ============================================================ */
  const seqFx = { cand: 0, chat: 0, cols: null, colW: 0, matchY: -1, matchT: 0 };
  function startSequence() {
    if (st.step !== 4 || st.seq.running || st.complete) return;
    st.seq = { running: true, p: 0, dur: rand(5000, 10000), t0: performance.now(), msg: -1, finishing: false };
    el.seqList.innerHTML = D.SEQ_STEPS.map((s, i) => `<li data-i="${i}">${s[1]}</li>`).join('');
    el.cand.classList.remove('locked');
    el.candId.textContent = '#————'; el.candPct.textContent = '00,0' + NBSP + '%'; el.candBar.style.width = '0%';
    seqFx.cand = 0.3; seqFx.chat = 0; seqFx.cols = null;
    const bc = el.baseCanvas.getContext('2d'); bc.clearRect(0, 0, el.baseCanvas.width, el.baseCanvas.height);
    sfx('whoosh'); sfx('powerOn');
    log('Séquençage lancé.', 'ok', 'Секвенирование запущено');
    ui();
    el.seqBar.style.width = '0%';
    seqUpdateMsg(0);
  }
  function seqUpdateMsg(p) {
    let idx = 0;
    D.SEQ_STEPS.forEach((s, i) => { if (p >= s[0] && (i < D.SEQ_STEPS.length - 1 || p >= 100)) idx = i; });
    if (idx === st.seq.msg) return;
    st.seq.msg = idx;
    const s = D.SEQ_STEPS[idx], last = idx === D.SEQ_STEPS.length - 1;
    el.seqMsg.textContent = s[1]; el.seqMsgRu.textContent = s[2];
    $$('li', el.seqList).forEach((li, i) => { li.classList.toggle('done', i < idx || (i === idx && last)); li.classList.toggle('cur', i === idx && !last); });
    if (idx > 0) sfx('blip', idx);
    log(s[1] + (last ? '' : '…'), last ? 'ok' : '', s[2]);
  }
  function swapCandidate(p) {
    const fast = p >= 80;
    const others = D.PROFILES.filter((x) => x.id !== st.profile.id);
    const id = Math.random() < 0.35 && others.length ? pick(others).id : randInt(100, 9999);
    const pct = fast ? rand(48, Math.min(96, st.profile.match - 1.5)) : rand(6, 58);
    el.candId.textContent = '#' + pad(id, 4);
    el.candPct.textContent = fmtPct(pct);
    el.candBar.style.width = pct.toFixed(1) + '%';
    el.candImg.style.filter = `grayscale(1) brightness(${rand(0.35, 0.8).toFixed(2)}) contrast(1.3)`;
    el.candImg.style.transform = `scaleX(${Math.random() < 0.5 ? -1 : 1}) translateY(${randInt(0, 8)}%)`;
  }
  function lockCandidate() {
    el.candId.textContent = '#' + pad(st.profile.id, 4);
    el.candPct.textContent = fmtPct(st.profile.match);
    el.candBar.style.width = st.profile.match + '%';
    el.candImg.style.filter = ''; el.candImg.style.transform = '';
    el.cand.classList.add('locked');
    sfx('match');
  }
  function seqTick(now, dt) {
    const q = st.seq;
    if (!q.running) return;
    if (!q.finishing) {
      const t = clamp((now - q.t0) / q.dur, 0, 1);
      q.p = t >= 1 ? 100 : 100 * (0.55 * t + 0.45 * smooth(0, 1, t));
      el.seqPct.textContent = Math.floor(q.p);
      el.seqBar.style.width = q.p + '%';
      seqUpdateMsg(q.p);
      updateHudCounter();
      seqFx.cand -= dt;
      if (seqFx.cand <= 0) { seqFx.cand = q.p >= 80 ? 0.06 : rand(0.09, 0.17); swapCandidate(q.p); }
      seqFx.chat -= dt;
      if (seqFx.chat <= 0) { seqFx.chat = rand(0.05, 0.12); sfx('chatter'); }
      if (t >= 1) {
        q.finishing = true;
        lockCandidate();
        later(finishSequence, 1600);           // la progression est terminée avant de révéler le dossier
      }
    }
    drawHelix(now);
    drawBases(dt);
  }
  function finishSequence() {
    st.seq.running = false;
    st.complete = true; st.step = 5;
    st.analysisDate = new Date();
    buildDossier();
    sfx('whoosh');
    ui();
    playDossier();
  }

  const glowSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,236,200,1)'); gr.addColorStop(0.25, 'rgba(255,170,70,.85)'); gr.addColorStop(0.6, 'rgba(255,138,31,.25)'); gr.addColorStop(1, 'rgba(255,138,31,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
  })();
  function drawHelix(now) {
    const { ctx, w, h } = fitCanvas(el.seqCanvas);
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const cx = w / 2, top = h * 0.06, bot = h * 0.94, R = Math.min(w * 0.3, h * 0.2), phase = now * 0.0011;
    const prog = clamp(st.seq.p / 100, 0, 1), turns = 2.6 * Math.PI * 2, N = 38;
    for (const sign of [1, -1]) {
      for (let k = 0; k < 140; k++) {
        const t0 = k / 140, t1 = (k + 1) / 140, a0 = phase + t0 * turns, a1 = phase + t1 * turns;
        const z = (sign * Math.sin(a0) + 1) / 2, lit = t0 <= prog;
        ctx.strokeStyle = lit ? `rgba(255,${150 + z * 70 | 0},${50 + z * 60 | 0},${0.35 + z * 0.6})` : `rgba(255,138,31,${0.1 + z * 0.2})`;
        ctx.lineWidth = 1.5 + z * 3;
        ctx.beginPath(); ctx.moveTo(cx + sign * R * Math.cos(a0), lerp(top, bot, t0)); ctx.lineTo(cx + sign * R * Math.cos(a1), lerp(top, bot, t1)); ctx.stroke();
      }
    }
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N, a = phase + t * turns, y = lerp(top, bot, t);
      const x1 = cx + R * Math.cos(a), x2 = cx - R * Math.cos(a), z1 = (Math.sin(a) + 1) / 2, z2 = 1 - z1;
      const lit = t <= prog, near = Math.abs(t - prog) < 0.025 && !st.seq.finishing, al = lit ? 0.75 : 0.16;
      const gr = ctx.createLinearGradient(x1, y, x2, y);
      gr.addColorStop(0, `rgba(255,170,70,${al * (0.4 + z1 * 0.6)})`); gr.addColorStop(0.5, `rgba(255,236,200,${al * 0.5})`); gr.addColorStop(1, `rgba(255,170,70,${al * (0.4 + z2 * 0.6)})`);
      ctx.strokeStyle = gr; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      for (const [x, z] of [[x1, z1], [x2, z2]]) {
        const s = (lit ? 22 : 12) + z * 14 + (near ? 16 : 0);
        ctx.globalAlpha = lit ? 0.95 : 0.32; ctx.drawImage(glowSprite, x - s / 2, y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
    const sy = lerp(top, bot, prog), sg = ctx.createLinearGradient(0, sy - 26, 0, sy + 26);
    sg.addColorStop(0, 'rgba(255,138,31,0)'); sg.addColorStop(0.5, 'rgba(255,200,120,.55)'); sg.addColorStop(1, 'rgba(255,138,31,0)');
    ctx.fillStyle = sg; ctx.fillRect(cx - R * 1.6, sy - 26, R * 3.2, 52);
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawBases(dt) {
    const cv = el.baseCanvas, dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv._w || 0, h = cv._h || 0;
    if (!w) return;
    const ctx = cv._ctx || (cv._ctx = cv.getContext('2d'));
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr) || !seqFx.cols) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      seqFx.colW = Math.max(10, Math.round(geo.rem * 0.82));
      const n = Math.floor(w / seqFx.colW);
      seqFx.cols = Array.from({ length: n }, () => ({ y: rand(-h, 0), v: rand(90, 260), last: -1 }));
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(4,6,10,.11)'; ctx.fillRect(0, 0, w, h);
    const fs = seqFx.colW;
    ctx.font = `600 ${fs}px "JetBrains Mono", monospace`; ctx.textAlign = 'center';
    seqFx.cols.forEach((c, i) => {
      c.y += c.v * dt;
      const row = Math.floor(c.y / fs);
      if (row !== c.last) {
        c.last = row;
        const x = i * fs + fs / 2, y = row * fs;
        ctx.fillStyle = 'rgba(255,138,31,.55)'; ctx.fillText(pick(['A', 'T', 'C', 'G']), x, y);
        ctx.fillStyle = '#ffe2bd'; ctx.fillText(pick(['A', 'T', 'C', 'G']), x, y + fs);
      }
      if (c.y > h + rand(0, h)) { c.y = rand(-h * 0.3, 0); c.last = -1; c.v = rand(90, 260); }
    });
    seqFx.matchT -= dt;
    if (seqFx.matchT <= 0) { seqFx.matchT = rand(0.25, 0.7); seqFx.matchY = rand(fs, h - fs); }
    if (seqFx.matchY > 0) { ctx.fillStyle = 'rgba(255,138,31,.10)'; ctx.fillRect(0, seqFx.matchY, w, fs * 0.9); }
  }

  /* ============================================================
     ÉTAPE 5 — DOSSIER (révélation en plusieurs temps)
     ============================================================ */
  function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function buildDossier() {
    const p = st.profile, now = st.analysisDate;
    const death = deathDateFrom(now), birth = new Date(p.birth[0], p.birth[1] - 1, p.birth[2]);
    const age = Math.floor((death - birth) / (365.25 * 864e5));
    el.dos.file.textContent = `${pad(p.id, 4)}-${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    el.dos.date.textContent = `${fmtDate(now).toUpperCase()} · ${hhmmss(now)}`;
    el.dos.name.textContent = '';
    el.dos.name.dataset.full = p.name;
    el.dos.id.textContent = '#' + p.id;
    el.dos.ru.innerHTML = `${p.ru.toUpperCase()} · ПОЗЫВНОЙ <b>«${p.alias}»</b>`;
    el.dos.badge.textContent = fmtPct(p.match);
    const rows = [
      ['Date de naissance', 'Дата рождения', fmtDate(birth), `${age} ans au décès · ${age} ${ruYears(age)}`],
      ['Sexe', 'Пол', p.sex[0], p.sex[1]],
      ['Groupe sanguin', 'Группа крови', p.blood, ''],
      ['Affiliation', 'Принадлежность', (p.aff[0] === 'Sovereign' ? '<img class="aff-logo" src="assets/img/sovereign-mark.png" alt="">' : '') + p.aff[0], p.aff[1]],
      ['District', 'Район', p.dist[0], p.dist[1]],
      ['Correspondance ADN', 'Совпадение ДНК', fmtPct(p.match), '', 'acc'],
      ['Statut', 'Статус', 'Décédé — identification établie', 'Погиб · личность установлена', 'acc']
    ];
    el.dos.fields.innerHTML = rows.map((r) => `<div class="row"><dt>${r[0]}<em>${r[1]}</em></dt><dd class="${r[4] || ''}">${r[2]}${r[3] ? `<small>${r[3]}</small>` : ''}</dd></div>`).join('');

    const n = D.DEATH_YEARS_AGO;
    const items = [
      ['Résultat', 'Результат', 'Traces de substances chimiques dangereuses détectées sur les brins d\'ADN analysés.', 'Обнаружены следы опасных химических веществ на нитях ДНК.'],
      ['Cause probable du décès', 'Причина смерти', 'Exposition à un agent chimique toxique.', 'Воздействие токсичного химического агента.'],
      ['Conclusion', 'Заключение', 'Contamination probablement liée au décès ; hypothèse à confirmer.', 'Вероятно связано со смертью; требует подтверждения.'],
      ['Ancienneté présumée du décès', 'Давность смерти', `Environ ${n} ans.`, `Около ${n} ${ruYears(n)}.`],
      ['Date présumée du décès', 'Дата смерти', `${fmtDate(death)} — estimation`, `${fmtDateRu(death)} — оценка`, 'est']
    ];
    el.dos.toxList.innerHTML = items.map((r) => `<li class="${r[4] || ''}"><span>${r[0].toUpperCase()}<em>${r[1]}</em></span><strong>${r[2]}</strong><small>${r[3]}</small></li>`).join('');

    const rnd = seeded(p.id * 7919 + 13), sector = (p.id % 9) + 1, unknown = p.aff[0] === 'Inconnu';
    const cards = [
      ['Dernière localisation', 'Последнее местонахождение', `${p.dist[0]} — S${sector}`, `${p.dist[1]}, сектор ${sector}`],
      ['Signes particuliers', 'Особые приметы', (p.marks || ['Aucun', 'Не выявлено'])[0], (p.marks || ['Aucun', 'Не выявлено'])[1]],
      ['Contact', 'Контакт', unknown ? 'Aucun proche' : 'Registre Sovereign', unknown ? 'Близких нет' : 'Реестр «Суверен»'],
      ['Échantillon', 'Образец', st.sampleId, 'Бюро «Суверен»']
    ];
    const chips = STR_LOCI.map(([name, lo, hi]) => {
      const a = lo + Math.floor(rnd() * (hi - lo + 1)), b = lo + Math.floor(rnd() * (hi - lo + 1));
      return `<span><em>${name}</em>${Math.min(a, b)}<i>/</i>${Math.max(a, b)}</span>`;
    }).join('');
    el.dos.extra.innerHTML =
      `<div class="dx-cards">${cards.map((c) => `<div class="dx-card"><span>${c[0].toUpperCase()}<em>${c[1]}</em></span><b>${c[2]}</b><small>${c[3]}</small></div>`).join('')}</div>` +
      `<div class="dx-str"><span class="dx-title">PROFIL STR<em>СТР-ПРОФИЛЬ · 8 МАРКЕРОВ</em></span><div class="dx-chips">${chips}</div></div>`;
  }

  function resetDossierFx() {
    const v = el.dos.view;
    v.classList.remove('play', 'instant');
    el.dos.id.classList.remove('on'); el.dos.stamp.classList.remove('on'); el.dos.tox.classList.remove('show');
    el.dos.actions.classList.remove('on'); el.dos.name.classList.remove('typing');
    $$('.row, li, .dx-card, .dx-chips span', v).forEach((n) => n.classList.remove('on', 'show'));
  }
  function typeText(node, text, ms, done) {
    node.classList.add('typing');
    let k = 0;
    const step = () => {
      k++; node.textContent = text.slice(0, k); typeSnd();
      if (k < text.length) later(step, ms); else { node.classList.remove('typing'); if (done) done(); }
    };
    step();
  }
  function playDossier() {
    resetDossierFx();
    const v = el.dos.view; void v.offsetWidth; v.classList.add('play');
    let t = 250;
    later(() => { if (S) { const sc = S.scanner(); sc.set(0.4); setTimeout(() => sc.set(0.9), 500); setTimeout(() => sc.stop(), 1100); } }, t);
    t = 1350;
    later(() => typeText(el.dos.name, el.dos.name.dataset.full, 55, () => { el.dos.id.classList.add('on'); sfx('lock'); }), t);
    t += el.dos.name.dataset.full.length * 55 + 450;
    const rows = $$('.row', el.dos.fields);
    rows.forEach((r, i) => later(() => { r.classList.add('on'); sfx('blip', i); }, t + i * 150));
    t += rows.length * 150 + 300;
    later(() => sfx('stampPrep'), t);
    later(() => { el.dos.stamp.classList.add('on'); sfx('thud'); shake(); }, t + 180);
    t += 900;
    later(() => { el.dos.tox.classList.add('show'); sfx('whoosh'); }, t);
    const lis = $$('li', el.dos.toxList);
    t += 600;
    lis.forEach((li, i) => later(() => { li.classList.add('show'); sfx('beep', 760 + i * 60); }, t + i * 520));
    t += lis.length * 520;
    later(() => {
      st.toxShown = true;
      log(`Correspondance : <b>${st.profile.name}</b> — ${fmtPct(st.profile.match)}.`, 'ok', 'Профиль установлен');
      log('Rapport toxicologique émis — hypothèse à confirmer.', 'warn', 'Токсикологический отчёт');
      ui();
    }, t);
    const cards = $$('.dx-card', el.dos.extra), chips = $$('.dx-chips span', el.dos.extra);
    cards.forEach((c, i) => later(() => { c.classList.add('on'); tickSnd(); }, t + 200 + i * 140));
    chips.forEach((c, i) => later(() => { c.classList.add('on'); tickSnd(); }, t + 200 + cards.length * 140 + i * 90));
    later(() => el.dos.actions.classList.add('on'), t + 400 + cards.length * 140 + chips.length * 90);
  }
  function renderDossierInstant() {
    resetDossierFx();
    const v = el.dos.view;
    v.classList.add('instant');
    el.dos.name.textContent = el.dos.name.dataset.full;
    el.dos.id.classList.add('on'); el.dos.stamp.classList.add('on'); el.dos.tox.classList.add('show'); el.dos.actions.classList.add('on');
    $$('.row, .dx-card, .dx-chips span', v).forEach((n) => n.classList.add('on'));
    $$('li', el.dos.toxList).forEach((n) => n.classList.add('show'));
  }

  /* ============================================================
     RÉINITIALISATION
     ============================================================ */
  function resetAnalysis(animated = true) {
    const doReset = () => {
      clearTimers(); stopLoops(); clearSaved();
      st = freshState();
      el.log.innerHTML = '';
      el.resetOverlay.classList.remove('on');
      el.layerHelix.classList.remove('revealed');
      resetDossierFx();
      el.dos.toxList.innerHTML = '';
      el.fx.innerHTML = '';
      el.zoomStack.style.filter = 'none'; lastBlur = 0;
      el.tractor.style.opacity = 0; el.tractorCore.style.opacity = 0;
      el.seqPct.textContent = '0'; el.seqBar.style.width = '0%';
      el.cand.classList.remove('locked');
      el.sampleId.textContent = st.sampleId;
      spawnParticles(); syncReservoir(); buildBoard(); applyZoom();
      bootLog();
      ui(); onResize();
      sfx('powerOn');
    };
    if (!animated || !st) { doReset(); return; }
    el.resetOverlay.classList.add('on');
    glitch();
    clearTimers();
    setTimeout(doReset, 750);
  }

  /* ============================================================
     OUVERTURE / FERMETURE (GitHub Pages, iframe ou NUI FiveM)
     ============================================================ */
  function notifyHost(action) {
    try {
      if (typeof window.GetParentResourceName === 'function') {
        fetch(`https://${window.GetParentResourceName()}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: '{}' }).catch(() => {});
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: 'adn-scanner', action }, '*');
      }
    } catch (e) { /* hôte injoignable */ }
  }
  function closeTerminal() {
    if (!visible) return;
    visible = false;
    stopLoops(); saveNow();
    if (S && S.pause) S.pause();
    el.app.classList.add('hidden');
    el.tip.classList.remove('on');
    if (!embedded) el.closed.classList.add('on');
    notifyHost('close');
  }
  function openTerminal(fresh) {
    const wasHidden = !visible;
    visible = true;
    if (guideOpen()) setGuide(false);
    el.closed.classList.remove('on');
    el.app.classList.remove('hidden');
    if (S && S.resume) S.resume();
    if (fresh) resetAnalysis(false);
    lastT = performance.now();
    if (wasHidden) runBoot(false);
    onResize();
  }

  /* ============================================================
     INFOBULLES (pictogrammes de danger) ET POINTEUR
     ============================================================ */
  let tipOn = false;
  function moveTip(e) {
    const t = el.tip, off = 16;
    let x = e.clientX + off, y = e.clientY + off;
    if (x + t.offsetWidth > innerWidth - 8) x = e.clientX - t.offsetWidth - off;
    if (y + t.offsetHeight > innerHeight - 8) y = e.clientY - t.offsetHeight - off;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t && t.dataset.tip) { el.tip.innerHTML = t.dataset.tip; el.tip.classList.add('on'); tipOn = true; moveTip(e); }
    const b = e.target.closest && e.target.closest('.cta:not(:disabled),.guide-btn,.icon-btn,.close-btn,.knob,#gToc a,.g-back');
    if (b && !b.contains(e.relatedTarget)) { const n = performance.now(); if (n - snd.lastHover > 60) { snd.lastHover = n; sfx('hover'); } }
  });
  document.addEventListener('pointermove', (e) => {
    if (!tipOn) return;
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t || !t.dataset.tip) { el.tip.classList.remove('on'); tipOn = false; } else moveTip(e);
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t && !t.contains(e.relatedTarget)) { el.tip.classList.remove('on'); tipOn = false; }
  });

  function onStageMove(e) {
    ptr.x = e.clientX - geo.sl; ptr.y = e.clientY - geo.st; ptr.in = true;
    if (currentView() === 'scope' && st.step === 1 && st.tool === 'extractor' && !bootActive) {
      const on = Math.hypot(ptr.x - geo.cx, ptr.y - geo.cy) <= geo.R;
      el.scope.classList.toggle('use-cursor', on);
      el.toolCursor.classList.toggle('on', on);
      if (!geo.curW) measure();
      el.toolCursor.style.transform = `translate(${(ptr.x - 0.10 * geo.curW).toFixed(1)}px,${(ptr.y - 0.80 * geo.curH).toFixed(1)}px)`;
    }
  }
  function onStageLeave() {
    ptr.in = false;
    el.toolCursor.classList.remove('on'); el.scope.classList.remove('use-cursor');
  }

  /* ============================================================
     BOUCLE D'ANIMATION
     ============================================================ */
  let lastT = performance.now(), geoT = 0;
  function frame(now) { requestAnimationFrame(frame); update(now); }
  function update(now) {
    if (!visible || !st) return;
    const dt = clamp((now - lastT) / 1000, 0, 0.05); lastT = now;
    if (bootActive) authTick(dt);
    if (!bootActive) {
      const view = currentView();
      if (view === 'scope' && st.step === 1) extractionTick(dt, now);
      else if (snd.suck) { snd.suck.stop(); snd.suck = null; }
      if (view === 'scope' && st.step === 2 && st.tool === 'microscope') microscopeTick(dt, now);
      else if (snd.motor) { snd.motor.stop(); snd.motor = null; }
      if (st.seq.running) seqTick(now, dt);
    }
    geoT += dt; if (geoT > 1) { geoT = 0; measure(); }
    const zProg = st.step >= 3 ? 1 : st.step === 2 ? clamp(st.z / 0.8, 0, 1) : 0;
    const target = 20 * clamp(st.extracted / TOTAL_PARTICLES, 0, 1) + 20 * zProg + 20 * (st.fixed / TOTAL_STRANDS) + 25 * (st.seq.p / 100) + (st.toxShown || st.complete ? 15 : 0);
    st.pgShown += (target - st.pgShown) * Math.min(1, dt * 6);
    if (Math.abs(target - st.pgShown) < 0.05) st.pgShown = target;
    el.pgBar.style.width = st.pgShown.toFixed(2) + '%';
    const pv = Math.round(st.pgShown);
    if (el.pgPct.dataset.v !== String(pv)) { el.pgPct.dataset.v = pv; el.pgPct.innerHTML = `${pv}<small>%</small>`; }
  }

  /* ============================================================
     GUIDE INTÉGRÉ
     ============================================================ */
  function guideOpen() { return el.guide.classList.contains('on'); }
  function setGuide(on) {
    el.guide.classList.toggle('on', on);
    el.guide.setAttribute('aria-hidden', on ? 'false' : 'true');
    el.btnGuide.classList.toggle('active', on);
    el.btnGuide.textContent = on ? 'SCANNER' : 'GUIDE';
    if (on) { el.gDoc.scrollTop = 0; guideSpy(); stopLoops(); }
    sfx('whoosh');
    try { history.replaceState(null, '', on ? '#guide' : location.pathname + location.search); } catch (e) { /* iframe */ }
  }
  function guideSpy() {
    const links = $$('a', el.gToc), y = el.gDoc.scrollTop + el.gDoc.clientHeight * 0.3;
    let cur = null;
    links.forEach((a) => { const t = document.getElementById(a.getAttribute('href').slice(1)); if (t && t.offsetTop - el.gDoc.offsetTop <= y) cur = a; });
    links.forEach((a) => a.classList.toggle('on', a === cur));
  }

  /* ============================================================
     ÉVÉNEMENTS
     ============================================================ */
  function bind() {
    el.btnSequence.addEventListener('click', () => { sfx('click'); startSequence(); });
    el.btnClose.addEventListener('click', closeTerminal);
    el.btnCloseFile.addEventListener('click', closeTerminal);
    el.btnReopen.addEventListener('click', () => openTerminal(false));
    el.btnNew.addEventListener('click', () => { sfx('click'); resetAnalysis(true); });
    el.btnSound.addEventListener('click', () => {
      if (S) { S.init(); S.setMuted(!S.isMuted()); if (!S.isMuted()) { S.ambient(); S.click(); } }
      el.btnSound.classList.toggle('muted', !!(S && S.isMuted()));
    });
    el.btnSound.classList.toggle('muted', !!(S && S.isMuted()));
    el.btnGuide.addEventListener('click', () => setGuide(!guideOpen()));
    el.gBack.addEventListener('click', () => setGuide(false));
    el.gDoc.addEventListener('scroll', guideSpy, { passive: true });
    el.gToc.addEventListener('click', (e) => {
      const a = e.target.closest('a'); if (!a) return;
      e.preventDefault();
      const t = document.getElementById(a.getAttribute('href').slice(1));
      if (t) el.gDoc.scrollTo({ top: t.offsetTop - el.gDoc.offsetTop - 8, behavior: 'smooth' });
    });

    // authentification
    el.authPad.addEventListener('pointerdown', (e) => { e.preventDefault(); try { el.authPad.setPointerCapture(e.pointerId); } catch (x) { /* ignoré */ } authPress(); });
    el.authPad.addEventListener('pointerup', authRelease);
    el.authPad.addEventListener('pointercancel', authRelease);
    el.authPad.addEventListener('lostpointercapture', authRelease);
    el.authPad.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); authPress(); } });
    el.authPad.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') authRelease(); });
    el.boot.addEventListener('pointerdown', (e) => { if (!auth.shown && !e.target.closest('#authPad')) { bootTimers.forEach(clearTimeout); bootTimers = []; showAuth(); } });

    // zone de manipulation
    el.stage.addEventListener('pointermove', onStageMove);
    el.stage.addEventListener('pointerleave', onStageLeave);
    el.stage.addEventListener('wheel', (e) => {
      if (currentView() !== 'scope' || !micActive()) return;
      e.preventDefault();
      const k = -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0018;
      if (e.shiftKey) setFocus(st.focus + k); else setZoomTarget(st.zT + k);
    }, { passive: false });
    buildKnob(el.knobZoom); buildKnob(el.knobFocus);
    bindKnob(el.knobZoom, () => st.zT, setZoomTarget);
    bindKnob(el.knobFocus, () => st.focus, setFocus);
    el.ends.addEventListener('pointerdown', onEndDown);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); if (guideOpen()) setGuide(false); else closeTerminal(); }
    });
    window.addEventListener('resize', onResize);
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { saveNow(); stopLoops(); } });
    window.addEventListener('message', (ev) => {
      const d = ev.data || {};
      if (d.action === 'open' || d.action === 'show') openTerminal(!!d.fresh);
      else if (d.action === 'close' || d.action === 'hide') { if (visible) { visible = false; stopLoops(); if (S && S.pause) S.pause(); el.app.classList.add('hidden'); } }
      else if (d.action === 'reset') resetAnalysis(true);
    });
    setInterval(() => { const n = new Date(); el.clock.textContent = `${pad(n.getDate())}.${pad(n.getMonth() + 1)}.${n.getFullYear()} ${hhmmss(n)}`; }, 1000);
  }

  /* ============================================================
     INITIALISATION
     ============================================================ */
  function buildStaticScene() {
    el.breaks.innerHTML = BREAKS.map((b, i) => `<div class="brk" style="left:${b[0] / 5.12}%;top:${b[1] / 5.12}%;--i:${i}"></div>`).join('');
    el.residues.innerHTML = RESIDUES.map((r) => {
      let dots = '';
      for (let i = 0; i < 12; i++) {
        const a = rand(0, 6.28), d = Math.sqrt(Math.random()) * 38;
        dots += `<i class="dot" style="left:${50 + Math.cos(a) * d}%;top:${50 + Math.sin(a) * d}%;animation-delay:${(-Math.random() * 2.4).toFixed(2)}s"></i>`;
      }
      return `<div class="res" style="left:${r[0] / 5.12}%;top:${r[1] / 5.12}%" data-tip="Résidus chimiques suspects — analyse requise"><span class="halo"></span>${dots}<img class="hz" src="assets/img/biohazard.png" alt=""></div>`;
    }).join('');
    el.rGauge.innerHTML = '<i></i>'.repeat(TOTAL_PARTICLES);
  }

  buildStaticScene();
  st = freshState();
  const saved = loadSaved();
  if (saved) applySaved(saved);
  el.sampleId.textContent = st.sampleId;
  spawnParticles(); syncReservoir(); buildBoard();
  if (st.revealed) el.layerHelix.classList.add('revealed');
  bind();
  applyZoom();
  if (saved) {
    st.logs.forEach(renderLog);
    if (st.complete) { buildDossier(); renderDossierInstant(); st.toxShown = true; }
  }
  ui(); onResize();
  const n0 = new Date(); el.clock.textContent = `${pad(n0.getDate())}.${pad(n0.getMonth() + 1)}.${n0.getFullYear()} ${hhmmss(n0)}`;
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  runBoot(true);
  if (location.hash === '#guide') { setGuide(true); }

  // Accès de débogage : window.ADN
  let skew = 0;
  window.ADN = {
    step: (ms = 16) => { skew += ms; update(performance.now() + skew); },
    state: () => st, auth: () => authGranted(), open: openTerminal, close: closeTerminal, reset: () => resetAnalysis(true)
  };
})();
