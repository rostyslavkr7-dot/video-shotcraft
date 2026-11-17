import {
  AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import { Bottle } from './Bottle';

/**
 * 9:16 product short (TikTok / Instagram Reels), ~18s. Physical-product variant
 * of the template: no page captures, the product sits centre stage and copy
 * builds around it. All copy lives in SERUM_COPY (German by default).
 *
 * Compliance notes baked into the defaults (see TEMPLATE.md §7):
 * - cosmetic wording only (care, look, ingredients) — no "stops hair loss" /
 *   drug comparisons, which EU cosmetics rules and TikTok/Meta ad policies reject;
 * - affiliate content is labelled "Werbung" for the whole runtime, plus the
 *   Amazon Associates disclosure on the end card;
 * - the rating carries a "Stand" date because it changes.
 */

export const SERUM_W = 1080;
export const SERUM_H = 1920;
export const SERUM_FPS = 30;

export const SERUM_SCENES = {
  hook: { from: 0, duration: 84 },
  ingredients: { from: 84, duration: 126 },
  apply: { from: 210, duration: 105 },
  badges: { from: 315, duration: 105 },
  outro: { from: 420, duration: 120 },
} as const;
export const SERUM_TOTAL = 540;

export const SERUM_COPY = {
  adLabel: 'Werbung',
  hook: ['Haare wirken *dünner?*', 'Mein 2-Minuten-Ritual für die Kopfhaut.'],
  ingredientsTitle: 'Was *drin* ist',
  ingredients: ['5 % Biotin', 'Ginseng', 'Rosmarin', 'Kollagen', 'Vitamin B6'],
  applyTitle: 'So *nutze* ich es',
  applyLines: ['2× täglich auf die Kopfhaut', 'zieht schnell ein · fettet nicht'],
  badgesTitle: 'Darauf *achte* ich',
  badges: ['Vegan', 'Ohne Parabene', 'Ohne Silikone', 'Glasflasche, recycelbar'],
  brand: 'Leon Miguel Hair Serum',
  rating: '4,3',
  ratingNote: '132 Bewertungen auf Amazon · Stand 11/2026',
  cta: 'Link in meiner *Bio*',
  disclosure: 'Affiliate-Link · Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.',
};

const C = {
  bg: '#16100b', bg2: '#2a1a0e', cream: '#f6efe4', muted: '#bfae98', amber: '#e3a35a', amberDeep: '#a5581a',
};
const SERIF = 'Georgia, "Liberation Serif", "Times New Roman", serif';
const SANS = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';

const SFX: { from: number; src: string; volume: number }[] = [
  { from: 2, src: 'whoosh-big.mp3', volume: 0.5 },     // bottle rises
  { from: 26, src: 'sparkle.mp3', volume: 0.35 },      // light sweep
  { from: 84, src: 'swoosh-quick.mp3', volume: 0.4 },
  ...[0, 1, 2, 3, 4].map((i) => ({ from: 104 + i * 12, src: 'pop.mp3', volume: 0.42 - i * 0.03 })),
  { from: 210, src: 'transition-soft.mp3', volume: 0.45 },
  { from: 246, src: 'pop.mp3', volume: 0.5 },          // drop lands
  { from: 315, src: 'swoosh-quick.mp3', volume: 0.4 },
  ...[0, 1, 2, 3].map((i) => ({ from: 333 + i * 9, src: 'pop.mp3', volume: 0.4 })),
  { from: 420, src: 'riser-cine.mp3', volume: 0.45 },
  { from: 452, src: 'impact-cine.mp3', volume: 0.5 },
  { from: 470, src: 'sparkle.mp3', volume: 0.3 },
];

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.2, 0.75, 0.3, 1);

/** `*word*` → accent colour, italic serif */
const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*[^*]+\*)/).filter(Boolean).map((part, i) =>
      part.startsWith('*') ? (
        <span key={i} style={{ color: C.amber, fontStyle: 'italic' }}>{part.slice(1, -1)}</span>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);

/** Headline that rises in and fades out at the end of its window. */
const Headline: React.FC<{ text: string; at?: number; until: number; size?: number; top: number }> = ({
  text, at = 0, until, size = 92, top,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: ease });
  const out = interpolate(frame, [until - 7, until], [1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute', left: 80, right: 80, top, textAlign: 'center', fontFamily: SERIF, fontWeight: 600,
        fontSize: size, lineHeight: 1.08, color: C.cream, letterSpacing: '-0.01em',
        opacity: t * out, transform: `translateY(${(1 - t) * 28}px)`, filter: `blur(${(1 - t) * 6}px)`,
      }}
    >
      <Rich text={text} />
    </div>
  );
};

