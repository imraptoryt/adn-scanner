"""Generate a laser weapon sound set for GTA V / FiveM (one distinct sound per weapon).

Usage:  python3 generate.py            -> writes wav/<weapon>.wav (+ _v2/_v3 variations)
Needs:  numpy
"""
import os
import wave

import numpy as np

SR = 32000  # GTA V weapon audio is 32 kHz mono
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wav")

# f0 -> f1: pitch sweep (Hz) · dur: seconds · saw/sq: waveform mix (rest is sine)
# fm: (rate Hz, depth) wobble · noise: attack noise burst · sub: low thump Hz (0 = none)
# layers/detune: stacked voices · echo: (delay s, feedback) · ring: ring-mod Hz · bits: bitcrush
WEAPONS = {
    # --- pistols ---------------------------------------------------------
    "pistol":          dict(f0=2400, f1=380,  dur=0.22, saw=0.3, sq=0.0, fm=(0, 0),     noise=0.25, sub=0,   echo=(0.07, 0.25)),
    "combat_pistol":   dict(f0=3000, f1=520,  dur=0.18, saw=0.5, sq=0.0, fm=(0, 0),     noise=0.30, sub=0,   echo=(0.06, 0.25)),
    "ap_pistol":       dict(f0=3600, f1=900,  dur=0.10, saw=0.0, sq=0.5, fm=(0, 0),     noise=0.20, sub=0,   echo=(0.04, 0.20)),
    "pistol50":        dict(f0=1800, f1=160,  dur=0.30, saw=0.6, sq=0.0, fm=(0, 0),     noise=0.40, sub=70,  echo=(0.09, 0.30)),
    "heavy_pistol":    dict(f0=2000, f1=220,  dur=0.26, saw=0.4, sq=0.3, fm=(0, 0),     noise=0.35, sub=60,  echo=(0.08, 0.30)),
    "sns_pistol":      dict(f0=4200, f1=1200, dur=0.12, saw=0.0, sq=0.0, fm=(0, 0),     noise=0.15, sub=0,   echo=(0.05, 0.15)),
    "vintage_pistol":  dict(f0=2600, f1=600,  dur=0.20, saw=0.0, sq=0.0, fm=(45, 0.12), noise=0.20, sub=0,   echo=(0.10, 0.35)),
    "revolver":        dict(f0=1500, f1=90,   dur=0.45, saw=0.7, sq=0.0, fm=(0, 0),     noise=0.50, sub=55,  echo=(0.12, 0.40)),
    "pistol_mk2":      dict(f0=2800, f1=420,  dur=0.20, saw=0.3, sq=0.2, fm=(0, 0),     noise=0.25, sub=0,   echo=(0.07, 0.25), ring=900),
    "ceramic_pistol":  dict(f0=5000, f1=1600, dur=0.14, saw=0.0, sq=0.0, fm=(80, 0.05), noise=0.10, sub=0,   echo=(0.05, 0.20)),
    "flare_gun":       dict(f0=500,  f1=2500, dur=0.35, saw=0.2, sq=0.0, fm=(30, 0.10), noise=0.30, sub=0,   echo=(0.10, 0.30)),
    # --- SMGs ------------------------------------------------------------
    "micro_smg":       dict(f0=3800, f1=1400, dur=0.07, saw=0.0, sq=0.6, fm=(0, 0),     noise=0.15, sub=0,   echo=(0, 0), bits=6),
    "smg":             dict(f0=3200, f1=900,  dur=0.08, saw=0.5, sq=0.0, fm=(0, 0),     noise=0.20, sub=0,   echo=(0, 0)),
    "assault_smg":     dict(f0=2900, f1=700,  dur=0.09, saw=0.3, sq=0.3, fm=(0, 0),     noise=0.20, sub=0,   echo=(0, 0), ring=1300),
    "combat_pdw":      dict(f0=3400, f1=1100, dur=0.08, saw=0.0, sq=0.0, fm=(120, 0.06),noise=0.15, sub=0,   echo=(0, 0), layers=2, detune=0.03),
    "machine_pistol":  dict(f0=4400, f1=1800, dur=0.06, saw=0.0, sq=0.4, fm=(0, 0),     noise=0.10, sub=0,   echo=(0, 0), bits=5),
    "mini_smg":        dict(f0=5200, f1=2200, dur=0.06, saw=0.2, sq=0.0, fm=(0, 0),     noise=0.10, sub=0,   echo=(0, 0)),
    # --- rifles ----------------------------------------------------------
    "assault_rifle":   dict(f0=2600, f1=300,  dur=0.13, saw=0.6, sq=0.0, fm=(0, 0),     noise=0.30, sub=65,  echo=(0, 0)),
    "carbine_rifle":   dict(f0=3000, f1=450,  dur=0.12, saw=0.4, sq=0.2, fm=(0, 0),     noise=0.25, sub=60,  echo=(0, 0), layers=2, detune=0.02),
    "advanced_rifle":  dict(f0=3500, f1=600,  dur=0.11, saw=0.0, sq=0.5, fm=(90, 0.08), noise=0.20, sub=0,   echo=(0, 0)),
    "special_carbine": dict(f0=2800, f1=350,  dur=0.12, saw=0.5, sq=0.0, fm=(0, 0),     noise=0.25, sub=70,  echo=(0, 0), ring=600),
    "bullpup_rifle":   dict(f0=3300, f1=500,  dur=0.11, saw=0.3, sq=0.0, fm=(0, 0),     noise=0.25, sub=0,   echo=(0, 0), layers=3, detune=0.015),
    "compact_rifle":   dict(f0=2400, f1=420,  dur=0.11, saw=0.0, sq=0.6, fm=(0, 0),     noise=0.30, sub=60,  echo=(0, 0), bits=7),
    "military_rifle":  dict(f0=2200, f1=260,  dur=0.14, saw=0.7, sq=0.0, fm=(0, 0),     noise=0.35, sub=55,  echo=(0, 0), layers=2, detune=0.04),
    # --- machine guns ----------------------------------------------------
    "mg":              dict(f0=1900, f1=240,  dur=0.12, saw=0.6, sq=0.2, fm=(0, 0),     noise=0.35, sub=60,  echo=(0, 0)),
    "combat_mg":       dict(f0=2100, f1=200,  dur=0.12, saw=0.4, sq=0.4, fm=(0, 0),     noise=0.35, sub=50,  echo=(0, 0), layers=2, detune=0.05),
    "gusenberg":       dict(f0=1600, f1=380,  dur=0.10, saw=0.0, sq=0.0, fm=(60, 0.15), noise=0.25, sub=0,   echo=(0, 0)),
    "minigun":         dict(f0=4000, f1=2000, dur=0.05, saw=0.0, sq=0.3, fm=(0, 0),     noise=0.10, sub=0,   echo=(0, 0), ring=2400),
    # --- shotguns --------------------------------------------------------
    "pump_shotgun":    dict(f0=1400, f1=110,  dur=0.40, saw=0.6, sq=0.0, fm=(0, 0),     noise=0.60, sub=50,  echo=(0.10, 0.30), layers=5, detune=0.08),
    "sawnoff_shotgun": dict(f0=1200, f1=90,   dur=0.38, saw=0.3, sq=0.4, fm=(0, 0),     noise=0.70, sub=45,  echo=(0.08, 0.30), layers=4, detune=0.12, bits=6),
    "assault_shotgun": dict(f0=1700, f1=180,  dur=0.20, saw=0.5, sq=0.0, fm=(0, 0),     noise=0.55, sub=55,  echo=(0, 0),       layers=4, detune=0.07),
    "bullpup_shotgun": dict(f0=2000, f1=220,  dur=0.30, saw=0.0, sq=0.5, fm=(0, 0),     noise=0.50, sub=50,  echo=(0.09, 0.25), layers=5, detune=0.06),
    "heavy_shotgun":   dict(f0=1100, f1=70,   dur=0.45, saw=0.8, sq=0.0, fm=(0, 0),     noise=0.60, sub=40,  echo=(0.12, 0.35), layers=6, detune=0.10),
    "double_barrel":   dict(f0=1300, f1=80,   dur=0.42, saw=0.5, sq=0.0, fm=(25, 0.10), noise=0.65, sub=45,  echo=(0.11, 0.35), layers=6, detune=0.14),
    # --- snipers ---------------------------------------------------------
    "sniper_rifle":    dict(f0=6000, f1=120,  dur=0.70, saw=0.4, sq=0.0, fm=(0, 0),     noise=0.40, sub=45,  echo=(0.18, 0.45)),
    "heavy_sniper":    dict(f0=5000, f1=60,   dur=0.90, saw=0.7, sq=0.0, fm=(0, 0),     noise=0.50, sub=35,  echo=(0.22, 0.50), layers=2, detune=0.01),
    "marksman_rifle":  dict(f0=5500, f1=200,  dur=0.50, saw=0.2, sq=0.2, fm=(0, 0),     noise=0.35, sub=50,  echo=(0.15, 0.40), ring=500),
    # --- heavy -----------------------------------------------------------
    "railgun":         dict(f0=200,  f1=40,   dur=1.20, saw=0.5, sq=0.3, fm=(15, 0.30), noise=0.50, sub=35,  echo=(0.25, 0.50), layers=3, detune=0.02),
}


