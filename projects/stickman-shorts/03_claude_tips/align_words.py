#!/usr/bin/env python3
"""Put the script's exact words onto whisper word timings -> voice.words.json [{w,s,e}].
usage: align_words.py script.txt whisper.words.json out.json"""
import json, re, sys, difflib

def norm(t):
    return re.sub(r'[^0-9a-zа-я]', '', t.lower().replace('ё', 'е'))

script = [t for t in open(sys.argv[1]).read().split() if norm(t)]
wh = [w for w in json.load(open(sys.argv[2])) if norm(w['w'])]
a, b = [norm(t) for t in script], [norm(w['w']) for w in wh]
out = [None] * len(script)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
    if tag == 'equal':
        for k in range(i2 - i1): out[i1 + k] = (wh[j1 + k]['s'], wh[j1 + k]['e'])
    elif j2 > j1:  # spread the whisper span evenly over the script words
        s, e = wh[j1]['s'], wh[j2 - 1]['e']; n = i2 - i1
        for k in range(n): out[i1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
for k in range(len(out)):  # words whisper dropped: borrow neighbours
    if out[k] is None:
        p = out[k - 1][1] if k else 0.0
        nx = next((o[0] for o in out[k + 1:] if o), p + 0.3)
        out[k] = (p, max(p + 0.05, nx))
json.dump([{'w': t, 's': round(s, 3), 'e': round(e, 3)} for t, (s, e) in zip(script, out)],
          open(sys.argv[3], 'w'), ensure_ascii=False)
print(len(script), 'words aligned')
