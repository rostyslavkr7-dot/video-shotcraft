import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { AIFL_SHOTS, CAPTIONS, TITLE_CARDS, parseWords, AiflMain } from '../aifl/Main';
import { PaperTitleCard } from '../aifl/PaperTitleCard';
import { resolveTheme, VisualThemeProvider, useVisualTheme, themePaint } from '../themes/visual-theme';

/**
 * 9:16 cut of the template film for TikTok / Instagram Reels / YouTube Shorts.
 *
 * The 16:9 film keeps playing untouched (same timing, SFX, flash cuts) inside a
 * framed window in the middle of a 1080×1920 canvas; each live shot gets its own
 * crop (`VERTICAL_FRAMING`) so the UI stays legible on a phone. Title cards are
 * re-set natively for the tall frame, and the narration captions move from the
 * bottom strip into a large headline band above the window, out of the zone the
 * TikTok / Reels UI covers (right rail, caption text and buttons at the bottom).
 */

export const VERTICAL_W = 1080;
export const VERTICAL_H = 1920;

/** Layout of the tall canvas (px). Safe zones: keep text out of the top ~140px
 * and the bottom ~420px, where the platform overlays its own UI. */
export const VERTICAL_LAYOUT = {
  windowTop: 640,     // film window top edge
  windowH: 810,       // film window height (window width is always 1080)
  headlineTop: 250,   // headline band (captions / hook) top
  headlineH: 340,     // headline band height
  titleFontSize: 104, // full-screen title cards
  captionFontSize: 54,
};

/** Per-shot crop of the 16:9 film inside the window. `scale` is applied to the
 * 1920×1080 frame (0.75 fills the 810px window height exactly; 0.5625 shows the
 * whole width), `cx`/`cy` are the focal point as 0–1 fractions of the 16:9 frame.
 * A shot can also take a list of keys (`at` = frames from the shot start) to
 * reframe inside the shot, e.g. wide on a wordmark, then in on a UI card.
 * Re-tune these when the template's shots are re-cut for a new product. */
type Framing = { scale: number; cx: number; cy: number };
type FramingKey = Framing & { at: number };
export const VERTICAL_FRAMING: Record<keyof typeof AIFL_SHOTS, Framing | FramingKey[]> = {
  morning: [                                   // wordmark wide → dashboard → hero card close
    { at: 0, scale: 0.8, cx: 0.5, cy: 0.5 },
    { at: 96, scale: 0.8, cx: 0.5, cy: 0.5 },
    { at: 122, scale: 1.0, cx: 0.55, cy: 0.5 },
  ],
  card1: { scale: 0.75, cx: 0.5, cy: 0.5 },    // (title cards are re-set full-frame)
  table: { scale: 1.2, cx: 0.52, cy: 0.45 },   // deal → grid → search
  macro: { scale: 0.95, cx: 0.46, cy: 0.45 },  // detail rows
  card2: { scale: 0.75, cx: 0.5, cy: 0.5 },
  chart: { scale: 0.85, cx: 0.5, cy: 0.5 },    // paper radar
  cardWbr: { scale: 0.75, cx: 0.5, cy: 0.5 },
  wbr: { scale: 1.15, cx: 0.5, cy: 0.4 },      // weekly brief writing itself
  card3: { scale: 0.75, cx: 0.5, cy: 0.5 },
  outro: { scale: 0.78, cx: 0.5, cy: 0.5 },    // letterpress sign-off: keep the wordmark whole
};

const framingAt = (frame: number): Framing => {
  const key = shotAt(frame);
  const f = VERTICAL_FRAMING[key];
  if (!Array.isArray(f)) return f;
  const local = frame - AIFL_SHOTS[key].from;
  const ats = f.map((k) => k.at);
  const opts = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.2, 1) } as const;
  const pick = (p: keyof Framing) => (f.length === 1 ? f[0][p] : interpolate(local, ats, f.map((k) => k[p]), opts));
  return { scale: pick('scale'), cx: pick('cx'), cy: pick('cy') };
};

/** Hook line shown in the headline band over the brand open, before the first
 * caption: short feeds are decided in the first ~2 seconds. */
export const VERTICAL_HOOK = { from: 0, text: 'All your team’s research, *one* place to go.' };

const TITLE_KEYS = ['card1', 'card2', 'cardWbr', 'card3'] as const;
type ShotKey = keyof typeof AIFL_SHOTS;
const SHOT_KEYS = Object.keys(AIFL_SHOTS) as ShotKey[];

const shotAt = (frame: number): ShotKey =>
  SHOT_KEYS.find((k) => frame >= AIFL_SHOTS[k].from && frame < AIFL_SHOTS[k].from + AIFL_SHOTS[k].duration) ??
  'outro';