def synth(p, rng):
    n = int(SR * p["dur"])
    t = np.arange(n) / SR
    x = t / p["dur"]
    # exponential sweep f0 -> f1, optional FM wobble
    freq = p["f0"] * (p["f1"] / p["f0"]) ** (x ** 0.6)
    rate, depth = p.get("fm", (0, 0))
    if rate:
        freq = freq * (1 + depth * np.sin(2 * np.pi * rate * t))
    out = np.zeros(n)
    layers = p.get("layers", 1)
    for i in range(layers):
        d = 1 + (p.get("detune", 0) * (i - (layers - 1) / 2)) + rng.uniform(-0.004, 0.004)
        ph = 2 * np.pi * np.cumsum(freq * d) / SR + rng.uniform(0, 2 * np.pi)
        frac = (ph / (2 * np.pi)) % 1.0
        sine = np.sin(ph)
        saw = 2 * frac - 1
        sq = np.sign(sine)
        w_saw, w_sq = p.get("saw", 0), p.get("sq", 0)
        out += (1 - w_saw - w_sq) * sine + w_saw * saw + w_sq * sq
    out /= layers
    if p.get("ring"):
        out *= 0.6 + 0.4 * np.sin(2 * np.pi * p["ring"] * t)
    # amplitude envelope: 2 ms attack, curved decay
    env = np.minimum(1, t / 0.002) * (1 - x) ** 1.8
    out *= env
    # attack noise burst (the "zap")
    burst_n = min(n, int(SR * 0.025))
    noise = rng.uniform(-1, 1, burst_n) * np.linspace(1, 0, burst_n) ** 2
    noise = np.convolve(noise, [0.5, -0.5], mode="same")  # high-passed
    out[:burst_n] += p.get("noise", 0) * noise
    # low thump for heavy weapons
    if p.get("sub"):
        sub_n = min(n, int(SR * 0.12))
        ts = t[:sub_n]
        out[:sub_n] += 0.7 * np.sin(2 * np.pi * p["sub"] * ts * (1 - 0.5 * ts / 0.12)) * (1 - ts / 0.12) ** 2
    # soften naive saw/square aliasing (~8 kHz low-pass)
    out = np.convolve(out, [0.25, 0.5, 0.25], mode="same")
    if p.get("bits"):
        q = 2 ** (p["bits"] - 1)
        out = np.round(out * q) / q
    # echo tail
    delay, fb = p.get("echo", (0, 0))
    if delay:
        d = int(SR * delay)
        out = np.concatenate([out, np.zeros(d * 4)])
        for k in range(d, len(out)):
            out[k] += fb * out[k - d]
    # fade the last 5 ms, normalise to -1 dBFS
    f = min(len(out), int(SR * 0.005))
    out[-f:] *= np.linspace(1, 0, f)
    return out / (np.max(np.abs(out)) + 1e-9) * 0.89


def write_wav(path, data):
    pcm = (np.clip(data, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, p in WEAPONS.items():
        seed = sum(map(ord, name))
        write_wav(os.path.join(OUT, f"{name}.wav"), synth(p, np.random.default_rng(seed)))
        # two slightly pitched variations, for weapons that use several shot variations
        for v, shift in ((2, 0.96), (3, 1.04)):
            q = dict(p, f0=p["f0"] * shift, f1=p["f1"] * shift)
            write_wav(os.path.join(OUT, f"{name}_v{v}.wav"), synth(q, np.random.default_rng(seed + v)))
    print(f"{len(WEAPONS)} weapons -> {OUT}")


if __name__ == "__main__":
    main()