/** Diagonal light band sweeping across the frame. */
const LightSweep: React.FC<{ at: number; dur?: number }> = ({ at, dur = 26 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [-0.4, 1.4], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const on = frame >= at && frame <= at + dur;
  return on ? (
    <AbsoluteFill
      style={{
        background: `linear-gradient(115deg, transparent ${p * 100 - 12}%, rgba(255,214,160,0.20) ${p * 100}%, transparent ${p * 100 + 12}%)`,
        mixBlendMode: 'screen', pointerEvents: 'none',
      }}
    />
  ) : null;
};

const Chip: React.FC<{ text: string; at: number; x: number; y: number; from: 'left' | 'right' }> = ({ text, at, x, y, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 140 } });
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, transform: `translateX(${(1 - s) * (from === 'left' ? -420 : 420)}px) scale(${0.8 + 0.2 * s})`,
        opacity: Math.min(1, s * 1.4), padding: '18px 30px', borderRadius: 999,
        background: 'rgba(246,239,228,0.08)', border: `1.5px solid rgba(227,163,90,0.55)`,
        color: C.cream, fontFamily: SANS, fontWeight: 600, fontSize: 40, whiteSpace: 'nowrap',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
      }}
    >
      <span style={{ color: C.amber, marginRight: 14 }}>●</span>
      {text}
    </div>
  );
};

const Product: React.FC<{ productImage?: string; glow: number }> = ({ productImage, glow }) =>
  productImage ? (
    <Img src={productImage.startsWith('http') ? productImage : staticFile(productImage)} style={{ width: 420, height: 760, objectFit: 'contain' }} />
  ) : (
    <Bottle width={330} glow={glow} />
  );

