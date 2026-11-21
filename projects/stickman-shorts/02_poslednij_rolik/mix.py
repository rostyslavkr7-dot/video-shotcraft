#!/usr/bin/env python3
"""Audio mix: narration + music (ducked) + SFX, 48 kHz stereo -> out/mix.wav"""
import json, os, subprocess, numpy as np
ROOT = os.path.dirname(os.path.abspath(__file__))
A = f'{ROOT}/assets'; SR = 48000
TL = json.load(open(f'{ROOT}/timeline.json')); END = TL['end']
N = int(END * SR)

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
def db(x): return 10 ** (x / 20)
def place(bus, clip, t, gain_db=0.0, fade_in=0.0, fade_out=0.0):
    c = clip * db(gain_db)
    if fade_in: k = min(len(c), int(fade_in * SR)); c[:k] *= np.linspace(0, 1, k)[:, None]
    if fade_out: k = min(len(c), int(fade_out * SR)); c[-k:] *= np.linspace(1, 0, k)[:, None]
    i = int(t * SR)
    if i < 0: c = c[-i:]; i = 0
    n = min(len(c), N - i)
    if n > 0: bus[i:i + n] += c[:n]

voice = np.zeros((N, 2), np.float32); music = np.zeros_like(voice); sfx = np.zeros_like(voice)
place(voice, load(f'{A}/voice.mp3'), 0.0, 0.0)

m = load(f'{A}/music.mp3')
place(music, m, 0.0, 0, fade_in=0.3, fade_out=1.5)
# synthesized whoosh for whip pans / dissolves
rng = np.random.default_rng(3)
def whoosh(dur=0.5, bright=1.0):
    n = int(dur * SR); x = rng.standard_normal(n).astype(np.float32)
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    y = np.zeros(n, np.float32); s = 0.0
    for j in range(n):  # one-pole lowpass sweeping open then closed
        c = 0.02 + 0.25 * bright * env[j]; s += c * (x[j] - s); y[j] = s
    y = y / (np.abs(y).max() + 1e-6) * env
    return np.stack([y * 0.9, y], 1)
def hum(dur=1.6, f=110.0):
    t = np.arange(int(dur * SR)) / SR; env = np.minimum(1, t / 0.4) * np.exp(-np.maximum(0, t - 0.6) * 2)
    y = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.01 * t) + 0.25 * np.sin(2 * np.pi * f * 3.02 * t)) * env * 0.4
    return np.stack([y, y], 1).astype(np.float32)

for s in TL['shots']:
    if s['out'] == 'whip': place(sfx, whoosh(0.45, 1.0), s['end'] - 0.25, -8)
    if s['out'] == 'dissolve': place(sfx, whoosh(0.7, 0.4), s['end'] - 0.35, -20)
    if s['out'] == 'flash': place(sfx, whoosh(0.9, 1.2), s['end'] - 0.5, -6)
place(sfx, hum(1.2, 70), 17.9, -14)
place(sfx, whoosh(1.0, 1.4), 30.6, -10)
# extra sfx for visual effects
def hit(dur=0.35, f0=90.0):
    t = np.arange(int(dur * SR)) / SR
    y = np.sin(2 * np.pi * f0 * t * (1 - 0.5 * t / dur)) * np.exp(-t * 14) * 0.9
    y += rng.standard_normal(len(t)) * np.exp(-t * 40) * 0.25
    return np.stack([y, y], 1).astype(np.float32)
_w = json.load(open(f'{A}/voice.words.json'))
for w in _w:
    if w['w'] in ['разбогатеть.', '9', '102', '9.', 'Лёшу.', 'заработал.', 'Забудь', 'правду.', 'замолкал.', 'Миллион', 'сдался.', 'снимает.']:
        place(sfx, hit(), w['s'] - 0.01, -15)

# sidechain-style ducking of music under the voice
env = np.abs(voice).max(1); w = int(0.05 * SR)
env = np.convolve(env, np.ones(w) / w, 'same'); env = np.maximum.accumulate(env[::-1])[::-1] * 0 + env
lvl = np.clip(env / 0.08, 0, 1)
sm = np.zeros_like(lvl); a_up, a_dn = 1 - np.exp(-1 / (0.03 * SR)), 1 - np.exp(-1 / (0.35 * SR)); s = 0.0
for j in range(0, N, 64):
    tgt = lvl[j]; s += (a_up if tgt > s else a_dn * 64 / 64) * (tgt - s) * 64; s = min(max(s, 0), 1); sm[j:j + 64] = s
duck = db(-14) * (1 - sm) + db(-24) * sm
mix = voice * db(0) + music * duck[:, None] + sfx
peak = np.abs(mix).max(); mix = mix / max(1.0, peak / 0.95)
os.makedirs(f'{ROOT}/out', exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11', '-ar', str(SR), f'{ROOT}/out/mix.wav'], input=mix.astype(np.float32).tobytes())
print('mix ok, peak', peak)
