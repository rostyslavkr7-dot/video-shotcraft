# Stickstruck: stickman shorts

Vertical shorts (9:16, ~60–68 s) with flat 2D stick figures in a 3D world: narration, word-by-word
captions, music, SFX. Channel: **Stickstruck (@thestickstruck)**, English-first (creator is in Germany,
the audience is US/UK). The first videos were made in Russian; English versions reuse the same clips.

## Start of every session
```sh
sh projects/stickman-shorts/restore.sh   # rebuilds /home/user/shorts, installs ffmpeg + python deps
```
The scripts use hard-coded paths under `/home/user/shorts`. **This repo is the only durable copy**:
the container is ephemeral, so anything new (scripts, clips, voices, timelines) must be copied back
here and committed on the session branch before the session ends.

## Layout (repo → /home/user/shorts)
| Repo | Restored to | What |
|---|---|---|
| `analysis/` | `shorts/` | Style breakdown of 15 reference channels (`REPORT.md`), transcripts, metrics |
| `01_dancing_plague/` | `dancing_plague/` | RU: Dancing Plague 1518 (own JS engine in `engine/`, plus AI clips in `ai/clips`) |
| `02_poslednij_rolik/` | `new_topic/` | RU: "The Last Video" |
| `03_claude_tips/` | `claude_tips/` | RU: AI Roommates ep1 "New Chat" (clips `clips_v2/C01–C10`) |
| `04_claude_projects/` | `claude_tips/ep2/` | RU: AI Roommates ep2 "Projects" (clips `clips_v2/E01–E10`) |
| `en/ep{1,2}_*` | `claude_tips/en/ep{1,2}/` | EN timeline, voice, word timings for ep1/ep2 |
| `en/dancing_plague`, `en/last_video` | `en_more/{dancing,lastvideo}/` | EN versions of the two stories |
| `channel/` | `claude_tips/channel/` | Branding: `channel_kit_en.md`, `youtube_posts.md`, banner, avatars |

## Render pipeline (inside one episode folder)
```sh
python3 frames50.py          # clips_v2/<id>.mp4 -> frames50/<id>/ at 50 fps, fitted to timeline.json
python3 mix.py               # voice + ducked music + SFX -> out/mix.wav (48 kHz)
sh final50.sh <name>         # compose_fx.py (captions, transitions) + mux -> out/<name>_50fps.mp4
```
- `timeline.json`: shots (id, start, end) + `handle`, `end`, `fps`. `assets/voice.words.json`: `[{w,s,e}]`.
- Word timings: faster-whisper, then `03_claude_tips/align_words.py` snaps the exact script words onto them.
- Font: Rubik. Encoding: libx264 crf 20, 50 fps, AAC 192k.

## Production recipe (what worked)
- **Story formula:** strange act → stakes → mocking friend → rival does it "the normal way" → payoff
  shown on screen → "See, …" + everyday analogy → ironic ending. Videos must be **> 60 s** (TikTok Creator Rewards).
- **Stills:** ElevenLabs creative flow, `bytedance-seedream-5-lite`, aspect 9:16, 2K, with the MASTER
  character reference (gen `dpIP3D1GlFlapoxikwPh`), ~212 credits/frame. Seedream is weak on light:
  push lighting and emotion explicitly in prompts. Flow/gen IDs are in each episode's `elevenlabs.md`.
- **Animation (chosen because it is cheapest):** LTX-2 Fast (`ltx-v2-fast`) from the still as start frame,
  50 fps, 1080p, audio off, `duration_secs` 6, 8 or 10 (50 fps caps LTX at 10 s; longer needs 25 fps).
  Kling only for 1–2 key shots where LTX breaks the character (ep1: C02 on Kling, 5 s, 24 fps).
  Each shot in `timeline.json` records `model` (`ltx`/`kling`) and `gen_secs`.
  Seedance 2.5 Flash was tried and rejected: not smooth and pricier (~852 credits/s).
  Budget: ~15–17k credits for a one-minute video (stills + clips + voice). Confirm the clip batch cost before running.
  Prices measured 23.11.2026: LTX-2 Fast ~242 credits/s (same at 25 and 50 fps), Kling 2.6 Pro 5 s = ~2,121.
  Keep `gen_secs` tight (frames50.py slows a short clip with interpolation), it is the main cost lever.
- Dancing Plague 1518 and The Last Video clips came from an older ElevenLabs account; the model wasn't recorded.
  24 fps and durations of exactly 4/6/8 s suggest Google Veo, but that is a guess from the files.
- **Voice (EN, the channel voice, use for every new English video):** ElevenLabs "Warm, Grounded
  Storyteller" `MFZUKuGQUsGJPQjTS4wC`, eleven_v4, ~1 credit/character (~700–1,000 per video).
  Used on all four English videos. After generation, cut pauses and speed up slightly (same filter as below).
- **Voice (RU, old versions):** ElevenLabs "Stanislav" `ogi2DyUAKJb7CEdqqvlU`, eleven_v4; then
  `silenceremove stop_duration=0.25 stop_threshold=-38dB stop_silence=0.22, atempo=1.12`.
- Generations spend the user's credits: confirm before batches, never re-run a call to "retry".

## Publishing
- Titles, descriptions, tags for every video: `channel/youtube_posts.md`. Channel, bio, monetization: `channel/channel_kit_en.md`.
- Settings: Education, Altered/synthetic content = Yes, not for kids. Playlists: Weird History, AI Roommates.
- One video a day, 14:00–16:00 Berlin. TikTok must stay a personal account (Creator Rewards).

## Status (22.11.2026)
- Dancing Plague 1518 (EN): uploaded, scheduled for 23.11.2026 15:00 Berlin.
- The Last Video, AI Roommates ep1, ep2 (EN): copy ready, not yet uploaded.
- Open: brand avatar/logo (the current avatar shows the AI-series hero); next episodes (AI Roommates ep3,
  Weird History topics from `analysis/REPORT.md`).