const Stage: React.FC<{ productImage?: string }> = ({ productImage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const S = SERUM_SCENES;
  const k = SERUM_COPY;

  // --- product choreography (one continuous object across scenes) ---
  const rise = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const float = Math.sin(frame / 22) * 10;
  const applyIn = interpolate(frame, [S.apply.from, S.apply.from + 18], [0, 1], { ...clamp, easing: ease });
  const applyOut = interpolate(frame, [S.badges.from, S.badges.from + 14], [0, 1], { ...clamp, easing: ease });
  const shiftX = (applyIn - applyOut) * -210;
  const badgeDim = interpolate(frame, [S.badges.from, S.badges.from + 12, S.outro.from, S.outro.from + 14], [1, 0.22, 0.22, 1], clamp);
  const outroScale = interpolate(frame, [S.outro.from, S.outro.from + 30], [1, 1.12], { ...clamp, easing: ease });
  const glow = interpolate(frame, [20, 50], [0, 1], clamp) * (0.7 + 0.3 * Math.sin(frame / 15));
  const productTop = 760;

  // --- drop (apply scene) ---
  const dropT = interpolate(frame, [S.apply.from + 18, S.apply.from + 36], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const ripple = interpolate(frame, [S.apply.from + 36, S.apply.from + 70], [0, 1], clamp);

  // --- rating stars (outro) ---
  const starsT = (i: number) => spring({ frame: frame - (S.outro.from + 30 + i * 4), fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(1200px 1300px at 50% 62%, ${C.bg2}, ${C.bg} 70%)`, overflow: 'hidden' }}
    >
      {SFX.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={90}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}

      {/* floor shadow */}
      <div style={{ position: 'absolute', left: 540 - 220 + shiftX, top: productTop + 690, width: 440, height: 60, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.6), transparent)', opacity: rise * badgeDim }} />

      {/* product */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: productTop, display: 'flex', justifyContent: 'center',
          transform: `translate(${shiftX}px, ${(1 - rise) * 900 + float}px) scale(${outroScale})`, transformOrigin: '50% 60%',
          opacity: badgeDim,
        }}
      >
        <Product productImage={productImage} glow={glow} />
      </div>

      {/* 1 · hook */}
      <Headline text={k.hook[0]} until={S.hook.duration} size={104} top={300} />
      <Headline text={k.hook[1]} at={22} until={S.hook.duration} size={56} top={540} />

      {/* 2 · ingredients */}
      <Sequence from={S.ingredients.from} durationInFrames={S.ingredients.duration} layout="none">
        <Headline text={k.ingredientsTitle} until={S.ingredients.duration} top={360} />
        {k.ingredients.map((t, i) => {
          const left = i % 2 === 0;
          const y = 820 + i * 118;
          return (
            <Sequence key={t} from={0} durationInFrames={S.ingredients.duration} layout="none">
              <Chip text={t} at={20 + i * 12} from={left ? 'left' : 'right'} x={left ? 50 : 640} y={y} />
            </Sequence>
          );
        })}
      </Sequence>

      {/* 3 · apply */}
      <Sequence from={S.apply.from} durationInFrames={S.apply.duration} layout="none">
        <Headline text={k.applyTitle} until={S.apply.duration} top={360} />
        {k.applyLines.map((l, i) => (
          <ApplyLine key={l} text={l} at={40 + i * 14} until={S.apply.duration} top={1000 + i * 120} />
        ))}
      </Sequence>
      {frame >= S.apply.from && frame < S.badges.from ? (
        <>
          <svg
            width="70" height="96" viewBox="0 0 70 96"
            style={{ position: 'absolute', left: 735, top: 640 + dropT * 220, opacity: 1 - ripple }}
          >
            <path d="M35 0 C 35 0, 0 46, 0 62 A 35 35 0 0 0 70 62 C 70 46, 35 0, 35 0 Z" fill={C.amber} />
            <ellipse cx="24" cy="58" rx="7" ry="12" fill="#fff" opacity="0.45" />
          </svg>
          {[0, 1].map((r) => {
            const rr = Math.max(0, ripple - r * 0.25);
            return (
              <div
                key={r}
                style={{
                  position: 'absolute', left: 770 - 160 * rr, top: 920 - 40 * rr, width: 320 * rr, height: 80 * rr,
                  borderRadius: '50%', border: `3px solid ${C.amber}`, opacity: (1 - rr) * (rr > 0 ? 1 : 0),
                }}
              />
            );
          })}
        </>
      ) : null}

      {/* 4 · badges */}
      <Sequence from={S.badges.from} durationInFrames={S.badges.duration} layout="none">
        <Headline text={k.badgesTitle} until={S.badges.duration} top={360} />
        {k.badges.map((b, i) => (
          <Badge key={b} text={b} at={18 + i * 9} until={S.badges.duration} x={i % 2 === 0 ? 80 : 560} y={760 + Math.floor(i / 2) * 300} />
        ))}
      </Sequence>

      {/* 5 · outro */}
      <Sequence from={S.outro.from} durationInFrames={S.outro.duration} layout="none">
        <Headline text={k.brand} at={6} until={S.outro.duration + 10} size={70} top={250} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 400, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 18 }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const s = starsT(i);
            const fill = i < 4 ? 1 : 0.3; // 4,3 of 5
            return (
              <span key={i} style={{ fontSize: 76, color: C.amber, opacity: s * (i < 4 ? 1 : 0.55), transform: `scale(${0.4 + 0.6 * s})`, display: 'inline-block', filter: fill < 1 ? 'saturate(0.4)' : undefined }}>
                ★
              </span>
            );
          })}
          <span style={{ fontFamily: SERIF, fontSize: 76, color: C.cream, marginLeft: 12, opacity: starsT(5) }}>{k.rating}</span>
        </div>
        <OutroLine text={k.ratingNote} at={50} top={520} size={34} color={C.muted} />
        <OutroLine text={k.cta} at={34} top={590} size={72} serif />
        {/* everything stays above the platform UI zone at the bottom */}
        <OutroLine text={k.disclosure} at={60} top={1470} size={24} color={C.muted} />
      </Sequence>

      <LightSweep at={22} />
      <LightSweep at={S.outro.from + 32} dur={30} />

      {/* ad label: visible for the whole runtime, inside the top safe zone */}
      <div
        style={{
          position: 'absolute', left: 60, top: 150, padding: '8px 20px', borderRadius: 8,
          background: 'rgba(246,239,228,0.14)', color: C.cream, fontFamily: SANS, fontWeight: 700,
          fontSize: 28, letterSpacing: '0.06em',
        }}
      >
        {k.adLabel}
      </div>
    </AbsoluteFill>
  );
};

const ApplyLine: React.FC<{ text: string; at: number; until: number; top: number }> = ({ text, at, until, top }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: ease });
  const out = interpolate(frame, [until - 7, until], [1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute', left: 560, right: 50, top, fontFamily: SANS, fontWeight: 600, fontSize: 46, lineHeight: 1.15,
        color: C.cream, opacity: t * out, transform: `translateX(${(1 - t) * 60}px)`,
        borderLeft: `5px solid ${C.amber}`, paddingLeft: 24,
      }}
    >
      {text}
    </div>
  );
};

const Badge: React.FC<{ text: string; at: number; until: number; x: number; y: number }> = ({ text, at, until, x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 150 } });
  const out = interpolate(frame, [until - 7, until], [1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: 440, height: 250, borderRadius: 28,
        background: 'rgba(246,239,228,0.07)', border: '1.5px solid rgba(227,163,90,0.45)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        opacity: Math.min(1, s * 1.5) * out, transform: `scale(${0.6 + 0.4 * s})`,
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
      }}
    >
      <svg width="64" height="64" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="none" stroke={C.amber} strokeWidth="1.6" />
        <path d="M7 12.5 l3.2 3.2 L17 9" fill="none" stroke={C.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ color: C.cream, fontFamily: SANS, fontWeight: 600, fontSize: 40, textAlign: 'center', lineHeight: 1.1, padding: '0 20px' }}>
        {text}
      </div>
    </div>
  );
};

const OutroLine: React.FC<{ text: string; at: number; top: number; size: number; color?: string; serif?: boolean }> = ({
  text, at, top, size, color = C.cream, serif,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: ease });
  return (
    <div
      style={{
        position: 'absolute', left: 70, right: 70, top, textAlign: 'center', fontFamily: serif ? SERIF : SANS,
        fontWeight: serif ? 600 : 500, fontSize: size, color, lineHeight: 1.25, opacity: t,
        transform: `translateY(${(1 - t) * 20}px)`,
      }}
    >
      <Rich text={text} />
    </div>
  );
};

export const SerumPromo: React.FC<{ productImage?: string }> = ({ productImage }) => <Stage productImage={productImage} />;