/** Headline-band entries: the hook, then each caption held until the next caption
 * or the next title card / outro, so the band never flickers empty between them. */
const breaks = [...TITLE_KEYS.map((k) => AIFL_SHOTS[k].from), AIFL_SHOTS.outro.from];
const firstCaption = CAPTIONS[0].from;
export const VERTICAL_HEADLINES = [
  { from: VERTICAL_HOOK.from, to: Math.min(firstCaption, ...breaks.filter((b) => b > VERTICAL_HOOK.from)), text: VERTICAL_HOOK.text },
  ...CAPTIONS.map((c, i) => {
    const next = CAPTIONS[i + 1]?.from ?? Infinity;
    const nextBreak = Math.min(...breaks.filter((b) => b > c.from));
    return { from: c.from, to: Math.min(next, nextBreak), text: c.text as string };
  }),
];

const Headline: React.FC<{ text: string; duration: number }> = ({ text, duration }) => {
  const theme = useVisualTheme();
  const paperStyle = theme.id === 'ink-press';
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.75, 0.3, 1),
  });
  const out = interpolate(frame, [duration - 6, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ink = paperStyle ? '#13110f' : theme.text;
  const accent = paperStyle ? '#955905' : theme.accent;
  const SERIF = paperStyle ? 'ui-serif, Georgia, "Times New Roman", serif' : theme.font;
  // captions are all-caps strips in 16:9; on a phone they read better as a
  // sentence-case headline, with `*word*` accents like the title cards
  const words = parseWords(text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text);
  return (
    <div
      style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 80px', opacity: t * out, transform: `translateY(${(1 - t) * 18}px)`,
      }}
    >
      <div
        style={{
          fontFamily: SERIF, fontWeight: 600, fontSize: VERTICAL_LAYOUT.captionFontSize * 1.3, lineHeight: 1.12,
          letterSpacing: '-0.01em', color: ink, textAlign: 'center',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.26em',
        }}
      >
        {words.map((w, i) => (
          <span key={i} style={{ color: w.accent ? accent : undefined, fontStyle: paperStyle && w.accent ? 'italic' : 'normal' }}>
            {w.text}
          </span>
        ))}
      </div>
    </div>
  );
};

const VerticalStage: React.FC = () => {
  const theme = useVisualTheme();
  const paint = (css: string) => themePaint(theme, css);
  const frame = useCurrentFrame();
  const { windowTop, windowH, headlineTop, headlineH, titleFontSize } = VERTICAL_LAYOUT;
  const f = framingAt(frame);
  // place the focal point at the window centre, then clamp so the 16:9 frame
  // always covers the whole window (no empty edges)
  const fw = 1920 * f.scale;
  const fh = 1080 * f.scale;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const x = fw <= VERTICAL_W ? (VERTICAL_W - fw) / 2 : clamp(VERTICAL_W / 2 - f.cx * fw, VERTICAL_W - fw, 0);
  const y = fh <= windowH ? (windowH - fh) / 2 : clamp(windowH / 2 - f.cy * fh, windowH - fh, 0);

  return (
    <AbsoluteFill style={{ backgroundColor: paint('#f2eee6') }}>
      {/* film window */}
      <div style={{ position: 'absolute', left: 0, top: windowTop, width: VERTICAL_W, height: windowH, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: x, top: y, width: 1920, height: 1080, transform: `scale(${f.scale})`, transformOrigin: '0 0' }}>
          <AiflMain captions={false} />
        </div>
      </div>
      {/* headline band: hook, then the narration captions */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: headlineTop, height: headlineH }}>
        {VERTICAL_HEADLINES.map((h) => (
          <Sequence key={h.from} from={h.from} durationInFrames={h.to - h.from} layout="none">
            <Headline text={h.text} duration={h.to - h.from} />
          </Sequence>
        ))}
      </div>
      {/* title cards, re-set full-frame for the tall canvas */}
      {TITLE_KEYS.map((k) => {
        const card = TITLE_CARDS[k] as { text: string; sub?: string; subDigits?: string };
        return (
          <Sequence key={k} from={AIFL_SHOTS[k].from} durationInFrames={AIFL_SHOTS[k].duration}>
            <PaperTitleCard
                duration={AIFL_SHOTS[k].duration}
                words={parseWords(card.text)}
                sub={card.sub}
                subDigits={card.subDigits}
                fontSize={titleFontSize}
                maxWidth={VERTICAL_W - 140}
              />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const VerticalFilm: React.FC<{ theme?: string; colors?: Record<string, string> }> = ({ theme, colors }) => {
  const selected = resolveTheme(theme);
  return (
    <VisualThemeProvider theme={selected.id} colors={colors}>
      <VerticalStage />
    </VisualThemeProvider>
  );
};
