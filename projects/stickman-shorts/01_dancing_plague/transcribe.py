import sys, json
from faster_whisper import WhisperModel
m = WhisperModel("medium", device="cpu", compute_type="int8")
for f in sys.argv[1:]:
    import numpy as np, soundfile as sf
    a, sr = sf.read(f.rsplit(".",1)[0]+".wav", dtype="float32")
    segs, info = m.transcribe(a, language="ru", word_timestamps=True, beam_size=5)
    words = []
    for s in segs:
        for w in s.words:
            words.append(dict(w=w.word.strip(), s=round(w.start, 3), e=round(w.end, 3), p=round(w.probability, 2)))
    json.dump(words, open(f.rsplit('.', 1)[0] + ".words.json", "w"), ensure_ascii=False, indent=0)
    print(f, len(words), "words;", " ".join(x["w"] for x in words))
