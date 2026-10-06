/* ============================================================
   TERMINAL MÉDICO-LÉGAL — ANALYSE GÉNÉTIQUE
   Logique du parcours : extraction → microscope → reconnexion
   → séquençage → dossier + rapport toxicologique.
   JavaScript « classique » (pas de modules) pour fonctionner
   aussi bien sur GitHub Pages que dans le NUI de FiveM.
   ============================================================ */
(function () {
  'use strict';

  const D = window.ADN_DATA;

  /* ---------- Utilitaires ---------- */
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
  const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const hhmmss = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const NBSP = ' ';

  /* ---------- Constantes du scénario ---------- */
  const TOTAL_PARTICLES = 8;
  const TOTAL_STRANDS = 5;
  const REQ_MAG = 400;                              // grossissement requis
  const ZOOM_RATE = 0.036;                          // vitesse max du zoom (par seconde) : ~22 s en mise au point parfaite
  const STORE_KEY = 'sovereign-adn-scanner-v2';
  const magFromZ = (z) => Math.round(10 * Math.pow(100, z));   // ×10 → ×1000
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const BREAKS = [[290, 152], [183, 288], [205, 338], [268, 418], [345, 438]];   // positions sur helix-broken.webp (512 px)
  const RESIDUES = [[318, 115], [178, 225], [313, 378]];                          // foyers de résidus

  const TOOLS = {
    extractor:  { step: 1, name: 'EXTRACTEUR',  ru: 'ЭКСТРАКТОР',  cursor: 'assets/img/dropper.png',    hx: 0.10, hy: 0.80,
                  tip: 'Aspire les particules ADN.<br>Passez l\'outil sur une particule ou cliquez dessus.' },
    microscope: { step: 2, name: 'MICROSCOPE',  ru: 'МИКРОСКОП',   cursor: 'assets/img/magnifier.png',  hx: 0.40, hy: 0.38,
                  tip: 'Molette ou curseur pour grossir.<br>Atteignez <b>×400</b> pour révéler les brins endommagés.' },
    splice:     { step: 3, name: 'RECONNEXION', ru: 'СРАЩИВАНИЕ',  cursor: null,
                  tip: 'Faites glisser une extrémité de brin vers l\'ancrage compatible<br>(même symbole · base complémentaire).' }
  };

  const SYMBOL_FR = { diamond: 'losange', triangle: 'triangle', circle: 'cercle', square: 'carré', cross: 'croix' };

  /* ---------- Références DOM ---------- */
  const el = {
    app: $('#app'), stage: $('#stage'), scope: $('#scope'), scopeInner: $('#scopeInner'),
    layerDish: $('#layerDish'), layerCells: $('#layerCells'), layerHelix: $('#layerHelix'),
    breaks: $('#breaks'), residues: $('#residues'), particles: $('#particles'),
    pickRing: $('#pickRing'), glitch: $('#glitchFlash'),
    reservoir: $('#reservoir'), rTube: $('#rTube'), rGauge: $('#rGauge'), rCount: $('#rCount'),
    magHud: $('#magHud'), magRange: $('#magRange'), magValue: $('#magValue'), focusRange: $('#focusRange'), sharpBar: $('#sharpBar'), sharpMeter: $('#sharpMeter'),
    views: { scope: $('#viewScope'), repair: $('#viewRepair'), seq: $('#viewSeq'), dossier: $('#viewDossier') },
    board: $('#board'), ends: $('#ends'), sockets: $('#sockets'), wires: $('#wires'), boardDone: $('#boardDone'),
    seqCanvas: $('#seqCanvas'), seqPct: $('#seqPct'), seqMsg: $('#seqMsg'), seqMsgRu: $('#seqMsgRu'), seqBar: $('#seqBar'), seqList: $('#seqList'),
    beam: $('#beamPath'), fx: $('#fx'), toolCursor: $('#toolCursor'), toast: $('#toast'), resetOverlay: $('#resetOverlay'),
    hudMode: $('#hudMode'), hudCoords: $('#hudCoords'), hudCounter: $('#hudCounter'),
    guide: $('#guide'), gDoc: $('#gDoc'), gToc: $('#gToc'), btnGuide: $('#btnGuide'), gBack: $('#gBack'),
    sampleId: $('#sampleId'), scannerState: $('#scannerState'), clock: $('#clock'),
    btnSequence: $('#btnSequence'), launch: $('#launchWrap'), btnClose: $('#btnClose'),
    btnNew: $('#btnNew'), btnCloseFile: $('#btnCloseFile'), btnReopen: $('#btnReopen'), closed: $('#closed'),
    mParticles: $('#mParticles'), mMag: $('#mMag'), mStrands: $('#mStrands'), mIntegrity: $('#mIntegrity'), mResidue: $('#mResidue'), mTox: $('#mTox'),
    pgPct: $('#pgPct'), pgBar: $('#pgBar'), pgStep: $('#pgStep'), log: $('#log'), tip: $('#tip'),
    dos: { file: $('#dosFile'), date: $('#dosDate'), name: $('#dosName'), id: $('#dosId'), ru: $('#dosRuName'), fields: $('#dosFields'),
           badge: $('#dosMatchBadge'), extra: $('#dosExtra'), tox: $('#toxBox'), toxList: $('#toxList') }
  };

  const embedded = typeof window.GetParentResourceName === 'function' || window.self !== window.top;
  if (embedded) { document.body.classList.add('embedded'); document.documentElement.classList.add('embedded'); }

  /* ============================================================
     ÉTAT
     ============================================================ */
  let st = null;
  let visible = true;
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const ptr = { x: 0, y: 0, in: false, down: false };      // pointeur en coordonnées « stage »

  function eligibleProfiles(now) {
    const death = deathDateFrom(now);
    return D.PROFILES.filter((p) => {
      const birth = new Date(p.birth[0], p.birth[1] - 1, p.birth[2]);
      const ageAtDeath = (death - birth) / (365.25 * 864e5);
      return ageAtDeath >= D.MIN_AGE_AT_DEATH;
    });
  }

  function freshState() {
    const now = new Date();
    const pool = eligibleProfiles(now);
    const fixed = D.PROFILE_MODE === 'fixed' && D.PROFILES.find((x) => x.id === D.FIXED_PROFILE_ID);
    const profile = fixed || pick(pool.length ? pool : D.PROFILES);
    // 3 symboles seulement pour 5 brins : la base complémentaire devient décisive
    const syms = shuffle(Object.keys(D.SYMBOLS)).slice(0, 3);
    const symList = shuffle([syms[0], syms[0], syms[1], syms[1], syms[2]]);
    const bases = ['A', 'T', 'C', 'G'];
    const ends = symList.map((sym, i) => ({ id: 'e' + i, n: i + 1, sym, base: pick(bases), toxic: false }));
    syms.forEach((s) => {                                      // même symbole → bases différentes
      const g = ends.filter((e) => e.sym === s);
      if (g.length > 1 && g[0].base === g[1].base) g[1].base = pick(bases.filter((b) => b !== g[0].base));
    });
    shuffle(ends.map((_, i) => i)).slice(0, 3).forEach((i) => { ends[i].toxic = true; });
    const needed = ends.map((e) => ({ sym: e.sym, base: D.COMPLEMENT[e.base], pair: e.id }));
    const decoys = [];                                         // 2 ancrages leurres qui ne correspondent à aucun brin
    for (let guard = 0; decoys.length < 2 && guard < 200; guard++) {
      const sym = pick(syms), base = pick(bases);
      if (!needed.concat(decoys).some((n) => n.sym === sym && n.base === base)) decoys.push({ sym, base, pair: null });
    }
    const socks = shuffle(needed.concat(decoys)).map((s, i) => ({ id: 's' + i, n: i + 1, sym: s.sym, base: s.base, pair: s.pair }));

    return {
      step: 1, tool: 'extractor',
      particles: [], extracted: 0,
      z: 0, zT: 0, revealed: false,
      ends, socks, links: {}, fixed: 0, warned: false, drag: null,
      seq: { running: false, p: 0, dur: 0, t0: 0, msg: -1, finishing: false },
      complete: false, toxShown: false,
      profile, analysisDate: null,
      sampleId: `GX-${randInt(1000, 9999)}-${pick(['ЛК', 'ВР', 'ДН', 'ЖС', 'ТМ', 'КР'])}`,
      focus: 0.5, fT: 0.5, sharp: 1, ph1: rand(0, 6.28), ph2: rand(0, 6.28),
      logs: [],
      pgShown: 0
    };
  }

  /* ============================================================
     DATES
     ============================================================ */
  function deathDateFrom(d) {
    const y = d.getFullYear() - D.DEATH_YEARS_AGO, m = d.getMonth(), day = d.getDate();
    const t = new Date(y, m, day);
    return t.getMonth() !== m ? new Date(y, m + 1, 0) : t;      // 29 février → 28 février
  }
  const fmtDate = (d) => `${d.getDate() === 1 ? '1er' : d.getDate()} ${D.MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const ruYears = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'год' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет');
  const fmtPct = (v) => v.toFixed(1).replace('.', ',') + NBSP + '%';

  /* ============================================================
     JOURNAL / TOAST / INSTRUCTIONS
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
    renderLog(e);
    saveSoon();
  }

  /* ============================================================
     SAUVEGARDE LOCALE : la progression (et la réussite) survit à la fermeture
     ============================================================ */
  let saveTimer = 0;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); }
  function saveNow() {
    if (!st) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        v: 2, step: st.step, extracted: st.extracted, z: st.z, zT: st.zT, revealed: st.revealed,
        ends: st.ends, socks: st.socks, links: st.links, fixed: st.fixed, warned: st.warned,
        complete: st.complete, toxShown: st.toxShown, profileId: st.profile.id,
        analysisDate: st.analysisDate ? st.analysisDate.toISOString() : null,
        sampleId: st.sampleId, logs: st.logs.slice(-60)
      }));
    } catch (e) { /* stockage indisponible (navigation privée, iframe…) : on continue sans */ }
  }
  function loadSaved() {
    try { const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); return d && d.v === 2 ? d : null; } catch (e) { return null; }
  }
  function clearSaved() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignoré */ } }

  function applySaved(d) {
    st.step = d.step; st.extracted = d.extracted; st.z = d.z; st.zT = d.zT; st.revealed = d.revealed;
    st.ends = d.ends; st.socks = d.socks; st.links = d.links || {}; st.fixed = d.fixed; st.warned = d.warned;
    st.complete = d.complete; st.toxShown = d.toxShown; st.sampleId = d.sampleId; st.logs = d.logs || [];
    const p = D.PROFILES.find((x) => x.id === d.profileId); if (p) st.profile = p;
    st.analysisDate = d.analysisDate ? new Date(d.analysisDate) : null;
    if (st.step === 1 && st.extracted >= TOTAL_PARTICLES) st.step = 2;
    if (st.step === 2 && st.revealed) st.step = 3;
    st.tool = st.complete ? null : st.step === 1 ? 'extractor' : st.step === 2 ? 'microscope' : st.step === 3 ? 'splice' : null;
  }

  let toastTimer = 0;
  function toast(msg, bad = false) {
    el.toast.textContent = msg;
    el.toast.classList.toggle('bad', bad);
    el.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('on'), 2400);
  }

  /* ============================================================
     VUES
     ============================================================ */
  function currentView() {
    if (st.complete) return 'dossier';
    if (st.seq.running) return 'seq';
    if (st.step >= 4) return 'repair';
    if (st.step === 3 && st.tool === 'splice') return 'repair';
    return 'scope';
  }

  function scannerLabel() {
    if (st.complete) return ['PROFIL IDENTIFIÉ', 'ok', 'ПРОФИЛЬ УСТАНОВЛЕН'];
    if (st.seq.running) return ['SÉQUENÇAGE', 'on', 'СЕКВЕНИРОВАНИЕ'];
    if (st.step === 1) return ['EXTRACTION', 'on', 'ИЗВЛЕЧЕНИЕ'];
    if (st.step === 2) return ['OBSERVATION', 'on', 'НАБЛЮДЕНИЕ'];
    if (st.step === 3) return st.tool === 'splice' ? ['RECONNEXION', 'on', 'СРАЩИВАНИЕ'] : ['BRINS DÉTECTÉS', 'on', 'РАЗРЫВЫ ОБНАРУЖЕНЫ'];
    return ['PRÊT — SÉQUENÇAGE', 'ok', 'ГОТОВ К АНАЛИЗУ'];
  }

  /* ============================================================
     RENDU GLOBAL DE L'INTERFACE (déclenché à chaque changement)
     ============================================================ */
  function ui() {
    const view = currentView();
    Object.entries(el.views).forEach(([k, v]) => v.classList.toggle('on', k === view));
    el.scope.classList.toggle('mic', st.tool === 'microscope' && view === 'scope');
    el.scope.classList.toggle('extract', st.tool === 'extractor');

    /* Curseur d'outil : l'outil dépend uniquement de l'étape */
    const tl = st.tool && TOOLS[st.tool];
    if (tl && tl.cursor) {
      const img = el.toolCursor.firstElementChild;
      if (img.getAttribute('src') !== tl.cursor) img.setAttribute('src', tl.cursor);
    }
    if (!(view === 'scope' && tl && tl.cursor)) {
      el.toolCursor.classList.remove('on'); el.pickRing.classList.remove('on'); el.scope.classList.remove('use-cursor');
    }

    /* Bouton de séquençage (seule action manuelle restante) */
    const canSeq = st.step === 4 && !st.seq.running && !st.complete;
    el.btnSequence.disabled = !canSeq;
    el.launch.classList.toggle('show', canSeq);

    /* Scanner */
    const [sl, sc, slr] = scannerLabel();
    el.scannerState.className = 'state ' + sc;
    $('em', el.scannerState).innerHTML = `${sl} <small>${slr}</small>`;

    /* HUD */
    const modes = { scope: st.step >= 2 ? ['OBSERVATION MICROSCOPIQUE', 'МИКРОСКОПИЯ'] : ['ZONE D\'ÉCHANTILLON', 'ЗОНА ОБРАЗЦА'], repair: ['RECONNEXION MOLÉCULAIRE', 'МОЛЕКУЛЯРНОЕ СРАЩИВАНИЕ'], seq: ['SÉQUENÇAGE GÉNÉTIQUE', 'ГЕНЕТИЧЕСКОЕ СЕКВЕНИРОВАНИЕ'], dossier: ['DOSSIER D\'IDENTIFICATION', 'ЛИЧНОЕ ДЕЛО'] };
    el.hudMode.textContent = modes[view][0]; el.hudMode.dataset.ru = modes[view][1];
    updateHudCounter();

    /* Réservoir / grossissement */
    el.reservoir.classList.toggle('dim', st.step === 2 && view === 'scope');
    el.reservoir.classList.toggle('gone', st.step >= 3 || view !== 'scope');
    const showMag = view === 'scope' && st.step >= 2 && st.step <= 3;
    el.magHud.classList.toggle('show', showMag);
    const micOn = st.step === 2 && st.tool === 'microscope';
    el.magRange.disabled = !micOn; el.focusRange.disabled = !micOn;
    if (!micOn) el.scopeInner.style.setProperty('--blur', '0px');

    /* Mesures */
    setMetric(el.mParticles, `${st.extracted}<small>/${TOTAL_PARTICLES}</small>`, st.extracted / TOTAL_PARTICLES);
    setMetric(el.mStrands, `${st.fixed}<small>/${TOTAL_STRANDS}</small>`, st.fixed / TOTAL_STRANDS);
    const integ = st.revealed ? clamp(58 + st.fixed * 8, 0, 98) : null;
    setMetric(el.mIntegrity, integ === null ? '—' : `${integ}<small>%</small>`, integ === null ? 0 : integ / 100);
    const res = $('b', el.mResidue);
    el.mResidue.classList.toggle('alert', st.revealed && !st.complete);
    el.mResidue.classList.toggle('hot', st.complete);
    res.innerHTML = st.complete ? 'DÉTECTÉS — 3 FOYERS<small>ОБНАРУЖЕНО — 3 ОЧАГА</small>' : st.revealed ? 'SUSPECTS — ANALYSE REQUISE<small>ПОДОЗРИТЕЛЬНО — ТРЕБУЕТСЯ АНАЛИЗ</small>' : 'NON ÉVALUÉS<small>НЕ ОЦЕНЕНЫ</small>';
    const tox = $('b', el.mTox);
    el.mTox.classList.toggle('locked', !st.toxShown);
    el.mTox.classList.toggle('hot', st.toxShown);
    tox.innerHTML = `<img src="assets/img/biohazard.png" alt="">${st.toxShown ? 'AGENT TOXIQUE — À CONFIRMER<small>ТОКСИЧНЫЙ АГЕНТ — ПОДТВЕРДИТЬ</small>' : 'VERROUILLÉE<small>ЗАБЛОКИРОВАНО</small>'}`;

    /* Plateau de reconnexion */
    el.boardDone.classList.toggle('on', st.fixed >= TOTAL_STRANDS);
    el.pgStep.textContent = st.complete ? 'ANALYSE TERMINÉE · АНАЛИЗ ЗАВЕРШЁН' : `ÉTAPE ${st.step} / 5 · ЭТАП`;
    saveSoon();
  }

  function setMetric(m, html, ratio) {
    const b = $('b', m);
    if (b.innerHTML !== html) { b.innerHTML = html; m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump'); }
    const u = $('u', m); if (u) u.style.width = (clamp(ratio, 0, 1) * 100) + '%';
  }

  function updateHudCounter() {
    const view = currentView();
    let html = '', ru = '';
    if (view === 'scope' && st.step === 1) { html = `PARTICULES EXTRAITES :<b>${st.extracted}/${TOTAL_PARTICLES}</b>`; ru = 'ИЗВЛЕЧЕНО ЧАСТИЦ'; }
    else if (view === 'scope') { html = `GROSSISSEMENT :<b>×${magFromZ(st.z)}</b>`; ru = 'УВЕЛИЧЕНИЕ'; }
    else if (view === 'repair') { html = `BRINS RECONNECTÉS :<b>${st.fixed}/${TOTAL_STRANDS}</b>`; ru = 'НИТИ ВОССТАНОВЛЕНЫ'; }
    else if (view === 'seq') { html = `SÉQUENÇAGE :<b>${Math.floor(st.seq.p)}%</b>`; ru = 'СЕКВЕНИРОВАНИЕ'; }
    else { html = `CORRESPONDANCE ADN :<b>${fmtPct(st.profile.match)}</b>`; ru = 'СОВПАДЕНИЕ ДНК'; }
    html += `<small>${ru}</small>`;
    if (el.hudCounter.innerHTML !== html) {
      const sameLead = el.hudCounter.dataset.k === view + st.step;
      el.hudCounter.innerHTML = html; el.hudCounter.dataset.k = view + st.step;
      if (sameLead && view !== 'seq' && !(view === 'scope' && st.step >= 2)) { el.hudCounter.classList.remove('bump'); void el.hudCounter.offsetWidth; el.hudCounter.classList.add('bump'); }
    }
  }

  /* ============================================================
     ENCHAÎNEMENT AUTOMATIQUE DES OUTILS (aucune sélection manuelle)
     ============================================================ */
  function enterObservation() {
    if (!st || st.step !== 1) return;
    st.step = 2; st.tool = 'microscope';
    log('Réservoir scellé — échantillon transféré vers le microscope.', 'ok', 'Образец передан в микроскоп');
    log('Microscope actif — grossissement ×10.', '', 'Микроскоп активен');
    ui();
  }

  function enterRepair() {
    if (!st || st.step !== 3 || st.tool === 'splice') return;
    st.tool = 'splice'; st.warned = true;
    const toxic = st.ends.filter((e) => e.toxic).map((e) => pad(e.n)).join(', ');
    log(`Reconnexion engagée — ${TOTAL_STRANDS} segments rompus.`, 'ok', 'Сращивание начато');
    later(() => log(`Segments contaminés : <b>${toxic}</b>. Traces de substances chimiques dangereuses détectées sur les brins analysés.`, 'warn', 'Обнаружены опасные химические вещества'), 500);
    ui();
    layoutWires();
  }

  /* ============================================================
     ÉTAPE 1 — EXTRACTION DES PARTICULES
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
      st.particles.push({
        i, node, collected: false, flying: false,
        x: Math.cos(ang) * r, y: Math.sin(ang) * r,
        vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp,
        base: sp, charge: 0,
        size: rand(0.105, 0.135), ph: rand(0, 6.28), near: false
      });
    }
  }

  function syncReservoir() {
    el.rCount.textContent = st.extracted;
    $$('i', el.rGauge).forEach((g, i) => g.classList.toggle('on', i < st.extracted));
    el.rTube.style.setProperty('--fill', (st.extracted / TOTAL_PARTICLES).toFixed(2));
  }

  function updateParticles(dt, now, flee) {
    const W = el.scopeInner.clientWidth;
    for (const p of st.particles) {
      if (p.collected) continue;
      // dérive brownienne, plus nerveuse
      const turn = (Math.random() - 0.5) * 3.4 * dt;
      const c = Math.cos(turn), s = Math.sin(turn);
      let vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c;
      // fuite : la particule s'écarte de l'extracteur quand il s'approche
      if (flee) {
        const dx = p.x - flee.x, dy = p.y - flee.y, d = Math.hypot(dx, dy), R = 0.13;
        if (d < R && d > 0.0001) { const k = (1 - d / R) * 1.2; vx += (dx / d) * k * dt; vy += (dy / d) * k * dt; }
      }
      // la vitesse revient doucement vers sa vitesse de croisière (plafonnée)
      const sp = Math.hypot(vx, vy) || 0.0001, target = clamp(sp, 0, 0.24);
      const ns = target + (p.base - target) * Math.min(1, dt * 1.4);
      p.vx = (vx / sp) * ns; p.vy = (vy / sp) * ns;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const lim = 0.37 - p.size / 2, d = Math.hypot(p.x, p.y);
      if (d > lim) {                                  // rebond sur le bord de la boîte
        const nx = p.x / d, ny = p.y / d, dot = p.vx * nx + p.vy * ny;
        p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny;
        p.x = nx * lim; p.y = ny * lim;
      }
      const w = p.size * W;
      const pulse = 1 + 0.05 * Math.sin(now * 0.002 + p.ph);
      p.node.style.width = p.node.style.height = w + 'px';
      p.node.style.transform = `translate(${(0.5 + p.x) * W - w / 2}px,${(0.5 + p.y) * W - w / 2}px) scale(${pulse})`;
    }
  }

  function pointerInScope() {
    const r = el.scopeInner.getBoundingClientRect(), sr = el.stage.getBoundingClientRect();
    const cx = r.left - sr.left + r.width / 2, cy = r.top - sr.top + r.height / 2;
    return { cx, cy, R: r.width / 2, d: Math.hypot(ptr.x - cx, ptr.y - cy) };
  }

  /* L'extracteur doit rester posé sur la particule ~0,8 s pour la verrouiller ; la jauge retombe si on la perd. */
  const HOLD_TIME = 0.8, HOLD_DECAY = 0.35;
  function activePointer() {
    return currentView() === 'scope' && st.step === 1 && st.tool === 'extractor' && ptr.in;
  }

  function testPicking(dt) {
    if (!activePointer()) {
      st.particles.forEach((p) => { if (p.charge > 0 || p.near) { p.charge = 0; p.near = false; p.node.classList.remove('near'); p.node.style.setProperty('--c', 0); } });
      return;
    }
    const ps = pointerInScope();
    const inside = ps.d <= ps.R;
    const sr = el.stage.getBoundingClientRect();
    const rem = remPx();
    for (const p of st.particles) {
      if (p.collected || p.flying) continue;
      const r = p.node.getBoundingClientRect();
      const px = r.left - sr.left + r.width / 2, py = r.top - sr.top + r.height / 2;
      const d = Math.hypot(ptr.x - px, ptr.y - py);
      const locked = inside && d < r.width * 0.42 + 0.35 * rem;
      p.charge = clamp(p.charge + (locked ? dt / HOLD_TIME : -dt / HOLD_DECAY), 0, 1);
      const near = p.charge > 0.01;
      if (near !== p.near) { p.near = near; p.node.classList.toggle('near', near); }
      p.node.style.setProperty('--c', p.charge.toFixed(3));
      if (p.charge >= 1) collectParticle(p, px, py, r.width);
    }
  }

  function collectParticle(p, px, py, w) {
    if (p.collected) return;                       // chaque particule ne peut être récoltée qu'une fois
    p.collected = true; p.flying = true;
    const src = $('img', p.node).src;
    p.node.remove();

    const sr = el.stage.getBoundingClientRect(), tr = el.rTube.getBoundingClientRect();
    const tx = tr.left - sr.left + tr.width / 2, ty = tr.top - sr.top + tr.height * 0.1;
    // faisceau d'aspiration
    const bx0 = ptr.in ? ptr.x : px, by0 = ptr.in ? ptr.y : py;
    el.beam.setAttribute('d', `M${bx0} ${by0} Q ${(bx0 + tx) / 2} ${Math.min(by0, ty) - 40} ${tx} ${ty}`);
    el.beam.classList.remove('go'); void el.beam.getBoundingClientRect(); el.beam.classList.add('go');

    const fx = document.createElement('div');
    fx.className = 'fxp'; fx.style.width = fx.style.height = w + 'px';
    fx.innerHTML = `<img src="${src}" alt="">`;
    el.fx.appendChild(fx);
    const sx = px - w / 2, sy = py - w / 2;
    const ex = tx - w * 0.15, ey = ty - w * 0.15;
    const mx = (sx + ex) / 2 + (ex > sx ? -1 : 1) * 70, my = Math.min(sy, ey) - 60;
    const anim = fx.animate([
      { transform: `translate(${sx}px,${sy}px) scale(1.15)`, opacity: 1 },
      { transform: `translate(${mx}px,${my}px) scale(.85)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${ex}px,${ey}px) scale(.18)`, opacity: .85 }
    ], { duration: 780 + rand(0, 160), easing: 'cubic-bezier(.45,.05,.7,.6)', fill: 'forwards' });
    let arrived = false;
    const arrive = () => {
      if (arrived) return; arrived = true;
      fx.remove();
      if (!st) return;
      st.extracted++;
      el.rCount.textContent = st.extracted;
      $$('i', el.rGauge).forEach((g, i) => g.classList.toggle('on', i < st.extracted));
      el.rTube.style.setProperty('--fill', (st.extracted / TOTAL_PARTICLES).toFixed(2));
      el.reservoir.classList.remove('pulse'); void el.reservoir.offsetWidth; el.reservoir.classList.add('pulse');
      log(`Particule ADN <b>${st.extracted}/${TOTAL_PARTICLES}</b> aspirée — réservoir à ${Math.round(st.extracted / TOTAL_PARTICLES * 100)} %.`, '', `Частица ${st.extracted} из ${TOTAL_PARTICLES}`);
      if (st.extracted === TOTAL_PARTICLES) {
        log('Échantillon complet — <b>8/8</b> particules extraites.', 'ok', 'Образец готов к исследованию');
        later(enterObservation, 1100);
      }
      ui();
    };
    anim.onfinish = arrive;
    setTimeout(arrive, 1100);                        // filet de sécurité si l'onglet est en arrière-plan
  }

  /* ============================================================
     ÉTAPE 2 — MICROSCOPE / ZOOM
     ============================================================ */
  function applyZoom() {
    const z = st.z;
    const dishOp = 1 - smooth(0.2, 0.46, z);
    const dishSc = 1 + 9 * z;
    el.layerDish.style.opacity = dishOp.toFixed(3);
    el.layerDish.style.transform = `scale(${dishSc.toFixed(3)})`;
    const cellsOp = smooth(0.24, 0.44, z) * (1 - smooth(0.6, 0.8, z));
    el.layerCells.style.opacity = cellsOp.toFixed(3);
    el.layerCells.style.transform = `scale(${lerp(0.55, 1.9, smooth(0.24, 0.8, z)).toFixed(3)})`;
    const helixOp = smooth(0.58, 0.8, z);
    el.layerHelix.style.opacity = helixOp.toFixed(3);
    el.layerHelix.style.transform = `scale(${lerp(0.45, 1.08, smooth(0.55, 1, z)).toFixed(3)})`;
    el.particles.style.opacity = (1 - smooth(0.02, 0.12, z)).toFixed(3);
    const mag = magFromZ(z);
    el.magValue.textContent = '×' + mag;
    el.magRange.style.setProperty('--p', (z * 100).toFixed(1) + '%');
    $('b', el.mMag).textContent = st.step >= 2 ? '×' + mag : '—';
    const u = $('u', el.mMag); if (u) u.style.width = (st.step >= 2 ? z * 100 : 0) + '%';
    return mag;
  }

  function setZoomTarget(v) {
    if (!(st.step === 2 && st.tool === 'microscope')) return;
    st.zT = clamp(v, 0, 1);
    el.magRange.value = Math.round(st.zT * 1000);
  }
  function setFocus(v) {
    if (!(st.step === 2 && st.tool === 'microscope')) return;
    st.focus = clamp(v, 0, 1);
    el.focusRange.value = Math.round(st.focus * 1000);
  }

  /* Le point de netteté dérive en permanence : le zoom n'avance que si l'image est nette. */
  function microscopeTick(dt, now) {
    st.fT = 0.5 + 0.30 * Math.sin(now * 0.00047 + st.ph1) + 0.12 * Math.sin(now * 0.00131 + st.ph2);
    const sharp = clamp(1 - Math.abs(st.focus - st.fT) / 0.17, 0, 1);
    st.sharp = sharp;
    el.scopeInner.style.setProperty('--blur', ((1 - Math.pow(sharp, 0.7)) * 9).toFixed(1) + 'px');
    el.sharpBar.style.width = (sharp * 100).toFixed(0) + '%';
    el.sharpMeter.classList.toggle('ok', sharp > 0.45);
    const dz = st.zT - st.z;
    if (dz > 0) st.z += Math.min(dz, (sharp > 0.3 ? ZOOM_RATE * sharp : 0) * dt);
    else if (dz < 0) st.z += Math.max(dz, -0.14 * dt);
    const mag = applyZoom();
    updateHudCounter();
    if (mag >= REQ_MAG && !st.revealed) reveal();
    saveSoon();
  }

  function reveal() {
    if (st.revealed) return;
    st.revealed = true;
    el.layerHelix.classList.add('revealed');
    el.scopeInner.style.setProperty('--blur', '0px');
    el.scope.classList.add('glitch'); el.glitch.classList.add('on');
    later(() => { el.scope.classList.remove('glitch'); el.glitch.classList.remove('on'); }, 800);
    st.step = 3; st.tool = null;
    el.toolCursor.classList.remove('on'); el.pickRing.classList.remove('on');
    later(enterRepair, 3000);
    log(`Grossissement ×${REQ_MAG} atteint — double hélice résolue.`, 'ok', 'Двойная спираль визуализирована');
    later(() => log(`<b>${TOTAL_STRANDS} brins endommagés</b> localisés.`, 'warn', 'Обнаружены разрывы нитей'), 450);
    later(() => log('Résidus chimiques suspects — analyse requise.', 'warn', 'Подозрительные химические остатки'), 900);
    ui();
  }

  /* ============================================================
     ÉTAPE 3 — RECONNEXION DES BRINS (mini-jeu)
     ============================================================ */
  function symbolSvg(sym) { return `<svg viewBox="0 0 24 24" aria-hidden="true">${D.SYMBOLS[sym]}</svg>`; }

  function buildBoard() {
    el.ends.innerHTML = ''; el.wires.innerHTML = '';
    st.ends.forEach((e) => {
      const d = document.createElement('div');
      d.className = 'end' + (st.links[e.id] ? ' linked' : ''); d.dataset.id = e.id;
      d.innerHTML =
        `<div class="e-meta"><b data-ru="НИТЬ">BRIN ${pad(e.n)}</b>` +
        (e.toxic
          ? `<span class="hz-row"><img class="hz" src="assets/img/biohazard.png" alt="" data-tip="Résidus chimiques suspects — analyse requise">CONTAMINÉ</span>`
          : `<span class="hz-row"></span>`) +
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
      d.innerHTML =
        `<div class="port"></div><div class="chip">${symbolSvg(s.sym)}<span class="base">${s.base}</span></div>` +
        `<div class="e-meta"><b data-ru="ЯКОРЬ">ANCRAGE ${pad(s.n)}</b></div>`;
      el.sockets.appendChild(d);
    });
  }

  /* Une erreur déstabilise le plateau : les ancrages encore libres changent de place. */
  function reshuffleSockets() {
    if (!st || st.step !== 3) return;
    const used = new Set(Object.values(st.links));
    const idx = st.socks.map((s, i) => i).filter((i) => !used.has(st.socks[i].id));
    const mixed = shuffle(idx.map((i) => st.socks[i]));
    idx.forEach((i, k) => { st.socks[i] = mixed[k]; });
    el.sockets.classList.add('shuffling');
    later(() => el.sockets.classList.remove('shuffling'), 450);
    renderSockets(); layoutWires(); saveSoon();
  }

  const boardPos = (elm) => {
    const r = elm.getBoundingClientRect(), b = el.board.getBoundingClientRect();
    return { x: r.left + r.width / 2 - b.left, y: r.top + r.height / 2 - b.top };
  };
  const curve = (a, b) => { const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45); return `M${a.x} ${a.y} C${a.x + dx} ${a.y},${b.x - dx} ${b.y},${b.x} ${b.y}`; };
  function svgEl(tag, attrs = {}) { const n = document.createElementNS(SVG_NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }

  function layoutWires() {
    $$('.wire-link', el.wires).forEach((n) => n.remove());
    for (const eid in st.links) {
      const e = st.ends.find((x) => x.id === eid), s = st.socks.find((x) => x.id === st.links[eid]);
      const a = boardPos($(`.end[data-id="${eid}"] .port`)), b = boardPos($(`.sock[data-id="${s.id}"] .port`));
      const g = svgEl('g', { class: 'wire-link' });
      const d = curve(a, b), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      g.appendChild(svgEl('path', { class: 'wire ok', d }));
      g.appendChild(svgEl('path', { class: 'wire core wire-flow', d }));
      g.appendChild(svgEl('circle', { class: 'rung', cx: mid.x, cy: mid.y, r: 17 }));
      const t = svgEl('text', { x: mid.x, y: mid.y + 4.5 }); t.textContent = `${e.base}–${s.base}`;
      g.appendChild(t);
      el.wires.appendChild(g);
    }
  }

  function dragAllowed() { return st.step === 3 && st.tool === 'splice' && !st.seq.running && !st.complete; }

  function onEndDown(ev) {
    const end = ev.target.closest('.end');
    if (!end || end.classList.contains('linked') || !dragAllowed() || st.drag) return;
    ev.preventDefault();
    const id = end.dataset.id;
    const live = svgEl('path', { class: 'wire live' });
    const orb = svgEl('circle', { class: 'orb', r: 6 });
    el.wires.appendChild(live); el.wires.appendChild(orb);
    end.classList.add('dragging');
    st.drag = { id, end, live, orb, target: null };
    moveDrag(ev);
    window.addEventListener('pointermove', moveDrag);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  function socketAt(ev) {
    const sockets = $$('.sock:not(.linked)', el.sockets);
    const rem = remPx();
    let best = null, bd = 1e9;
    for (const s of sockets) {
      const r = s.getBoundingClientRect();
      const inside = ev.clientX > r.left - rem * 1.2 && ev.clientX < r.right + rem && ev.clientY > r.top - rem * 0.6 && ev.clientY < r.bottom + rem * 0.6;
      if (!inside) continue;
      const d = Math.abs(ev.clientY - (r.top + r.height / 2));
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function moveDrag(ev) {
    const d = st.drag; if (!d) return;
    const b = el.board.getBoundingClientRect();
    const p = { x: ev.clientX - b.left, y: ev.clientY - b.top };
    const a = boardPos($('.port', d.end));
    d.live.setAttribute('d', curve(a, p));
    d.orb.setAttribute('cx', p.x); d.orb.setAttribute('cy', p.y);
    const t = socketAt(ev);
    if (t !== d.target) { if (d.target) d.target.classList.remove('target'); if (t) t.classList.add('target'); d.target = t; }
  }

  function endDrag(ev) {
    const d = st.drag; if (!d) return;
    window.removeEventListener('pointermove', moveDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    st.drag = null;
    d.end.classList.remove('dragging');
    const target = ev && ev.type !== 'pointercancel' ? socketAt(ev) : null;
    if (d.target) d.target.classList.remove('target');
    if (!target) { retract(d, false); return; }
    const end = st.ends.find((e) => e.id === d.id), sock = st.socks.find((s) => s.id === target.dataset.id);
    const okSym = end.sym === sock.sym, okBase = D.COMPLEMENT[end.base] === sock.base;
    if (okSym && okBase) success(d, end, sock, target);
    else fail(d, end, sock, target, okSym, okBase);
  }

  function retract(d, bad, then) {
    d.live.classList.toggle('bad', !!bad);
    const a = boardPos($('.port', d.end));
    const p0 = { x: +d.orb.getAttribute('cx'), y: +d.orb.getAttribute('cy') };
    const t0 = performance.now(), dur = 320;
    (function step(now) {
      const t = clamp((now - t0) / dur, 0, 1), k = 1 - Math.pow(1 - t, 3);
      const p = { x: lerp(p0.x, a.x, k), y: lerp(p0.y, a.y, k) };
      d.live.setAttribute('d', curve(a, p)); d.orb.setAttribute('cx', p.x); d.orb.setAttribute('cy', p.y);
      if (t < 1) requestAnimationFrame(step); else { d.live.remove(); d.orb.remove(); if (then) then(); }
    })(t0);
  }

  function fail(d, end, sock, targetEl, okSym, okBase) {
    const reason = !okSym && !okBase ? 'symbole et base incompatibles' : !okSym ? 'symbole différent' : 'base non complémentaire (A↔T · C↔G)';
    const sockEnd = $(`.end[data-id="${d.id}"]`);
    [sockEnd, targetEl].forEach((n) => { n.classList.remove('err'); void n.offsetWidth; n.classList.add('err'); });
    later(() => { sockEnd.classList.remove('err'); targetEl.classList.remove('err'); }, 650);
    retract(d, true);
    toast('Connexion refusée · СОЕДИНЕНИЕ ОТКЛОНЕНО', true);
    later(() => { log('Ancrages instables — réorganisation.', 'err', 'Якоря перестроены'); reshuffleSockets(); }, 520);
    log(`Connexion refusée : ${SYMBOL_FR[end.sym]} ${end.base} ✕ ${SYMBOL_FR[sock.sym]} ${sock.base} (${reason}).`, 'err', 'Неверное соединение');
  }

  function success(d, end, sock, targetEl) {
    st.links[end.id] = sock.id;
    st.fixed++;
    const endEl = $(`.end[data-id="${end.id}"]`);
    d.live.remove(); d.orb.remove();
    [endEl, targetEl].forEach((n) => { n.classList.add('linked', 'pop'); });
    later(() => { endEl.classList.remove('pop'); targetEl.classList.remove('pop'); }, 700);
    layoutWires();
    const bp = boardPos($('.port', targetEl));
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('i'); s.className = 'spark';
      s.style.left = bp.x + 'px'; s.style.top = bp.y + 'px';
      el.board.appendChild(s);
      const ang = rand(0, Math.PI * 2), dist = rand(20, 70);
      s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(0)`, opacity: 0 }],
        { duration: rand(450, 800), easing: 'ease-out' }).onfinish = () => s.remove();
    }
    log(`Brin <b>${pad(end.n)}</b> reconnecté (${end.base}–${sock.base}) — ${st.fixed}/${TOTAL_STRANDS}.` + (end.toxic ? ' Résidu chimique isolé sur ce segment.' : ''),
      end.toxic ? 'warn' : 'ok', end.toxic ? 'Токсичный остаток изолирован' : `Нить ${end.n} восстановлена`);
    if (st.fixed >= TOTAL_STRANDS) {
      st.step = 4; st.tool = null;
      log('Reconnexion complète — <b>5/5</b> brins.', 'ok', 'Все нити восстановлены');
    }
    ui();
  }

  /* ============================================================
     ÉTAPE 4 — SÉQUENÇAGE
     ============================================================ */
  function startSequence() {
    if (st.step !== 4 || st.seq.running || st.complete) return;
    st.seq = { running: true, p: 0, dur: rand(5000, 10000), t0: performance.now(), msg: -1, finishing: false };
    el.seqList.innerHTML = D.SEQ_STEPS.map((s, i) => `<li data-i="${i}">${s[1]}<em>${s[2]}</em></li>`).join('');
    log(`Séquençage lancé (${(st.seq.dur / 1000).toFixed(1).replace('.', ',')} s estimées).`, 'ok', 'Секвенирование запущено');
    st.tool = null;
    ui();
    el.seqBar.style.width = '0%';
    seqUpdateMsg(0);
  }

  function seqUpdateMsg(p) {
    let idx = 0;
    D.SEQ_STEPS.forEach((s, i) => { if (p >= s[0] && (i < D.SEQ_STEPS.length - 1 || p >= 100)) idx = i; });
    if (idx === st.seq.msg) return;
    st.seq.msg = idx;
    const s = D.SEQ_STEPS[idx];
    el.seqMsg.textContent = s[1]; el.seqMsgRu.textContent = s[2];
    $$('li', el.seqList).forEach((li, i) => { li.classList.toggle('done', i < idx || (i === idx && idx === D.SEQ_STEPS.length - 1)); li.classList.toggle('cur', i === idx && idx < D.SEQ_STEPS.length - 1); });
    log(s[1] + (idx < D.SEQ_STEPS.length - 1 ? '…' : ''), idx === D.SEQ_STEPS.length - 1 ? 'ok' : '', s[2]);
  }

  function seqTick(now) {
    const q = st.seq;
    if (!q.running || q.finishing) return;
    const t = clamp((now - q.t0) / q.dur, 0, 1);
    q.p = 100 * (0.55 * t + 0.45 * smooth(0, 1, t));
    if (t >= 1) q.p = 100;
    el.seqPct.textContent = Math.floor(q.p);
    el.seqBar.style.width = q.p + '%';
    seqUpdateMsg(q.p);
    updateHudCounter();
    if (t >= 1) {
      q.finishing = true;
      later(finishSequence, 1100);              // la progression est terminée avant de révéler le dossier
    }
  }

  function finishSequence() {
    st.seq.running = false;
    st.complete = true; st.step = 5;
    st.analysisDate = new Date();
    buildDossier();
    ui();
    startToxReveal();
  }

  /* ---------- Hélice animée (canvas) ---------- */
  const glowSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,236,200,1)'); gr.addColorStop(.25, 'rgba(255,170,70,.85)'); gr.addColorStop(.6, 'rgba(255,138,31,.25)'); gr.addColorStop(1, 'rgba(255,138,31,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c;
  })();

  function drawHelix(now) {
    const cv = el.seqCanvas, ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const cx = w / 2, top = h * 0.05, bot = h * 0.95, R = Math.min(w * 0.27, h * 0.2), phase = now * 0.0011;
    const prog = clamp(st.seq.p / 100, 0, 1), turns = 2.6 * Math.PI * 2;
    const N = 38;
    // brins
    for (const sign of [1, -1]) {
      for (let k = 0; k < 160; k++) {
        const t0 = k / 160, t1 = (k + 1) / 160;
        const a0 = phase + t0 * turns, a1 = phase + t1 * turns;
        const x0 = cx + sign * R * Math.cos(a0), x1 = cx + sign * R * Math.cos(a1);
        const y0 = lerp(top, bot, t0), y1 = lerp(top, bot, t1);
        const z = (sign * Math.sin(a0) + 1) / 2, lit = t0 <= prog;
        ctx.strokeStyle = lit ? `rgba(255,${150 + z * 70 | 0},${50 + z * 60 | 0},${0.35 + z * 0.6})` : `rgba(255,138,31,${0.1 + z * 0.22})`;
        ctx.lineWidth = 1.5 + z * 3;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
    // barreaux + nœuds
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N, a = phase + t * turns, y = lerp(top, bot, t);
      const x1 = cx + R * Math.cos(a), x2 = cx - R * Math.cos(a), z1 = (Math.sin(a) + 1) / 2, z2 = 1 - z1;
      const lit = t <= prog, near = Math.abs(t - prog) < 0.025 && st.seq.running;
      const al = lit ? 0.75 : 0.18;
      const gr = ctx.createLinearGradient(x1, y, x2, y);
      gr.addColorStop(0, `rgba(255,170,70,${al * (0.4 + z1 * 0.6)})`); gr.addColorStop(0.5, `rgba(255,236,200,${al * 0.5})`); gr.addColorStop(1, `rgba(255,170,70,${al * (0.4 + z2 * 0.6)})`);
      ctx.strokeStyle = gr; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      for (const [x, z] of [[x1, z1], [x2, z2]]) {
        const s = (lit ? 22 : 12) + z * 14 + (near ? 16 : 0);
        ctx.globalAlpha = lit ? 0.95 : 0.35; ctx.drawImage(glowSprite, x - s / 2, y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
    // ligne de balayage
    const sy = lerp(top, bot, prog);
    const sg = ctx.createLinearGradient(0, sy - 26, 0, sy + 26);
    sg.addColorStop(0, 'rgba(255,138,31,0)'); sg.addColorStop(0.5, 'rgba(255,200,120,.55)'); sg.addColorStop(1, 'rgba(255,138,31,0)');
    ctx.fillStyle = sg; ctx.fillRect(cx - R * 1.5, sy - 26, R * 3, 52);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ============================================================
     ÉTAPES 5 & 6 — DOSSIER ET RAPPORT TOXICOLOGIQUE
     ============================================================ */
  function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const STR_LOCI = [['D3S1358', 12, 19], ['vWA', 11, 21], ['FGA', 18, 30], ['D8S1179', 8, 19], ['D21S11', 24, 38], ['D18S51', 9, 26], ['D5S818', 7, 16], ['D13S317', 7, 15]];

  function dossierExtra(p) {
    const rnd = seeded(p.id * 7919 + 13);
    const sector = (p.id % 9) + 1;
    const unknown = p.aff[0] === 'Inconnu';
    const cards = [
      ['Dernière localisation', `${p.dist[0]} — Secteur ${sector}`, `${p.dist[1]}, сектор ${sector}`, 'ПОСЛЕДНЕЕ МЕСТОНАХОЖДЕНИЕ'],
      ['Signes particuliers', (p.marks || ['Aucun relevé', 'Не выявлено'])[0], (p.marks || ['Aucun relevé', 'Не выявлено'])[1], 'ОСОБЫЕ ПРИМЕТЫ'],
      ['Contact', unknown ? 'Aucun proche enregistré' : 'Registre Sovereign', unknown ? 'Близких нет в реестре' : 'Реестр «Суверен»', 'КОНТАКТ'],
      ['Échantillon', st.sampleId, 'Образец · хранение: Бюро «Суверен»', 'ОБРАЗЕЦ']
    ];
    const chips = STR_LOCI.map(([name, lo, hi]) => {
      const a = lo + Math.floor(rnd() * (hi - lo + 1)), b = lo + Math.floor(rnd() * (hi - lo + 1));
      return `<span><em>${name}</em>${Math.min(a, b)}<i>/</i>${Math.max(a, b)}</span>`;
    }).join('');
    return `<div class="dx-cards">${cards.map((c) => `<div class="dx-card"><span>${c[0].toUpperCase()}<em>${c[3]}</em></span><b>${c[1]}</b><small>${c[2]}</small></div>`).join('')}</div>` +
      `<div class="dx-str"><span class="dx-title">PROFIL STR — 8 MARQUEURS<em>СТР-ПРОФИЛЬ · 8 МАРКЕРОВ</em></span><div class="dx-chips">${chips}</div></div>` +
      `<div class="dx-note"><b>Dossier transmis au Bureau Sovereign</b> · accès niveau 3<em>Досье передано в Бюро «Суверен» · допуск — уровень 3</em></div>`;
  }

  function buildDossier() {
    const p = st.profile, now = st.analysisDate;
    const death = deathDateFrom(now);
    const birth = new Date(p.birth[0], p.birth[1] - 1, p.birth[2]);
    const age = Math.floor((death - birth) / (365.25 * 864e5));
    el.dos.file.textContent = `${pad(p.id, 4)}-${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    el.dos.date.textContent = `ANALYSÉ LE ${fmtDate(now).toUpperCase()} · ${hhmmss(now)}`;
    el.dos.name.textContent = p.name;
    el.dos.id.textContent = '#' + p.id;
    el.dos.ru.innerHTML = `${p.ru.toUpperCase()} · ПОЗЫВНОЙ <b>«${p.alias}»</b>`;
    el.dos.badge.textContent = 'CORRESP. ' + fmtPct(p.match);
    const rows = [
      ['Date de naissance', fmtDate(birth), `âge présumé au décès : ${age} ans · ${age} ${ruYears(age)}`, '', 'ДАТА РОЖДЕНИЯ'],
      ['Sexe', p.sex[0], p.sex[1], '', 'ПОЛ'],
      ['Groupe sanguin', p.blood, '', '', 'ГРУППА КРОВИ'],
      ['Affiliation', (p.aff[0] === 'Sovereign' ? '<img class="aff-logo" src="assets/img/sovereign-mark.png" alt="">' : '') + p.aff[0], p.aff[1], '', 'ПРИНАДЛЕЖНОСТЬ'],
      ['District', p.dist[0], p.dist[1], '', 'РАЙОН'],
      ['Correspondance ADN', fmtPct(p.match), '', 'acc', 'СОВПАДЕНИЕ ДНК'],
      ['Statut', 'Décédé — identification établie', 'ПОГИБ · ЛИЧНОСТЬ УСТАНОВЛЕНА', 'acc', 'СТАТУС']
    ];
    el.dos.fields.innerHTML = rows.map((r) => `<div class="row"><dt data-ru="${r[4]}">${r[0]}</dt><dd class="${r[3] || ''}">${r[1]}${r[2] ? `<small>${r[2]}</small>` : ''}</dd></div>`).join('');
    el.dos.extra.innerHTML = dossierExtra(p);

    const dd = fmtDate(death), ddRu = `${death.getDate()} ${D.MONTHS_RU[death.getMonth()]} ${death.getFullYear()}`;
    const n = D.DEATH_YEARS_AGO;
    const items = [
      ['Résultat', 'Traces de substances chimiques dangereuses détectées sur les brins d\'ADN analysés.', '', 'РЕЗУЛЬТАТ', 'Обнаружены следы опасных химических веществ на проанализированных нитях ДНК.'],
      ['Cause probable du décès', 'Exposition à un agent chimique toxique.', '', 'ВЕРОЯТНАЯ ПРИЧИНА СМЕРТИ', 'Воздействие токсичного химического агента.'],
      ['Conclusion', 'Contamination probablement liée au décès ; hypothèse à confirmer.', '', 'ЗАКЛЮЧЕНИЕ', 'Заражение, вероятно, связано со смертью; гипотеза требует подтверждения.'],
      ['Ancienneté présumée du décès', `Environ ${n} ans.`, '', 'ПРЕДПОЛАГАЕМАЯ ДАВНОСТЬ СМЕРТИ', `Около ${n} ${ruYears(n)}.`],
      ['Date présumée du décès', `${dd} — estimation`, 'est', 'ПРЕДПОЛАГАЕМАЯ ДАТА СМЕРТИ', `${ddRu} — оценка`]
    ];
    el.dos.toxList.innerHTML = items.map((r) => `<li class="${r[2] || ''}"><span>${r[0].toUpperCase()} · ${r[3]}</span><strong>${r[1]}</strong><small>${r[4]}</small></li>`).join('');
    el.dos.tox.classList.remove('show');
  }

  function startToxReveal() {
    log(`Profil identifié : <b>${st.profile.name}</b> (#${st.profile.id}) — correspondance ${fmtPct(st.profile.match)}.`, 'ok', 'Профиль установлен');
    later(() => el.dos.tox.classList.add('show'), 900);
    $$('li', el.dos.toxList).forEach((li, i) => later(() => li.classList.add('show'), 1700 + i * 700));
    later(() => {
      st.toxShown = true;
      log('Rapport toxicologique généré — contamination probablement liée au décès ; <b>hypothèse à confirmer</b>.', 'warn', 'Токсикологический отчёт готов');
      ui();
    }, 1700 + 5 * 700);
  }

  /* ============================================================
     RÉINITIALISATION
     ============================================================ */
  function resetAnalysis(animated = true) {
    const doReset = () => {
      clearTimers();
      clearSaved();
      st = freshState();
      el.log.innerHTML = '';
      el.resetOverlay.classList.remove('on');
      el.layerHelix.classList.remove('revealed');
      el.dos.tox.classList.remove('show');
      el.dos.toxList.innerHTML = '';
      syncReservoir();
      el.magRange.value = 0; el.focusRange.value = 500; el.scopeInner.style.setProperty('--blur', '0px');
      el.beam.classList.remove('go'); el.fx.innerHTML = '';
      el.toolCursor.classList.remove('on'); el.pickRing.classList.remove('on');
      el.seqPct.textContent = '0'; el.seqBar.style.width = '0%';
      el.sampleId.textContent = st.sampleId;
      spawnParticles(); buildBoard();
      applyZoom();
      bootLog();
      ui();
      onResize();
    };
    if (!animated || !st) { doReset(); return; }
    el.resetOverlay.classList.add('on');
    clearTimers();
    setTimeout(doReset, 750);
  }

  function bootLog() {
    log('Terminal Sovereign initialisé — session ouverte.', 'ok', 'Терминал «Суверен» инициализирован');
    log(`Échantillon <b>${st.sampleId}</b> chargé. Scanner en veille.`, '', 'Образец загружен');
    log('Accès autorisé.', '', 'Доступ разрешён');
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
    } catch (e) { /* hôte injoignable : on ignore */ }
  }

  function closeTerminal() {
    if (!visible) return;
    visible = false;
    el.app.classList.add('hidden');
    el.tip.classList.remove('on');
    if (!embedded) el.closed.classList.add('on');
    notifyHost('close');
  }

  function openTerminal(fresh) {
    visible = true;
    if (guideOpen()) setGuide(false);
    el.closed.classList.remove('on');
    el.app.classList.remove('hidden');
    el.app.style.animation = 'none'; void el.app.offsetWidth; el.app.style.animation = '';
    if (fresh) resetAnalysis(false);
    onResize(); lastT = performance.now();
  }

  /* ============================================================
     INFOBULLES, POINTEUR, REDIMENSIONNEMENT
     ============================================================ */
  let tipOn = false;
  function moveTip(e) {
    const t = el.tip, pad = 16;
    let x = e.clientX + pad, y = e.clientY + pad;
    const w = t.offsetWidth, h = t.offsetHeight;
    if (x + w > innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > innerHeight - 8) y = e.clientY - h - pad;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t && t.dataset.tip) { el.tip.innerHTML = t.dataset.tip; el.tip.classList.add('on'); tipOn = true; moveTip(e); }
  });
  document.addEventListener('pointermove', (e) => {
    if (tipOn) {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (!t || !t.dataset.tip) { el.tip.classList.remove('on'); tipOn = false; } else moveTip(e);
    }
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t && !t.contains(e.relatedTarget)) { el.tip.classList.remove('on'); tipOn = false; }
  });

  function onStageMove(e) {
    const r = el.stage.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.in = true;
    const view = currentView();
    let useCursor = false;
    if (view === 'scope' && st.tool && TOOLS[st.tool].cursor) {
      const ps = pointerInScope();
      useCursor = ps.d <= ps.R;
      el.scope.classList.toggle('use-cursor', useCursor);
      const t = TOOLS[st.tool];
      el.toolCursor.classList.toggle('on', useCursor);
      const w = el.toolCursor.offsetWidth, h = el.toolCursor.firstElementChild.offsetHeight || w * 1.2;
      el.toolCursor.style.transform = `translate(${ptr.x - t.hx * w}px,${ptr.y - t.hy * h}px)`;
      const pr = el.scope.getBoundingClientRect();
      el.pickRing.style.transform = `translate(${e.clientX - pr.left}px,${e.clientY - pr.top}px)`;
      el.pickRing.classList.toggle('on', useCursor && st.tool === 'extractor');
    } else {
      el.scope.classList.remove('use-cursor');
      el.toolCursor.classList.remove('on'); el.pickRing.classList.remove('on');
    }
    el.hudCoords.textContent = `X ${pad(Math.round(ptr.x * 0.9), 3)}.${pad(Math.round(e.clientX % 100))} · Y ${pad(Math.round(ptr.y * 0.9), 3)}.${pad(Math.round(e.clientY % 100))}`;
  }
  function onStageLeave() {
    ptr.in = false; ptr.down = false;
    el.toolCursor.classList.remove('on'); el.pickRing.classList.remove('on'); el.scope.classList.remove('use-cursor');
  }

  function onResize() {
    const r = el.stage.getBoundingClientRect();
    const S = Math.min(r.height * 0.97, r.width * 0.64);
    document.documentElement.style.setProperty('--S', Math.max(S, 120) + 'px');
    layoutWires();
    if (st && st.step === 1) updateParticles(0, performance.now());
  }

  /* ============================================================
     BOUCLE D'ANIMATION
     ============================================================ */
  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    update(now);
  }
  function update(now) {
    if (!visible || !st) return;
    const dt = clamp((now - lastT) / 1000, 0, 0.05); lastT = now;
    const view = currentView();

    if (view === 'scope') {
      if (st.step === 1) {
        let flee = null;
        if (activePointer()) { const ps = pointerInScope(); if (ps.d <= ps.R * 1.15) { const W = el.scopeInner.clientWidth; flee = { x: (ptr.x - ps.cx) / W, y: (ptr.y - ps.cy) / W }; } }
        updateParticles(dt, now, flee); testPicking(dt);
      }
      if (st.step === 2 && st.tool === 'microscope') microscopeTick(dt, now);
    }
    if (st.seq.running) { seqTick(now); drawHelix(now); }

    // progression globale
    const zProg = st.step >= 3 ? 1 : st.step === 2 ? clamp(st.z / 0.8, 0, 1) : 0;
    const target = 20 * clamp(st.extracted / TOTAL_PARTICLES, 0, 1) + 20 * zProg + 20 * (st.fixed / TOTAL_STRANDS) + 25 * (st.seq.p / 100) + (st.toxShown || st.complete ? 15 : 0);
    st.pgShown += (target - st.pgShown) * Math.min(1, dt * 6);
    if (Math.abs(target - st.pgShown) < 0.05) st.pgShown = target;
    el.pgBar.style.width = st.pgShown.toFixed(2) + '%';
    const pv = Math.round(st.pgShown);
    if (el.pgPct.dataset.v !== String(pv)) { el.pgPct.dataset.v = pv; el.pgPct.innerHTML = `${pv}<small>%</small>`; }
  }


  /* ============================================================
     GUIDE INTÉGRÉ (même page, même fenêtre)
     ============================================================ */
  function guideOpen() { return el.guide.classList.contains('on'); }
  function setGuide(on, anchor) {
    el.guide.classList.toggle('on', on);
    el.guide.setAttribute('aria-hidden', on ? 'false' : 'true');
    el.btnGuide.classList.toggle('active', on);
    el.btnGuide.textContent = on ? 'SCANNER' : 'GUIDE';
    if (on) {
      const t = anchor && document.getElementById(anchor);
      if (t) el.gDoc.scrollTop = t.offsetTop - el.gDoc.offsetTop - 8; else el.gDoc.scrollTop = 0;
      guideSpy();
    }
    try { history.replaceState(null, '', on ? '#guide' : location.pathname + location.search); } catch (e) { /* iframe / file */ }
  }
  function guideSpy() {
    const links = $$('a', el.gToc), y = el.gDoc.scrollTop + el.gDoc.clientHeight * 0.3;
    let cur = null;
    links.forEach((a) => {
      const t = document.getElementById(a.getAttribute('href').slice(1));
      if (t && t.offsetTop - el.gDoc.offsetTop <= y) cur = a;
    });
    links.forEach((a) => a.classList.toggle('on', a === cur));
  }
  el.btnGuide.addEventListener('click', () => setGuide(!guideOpen()));
  el.gBack.addEventListener('click', () => setGuide(false));
  el.gDoc.addEventListener('scroll', guideSpy, { passive: true });
  el.gToc.addEventListener('click', (e) => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault();
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (t) el.gDoc.scrollTo({ top: t.offsetTop - el.gDoc.offsetTop - 8, behavior: 'smooth' });
  });
  if (location.hash === '#guide') setGuide(true);
  window.addEventListener('hashchange', () => { if (location.hash === '#guide' && !guideOpen()) setGuide(true); });

  /* ============================================================
     ÉVÉNEMENTS
     ============================================================ */
  function bind() {
    el.btnSequence.addEventListener('click', startSequence);
    el.btnClose.addEventListener('click', closeTerminal);
    el.btnCloseFile.addEventListener('click', closeTerminal);
    el.btnReopen.addEventListener('click', () => openTerminal(false));
    el.btnNew.addEventListener('click', () => resetAnalysis(true));

    el.stage.addEventListener('pointermove', onStageMove);
    el.stage.addEventListener('pointerleave', onStageLeave);
    el.stage.addEventListener('pointerdown', (e) => {
      ptr.down = true;
    });
    window.addEventListener('pointerup', () => { ptr.down = false; });
    el.stage.addEventListener('wheel', (e) => {
      if (currentView() === 'scope' && st.step === 2 && st.tool === 'microscope') { e.preventDefault(); const k = -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120); if (e.shiftKey) setFocus(st.focus + k * 0.0008); else setZoomTarget(st.zT + k * 0.0008); }
    }, { passive: false });
    el.magRange.addEventListener('input', () => setZoomTarget(+el.magRange.value / 1000));
    el.focusRange.addEventListener('input', () => setFocus(+el.focusRange.value / 1000));
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
    el.ends.addEventListener('pointerdown', onEndDown);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); if (guideOpen()) setGuide(false); else closeTerminal(); return; }
      if (!visible || guideOpen()) return;
    });
    window.addEventListener('resize', onResize);
    window.addEventListener('message', (ev) => {
      const d = ev.data || {};
      if (d.action === 'open' || d.action === 'show') openTerminal(!!d.fresh);
      else if (d.action === 'close' || d.action === 'hide') { if (visible) { visible = false; el.app.classList.add('hidden'); } }
      else if (d.action === 'reset') resetAnalysis(true);
    });
    setInterval(() => {
      const n = new Date();
      el.clock.textContent = `${pad(n.getDate())}.${pad(n.getMonth() + 1)}.${n.getFullYear()} ${hhmmss(n)}`;
    }, 1000);
  }

  /* ============================================================
     INITIALISATION
     ============================================================ */
  function buildStaticScene() {
    el.breaks.innerHTML = BREAKS.map((b, i) =>
      `<div class="brk" style="left:${b[0] / 5.12}%;top:${b[1] / 5.12}%;--i:${i}"><span>SEG-${pad(i + 1)}</span></div>`).join('');
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
  el.magRange.value = Math.round(st.zT * 1000);
  applyZoom();
  if (saved) {
    st.logs.forEach(renderLog);
    log('Session restaurée — progression conservée.', 'ok', 'Сеанс восстановлен');
    if (st.complete) {
      buildDossier();
      el.dos.tox.classList.add('show');
      $$('li', el.dos.toxList).forEach((li) => li.classList.add('show'));
      st.toxShown = true;
    }
  } else {
    bootLog();
  }
  bind(); ui(); onResize();
  const n0 = new Date(); el.clock.textContent = `${pad(n0.getDate())}.${pad(n0.getMonth() + 1)}.${n0.getFullYear()} ${hhmmss(n0)}`;
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);

  // Accès de débogage : window.ADN.state()
  let skew = 0;
  window.ADN = { step: (ms = 16) => { skew += ms; update(performance.now() + skew); }, state: () => st, open: openTerminal, close: closeTerminal, reset: () => resetAnalysis(true) };
})();
