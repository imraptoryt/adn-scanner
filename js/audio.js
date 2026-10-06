/* ============================================================
   MOTEUR SONORE — entièrement synthétisé (WebAudio), aucun fichier.
   Le contexte audio ne démarre qu'après un geste du joueur
   (l'authentification par empreinte), comme l'exigent les navigateurs.
   ============================================================ */
window.SFX = (function () {
  'use strict';

  const KEY = 'sovereign-adn-muted';
  const VOL = 0.55;
  let ctx = null, out = null, noiseBuf = null, amb = null;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* stockage indisponible */ }

  const ok = () => !!ctx && ctx.state !== 'closed';
  const t0 = () => ctx.currentTime;
  const NOP = { set() {}, stop() {} };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 4;
    out = ctx.createGain();
    out.gain.value = muted ? 0 : VOL;
    out.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  /* ---------- briques de base ---------- */
  function tone(o) {
    if (!ok()) return;
    const { f = 440, f2 = 0, type = 'sine', dur = 0.1, vol = 0.1, a = 0.004, delay = 0, lp = 0 } = o;
    const t = t0() + delay;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; osc.connect(fl); node = fl; }
    node.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function noise(o) {
    if (!ok()) return;
    const { dur = 0.1, vol = 0.1, type = 'bandpass', f = 1000, f2 = 0, q = 1, a = 0.003, delay = 0 } = o;
    const t = t0() + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  /* ---------- sons continus (poignée set/stop) ---------- */
  function suction() {
    if (!ok()) return NOP;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 5; fl.frequency.value = 500;
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 180;
    const og = ctx.createGain(); og.gain.value = 0;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    s.connect(fl); fl.connect(g); osc.connect(og); og.connect(g); g.connect(out);
    s.start(); osc.start();
    let dead = false;
    return {
      set(v) {
        if (dead) return; const t = t0();
        fl.frequency.setTargetAtTime(450 + v * 2800, t, 0.05);
        osc.frequency.setTargetAtTime(160 + v * 560, t, 0.05);
        og.gain.setTargetAtTime(0.035 * v, t, 0.05);
        g.gain.setTargetAtTime(0.03 + 0.12 * v, t, 0.04);
      },
      stop() {
        if (dead) return; dead = true; const t = t0();
        g.gain.setTargetAtTime(0.0001, t, 0.04);
        s.stop(t + 0.25); osc.stop(t + 0.25);
      }
    };
  }

  function motor() {
    if (!ok()) return NOP;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 60;
    const osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 121;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 420; fl.Q.value = 3;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    osc.connect(fl); osc2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(out);
    osc.start(); osc2.start();
    let dead = false;
    return {
      set(v) {
        if (dead) return; const t = t0();
        osc.frequency.setTargetAtTime(48 + v * 120, t, 0.08);
        osc2.frequency.setTargetAtTime(97 + v * 240, t, 0.08);
        fl.frequency.setTargetAtTime(300 + v * 900, t, 0.08);
        g.gain.setTargetAtTime(0.0001 + 0.07 * v, t, 0.06);
      },
      stop() {
        if (dead) return; dead = true; const t = t0();
        g.gain.setTargetAtTime(0.0001, t, 0.08);
        osc.stop(t + 0.5); osc2.stop(t + 0.5);
      }
    };
  }

  function scanner() {
    if (!ok()) return NOP;
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 320;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 9;
    const lg = ctx.createGain(); lg.gain.value = 18;
    lfo.connect(lg); lg.connect(osc.frequency);
    const g = ctx.createGain(); g.gain.value = 0.0001;
    osc.connect(g); g.connect(out);
    osc.start(); lfo.start();
    let dead = false;
    return {
      set(v) {
        if (dead) return; const t = t0();
        osc.frequency.setTargetAtTime(320 + v * 900, t, 0.05);
        g.gain.setTargetAtTime(0.02 + v * 0.05, t, 0.05);
      },
      stop() {
        if (dead) return; dead = true; const t = t0();
        g.gain.setTargetAtTime(0.0001, t, 0.03);
        osc.stop(t + 0.2); lfo.stop(t + 0.2);
      }
    };
  }

  /* ---------- ambiance : ronronnement de salle serveur ---------- */
  function ambient() {
    if (!ok() || amb) return;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    const o1 = ctx.createOscillator(); o1.frequency.value = 55;
    const o2 = ctx.createOscillator(); o2.frequency.value = 55.6;
    const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 110.4;
    const og = ctx.createGain(); og.gain.value = 0.35;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 380; fl.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 140;
    lfo.connect(lg); lg.connect(fl.frequency);
    o1.connect(g); o2.connect(g); o3.connect(og); og.connect(g);
    s.connect(fl); fl.connect(ng); ng.connect(g);
    g.connect(out);
    [o1, o2, o3, s, lfo].forEach((n) => n.start());
    g.gain.setTargetAtTime(0.05, t0(), 1.2);
    amb = g;
  }

  /* ---------- effets ponctuels ---------- */
  const fx = {
    click() { tone({ f: 1900, type: 'square', dur: 0.025, vol: 0.035, lp: 4200 }); },
    hover() { tone({ f: 2700, dur: 0.02, vol: 0.012 }); },
    tick() { noise({ type: 'bandpass', f: 4200, q: 4, dur: 0.012, vol: 0.06 }); },
    type() { noise({ type: 'highpass', f: 2600 + Math.random() * 1500, dur: 0.018, vol: 0.035 }); },
    blip(i = 0) { tone({ f: 880 + i * 70, dur: 0.06, vol: 0.05 }); },
    beep(f = 1200) { tone({ f, dur: 0.09, vol: 0.06 }); },
    chatter() { tone({ f: 900 + Math.random() * 2000, type: 'square', dur: 0.018, vol: 0.014, lp: 5000 }); },
    capture() {
      tone({ f: 480, f2: 1600, dur: 0.13, vol: 0.11 });
      noise({ type: 'highpass', f: 3000, dur: 0.06, vol: 0.05 });
    },
    drop() {
      tone({ f: 1200, f2: 260, dur: 0.18, vol: 0.08 });
      tone({ f: 2100, dur: 0.05, vol: 0.025, delay: 0.12 });
    },
    lock() {
      tone({ f: 1250, type: 'square', dur: 0.03, vol: 0.04, lp: 5000 });
      tone({ f: 1870, type: 'square', dur: 0.05, vol: 0.035, lp: 5000, delay: 0.045 });
      tone({ f: 110, f2: 55, dur: 0.22, vol: 0.25 });
    },
    error() {
      tone({ f: 138, type: 'sawtooth', dur: 0.3, vol: 0.12, lp: 900 });
      tone({ f: 146, type: 'sawtooth', dur: 0.3, vol: 0.12, lp: 900 });
      noise({ type: 'lowpass', f: 700, dur: 0.12, vol: 0.12 });
    },
    glitch() {
      noise({ type: 'bandpass', f: 1200 + Math.random() * 3000, q: 2, dur: 0.07, vol: 0.12 });
      noise({ type: 'bandpass', f: 600 + Math.random() * 2000, q: 3, dur: 0.05, vol: 0.09, delay: 0.09 });
      tone({ f: 200 + Math.random() * 900, type: 'square', dur: 0.04, vol: 0.03, delay: 0.04, lp: 3000 });
    },
    alarm() {
      [0, 0.32].forEach((d) => {
        tone({ f: 880, type: 'square', dur: 0.12, vol: 0.05, lp: 3000, delay: d });
        tone({ f: 660, type: 'square', dur: 0.14, vol: 0.05, lp: 3000, delay: d + 0.15 });
      });
    },
    thud() {
      tone({ f: 160, f2: 36, dur: 0.5, vol: 0.55 });
      noise({ type: 'lowpass', f: 1100, dur: 0.16, vol: 0.28 });
      noise({ type: 'bandpass', f: 2400, q: 1, dur: 0.05, vol: 0.06, delay: 0.01 });
    },
    whoosh() { noise({ type: 'bandpass', f: 280, f2: 3800, q: 0.8, dur: 0.5, vol: 0.11, a: 0.18 }); },
    shutter() {
      noise({ type: 'bandpass', f: 1800, q: 2, dur: 0.04, vol: 0.12 });
      tone({ f: 70, f2: 45, dur: 0.15, vol: 0.2, delay: 0.02 });
      noise({ type: 'bandpass', f: 2600, q: 2, dur: 0.035, vol: 0.09, delay: 0.12 });
    },
    powerOn() {
      tone({ f: 42, f2: 120, type: 'sawtooth', dur: 1.1, vol: 0.09, lp: 380, a: 0.2 });
      tone({ f: 220, f2: 440, type: 'triangle', dur: 0.7, vol: 0.04, delay: 0.25 });
      [0, 1, 2, 3, 4].forEach((i) => tone({ f: 700 + i * 180, dur: 0.05, vol: 0.03, delay: 0.5 + i * 0.07 }));
    },
    granted() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.55, vol: 0.06, delay: i * 0.06, a: 0.01 }));
      noise({ type: 'highpass', f: 6000, dur: 0.5, vol: 0.02, a: 0.1 });
    },
    denied() { tone({ f: 220, type: 'square', dur: 0.14, vol: 0.05, lp: 1400 }); tone({ f: 165, type: 'square', dur: 0.2, vol: 0.05, lp: 1400, delay: 0.16 }); },
    success() {
      [659.25, 987.77, 1318.5].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.4, vol: 0.06, delay: i * 0.08 }));
    },
    match() {
      [880, 1108.73, 1318.5, 1760].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.9, vol: 0.055, delay: i * 0.05, a: 0.01 }));
      tone({ f: 110, f2: 55, dur: 0.6, vol: 0.2 });
      noise({ type: 'highpass', f: 7000, dur: 0.9, vol: 0.025, a: 0.2 });
    },
    stampPrep() { noise({ type: 'bandpass', f: 500, f2: 1800, q: 1, dur: 0.18, vol: 0.06, a: 0.12 }); }
  };

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ignoré */ }
    if (ok()) out.gain.setTargetAtTime(muted ? 0 : VOL, t0(), 0.05);
  }

  /* le terminal fermé ne doit plus rien jouer (NUI FiveM masqué) */
  function pause() { if (ok() && ctx.state === 'running') ctx.suspend(); }
  function resume() { if (ok() && ctx.state === 'suspended') ctx.resume(); }

  return Object.assign({ init, ambient, suction, motor, scanner, setMuted, pause, resume, isMuted: () => muted, ready: ok }, fx);
})();
