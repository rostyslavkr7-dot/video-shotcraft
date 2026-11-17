import { AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame } from 'remotion';

/**
 * 9:16 true-story horror short (TikTok / Reels), Ukrainian on-screen narration.
 * Story: the Chicago broadcast signal intrusions of 22 Nov 1987 (WGN-TV 21:14,
 * WTTW ~23:15–23:20), never solved. Facts checked against UPI (24 Nov 1987),
 * WGN-TV (2017), WTTW News (2017) and Wikipedia; sources are listed on the end card.
 *
 * Visuals are abstract: a generic masked silhouette, no footage from the real
 * broadcasts and no likeness of the TV character, no channel logos.
 * Audio is synthesised (public/audio/horror, see ATTRIBUTION.md).
 */

export const HORROR_FPS = 30;
export const HORROR_W = 1080;
export const HORROR_H = 1920;

type Mode = 'mask' | 'tv' | 'black' | 'towers' | 'file';
/** visual track: what is on screen, frame ranges in order */
export const HORROR_SCENES: { from: number; to: number; mode: Mode; osd?: string }[] = [
  { from: 0, to: 75, mode: 'mask' },                          // hook flash
  { from: 75, to: 240, mode: 'tv', osd: '22.11.1987  21:14' },
  { from: 240, to: 285, mode: 'black', osd: '22.11.1987  21:14' },
  { from: 285, to: 435, mode: 'mask', osd: '22.11.1987  21:14' },
  { from: 435, to: 540, mode: 'tv', osd: '22.11.1987  21:15' },
  { from: 540, to: 630, mode: 'black' },
  { from: 630, to: 735, mode: 'tv', osd: '22.11.1987  23:18' },
  { from: 735, to: 765, mode: 'black', osd: '22.11.1987  23:18' },
  { from: 765, to: 930, mode: 'mask', osd: '22.11.1987  23:19' },
  { from: 930, to: 1170, mode: 'towers' },
  { from: 1170, to: 1410, mode: 'file' },
];
export const HORROR_TOTAL = 1410; // 47s

/** on-screen narration (Ukrainian). `*word*` = red accent */
export const HORROR_CAPTIONS: { from: number; to: number; text: string }[] = [
  { from: 4, to: 72, text: 'Цей ефір *так і не змогли* пояснити.' },
  { from: 80, to: 160, text: 'Чикаго. Неділя, 22 листопада 1987 року.' },
  { from: 160, to: 238, text: '21:14. Тисячі родин дивляться вечірні новини.' },
  { from: 244, to: 284, text: 'Раптом екран *гасне.*' },
  { from: 290, to: 345, text: 'А потім зʼявляється *він.*' },
  { from: 345, to: 432, text: 'Гумова маска. Темні окуляри. Замість звуку — *гул.*' },
  { from: 440, to: 538, text: 'Інженери перемикають частоту. Він зникає.' },
  { from: 548, to: 628, text: 'Але ніч ще *не скінчилась.*' },
  { from: 636, to: 732, text: 'Близько 23:15. Інший канал. Іде серія «Доктора Хто».' },
  { from: 770, to: 840, text: 'Та сама маска. Тепер — *з голосом.*' },
  { from: 840, to: 928, text: 'Півтори хвилини. Ніхто в студії *не може* його вимкнути.' },
  { from: 936, to: 1050, text: 'Сигнал перехопили потужним *мікрохвильовим* передавачем.' },
  { from: 1050, to: 1166, text: 'Федеральна комісія звʼязку почала розслідування. Нікого *не знайшли.*' },
  { from: 1176, to: 1290, text: 'Строк давності сплив у 1992-му. Хто був під маскою — *досі невідомо.*' },
  { from: 1290, to: 1404, text: 'Можливо, вони досі дивляться телевізор. *Як і ти.*' },
];

const SFX: { from: number; src: string; volume: number; dur?: number }[] = [
  { from: 0, src: 'horror/static.mp3', volume: 0.5 },
  { from: 2, src: 'horror/buzz.mp3', volume: 0.35, dur: 70 },
  { from: 75, src: 'horror/static.mp3', volume: 0.35 },
  { from: 240, src: 'horror/hit.mp3', volume: 0.8 },
  { from: 285, src: 'horror/static.mp3', volume: 0.5 },
  { from: 288, src: 'horror/buzz.mp3', volume: 0.4, dur: 120 },
  { from: 435, src: 'horror/static.mp3', volume: 0.45 },
  { from: 540, src: 'horror/hit.mp3', volume: 0.7 },
  { from: 735, src: 'horror/hit.mp3', volume: 0.8 },
  { from: 765, src: 'horror/static.mp3', volume: 0.5 },
  { from: 770, src: 'horror/garble.mp3', volume: 0.55, dur: 150 },
  { from: 930, src: 'riser-cine.mp3', volume: 0.35 },
  { from: 1170, src: 'impact-cine.mp3', volume: 0.6 },
  { from: 1300, src: 'horror/static.mp3', volume: 0.3 },
];

const C = { red: '#e0262b', paper: '#e9e4d8', green: '#bfffc2' };
const MONO = '"Courier New", "Liberation Mono", "DejaVu Sans Mono", monospace';
const SANS = '"Helvetica Neue", Arial, "Liberation Sans", sans-serif';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const sceneAt = (f: number) => HORROR_SCENES.find((s) => f >= s.from && f < s.to) ?? HORROR_SCENES[HORROR_SCENES.length - 1];

/** Film grain via SVG turbulence; the seed changes every 2 frames (deterministic). */
const Grain: React.FC<{ opacity: number }> = ({ opacity }) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2);
  return (
    <svg width={HORROR_W} height={HORROR_H} style={{ position: 'absolute', inset: 0, opacity, mixBlendMode: 'screen' }}>
      <filter id={`g${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g${seed})`} />
    </svg>
  );
};

const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 2px, transparent 2px, transparent 5px)',
      pointerEvents: 'none',
    }}
  />
);

/** Horizontal tear bands: random slices shifted sideways on glitch frames. */
const Tears: React.FC<{ strength: number }> = ({ strength }) => {
  const f = useCurrentFrame();
  if (strength <= 0) return null;
  const bands = [0, 1, 2, 3].filter((i) => random(`t${f}-${i}`) < 0.55 * strength);
  return (
    <>
      {bands.map((i) => {
        const y = random(`y${f}-${i}`) * HORROR_H;
        const h = 8 + random(`h${f}-${i}`) * 70;
        const x = (random(`x${f}-${i}`) - 0.5) * 120 * strength;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: HORROR_W, height: h, background: 'rgba(255,255,255,0.10)', backdropFilter: 'invert(0.15)', mixBlendMode: 'difference' }} />
        );
      })}
    </>
  );
};

/** Generic masked figure: slicked hair, wide dark glasses, stiff grin. Not a likeness of anyone. */
const MaskFigure: React.FC = () => {
  const f = useCurrentFrame();
  const sway = Math.sin(f / 5.5) * 7 + Math.sin(f / 2.3) * 3;
  const bob = Math.sin(f / 4) * 14;
  const jerk = random(`j${Math.floor(f / 3)}`) < 0.12 ? (random(`k${f}`) - 0.5) * 60 : 0;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center', filter: 'contrast(1.5) brightness(0.72) blur(0.7px)', transform: `translate(${jerk}px, ${bob}px) rotate(${sway}deg)`, transformOrigin: '50% 90%' }}>
      <svg width="640" height="860" viewBox="0 0 320 430">
        <defs>
          <linearGradient id="skin" x1="0" x2="1">
            <stop offset="0" stopColor="#9aa0a6" />
            <stop offset="0.45" stopColor="#e9ecef" />
            <stop offset="1" stopColor="#6c737a" />
          </linearGradient>
        </defs>
        {/* shoulders / suit */}
        <path d="M10 430 C 20 340, 90 318, 160 318 C 230 318, 300 340, 310 430 Z" fill="#111" />
        <path d="M135 320 L160 380 L185 320 Z" fill="#ddd" />
        {/* neck */}
        <rect x="132" y="270" width="56" height="60" fill="#8d949b" />
        {/* head */}
        <path d="M70 140 C 70 50, 250 50, 250 140 L 246 220 C 240 280, 200 300, 160 300 C 120 300, 80 280, 74 220 Z" fill="url(#skin)" />
        {/* hair */}
        <path d="M66 140 C 60 40, 260 30, 254 140 C 230 92, 120 86, 66 140 Z" fill="#cfd4d8" />
        {/* glasses */}
        <rect x="82" y="150" width="70" height="44" rx="6" fill="#050505" />
        <rect x="168" y="150" width="70" height="44" rx="6" fill="#050505" />
        <rect x="150" y="160" width="20" height="8" fill="#050505" />
        <rect x="90" y="156" width="20" height="6" fill="#fff" opacity="0.25" />
        {/* grin */}
        <path d="M104 232 C 130 268, 190 268, 216 232 C 190 252, 130 252, 104 232 Z" fill="#1a1a1a" />
        {/* hollow cheeks, rubber creases */}
        <path d="M92 210 C 100 250, 116 266, 128 272" stroke="#4a5056" strokeWidth="3" fill="none" opacity="0.7" />
        <path d="M228 210 C 220 250, 204 266, 192 272" stroke="#4a5056" strokeWidth="3" fill="none" opacity="0.7" />
      </svg>
    </div>
  );
};

const StripeWall: React.FC = () => {
  const f = useCurrentFrame();
  const angle = 20 + Math.sin(f / 18) * 35;
  return (
    <AbsoluteFill style={{ background: '#0b0b0b', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: -600, top: -600, width: 2280, height: 3120, transform: `rotate(${angle}deg)`,
          background: 'repeating-linear-gradient(90deg, #2b2b2b 0px, #8e8e8e 28px, #d6d6d6 40px, #4a4a4a 64px, #1c1c1c 92px)',
          opacity: 0.85,
        }}
      />
    </AbsoluteFill>
  );
};

const NewsTV: React.FC<{ label: string }> = ({ label }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(900px 1200px at 50% 45%, #1d3b66, #07101d 75%)' }}>
      {/* generic anchor desk */}
      <div style={{ position: 'absolute', left: 340, top: 820, width: 400, height: 470, borderRadius: '200px 200px 20px 20px', background: 'linear-gradient(#27303d, #11161d)' }} />
      <div style={{ position: 'absolute', left: 445, top: 690, width: 190, height: 230, borderRadius: '50%', background: 'linear-gradient(#3a4452, #1b222c)' }} />
      <div style={{ position: 'absolute', left: 120, right: 120, top: 1240, height: 160, background: 'linear-gradient(#5b6b80, #2a3442)', borderTop: '6px solid #9fb2c8' }} />
      <div style={{ position: 'absolute', left: 120, top: 1420, padding: '14px 26px', background: '#c9d6e6', color: '#0d1724', fontFamily: SANS, fontWeight: 800, fontSize: 40, letterSpacing: '0.04em', opacity: 0.9 }}>
        {label}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: `rgba(255,255,255,${0.02 + 0.02 * Math.sin(f / 2)})` }} />
    </AbsoluteFill>
  );
};

const Towers: React.FC<{ local: number }> = ({ local }) => {
  const beam = interpolate(local, [20, 70], [0, 1], clamp);
  const pulse = 0.5 + 0.5 * Math.sin(local / 3);
  const src = { x: 540, y: 1380 };
  const tA = { x: 300, y: 960 };
  const tB = { x: 790, y: 920 };
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#05070b, #0d1320 70%, #141b2a)' }}>
      <svg width={HORROR_W} height={HORROR_H}>
        {/* skyline */}
        {[[40, 1230, 140], [180, 1150, 110], [250, 960, 110], [400, 1260, 120], [520, 1180, 90], [740, 920, 110], [880, 1200, 150]].map(([x, y, w], i) => (
          <rect key={i} x={x} y={y} width={w} height={HORROR_H - y} fill={i === 2 || i === 5 ? '#1f2a3c' : '#141c29'} />
        ))}
        <line x1={tA.x} y1={tA.y} x2={tA.x} y2={tA.y - 140} stroke="#3a4a63" strokeWidth="6" />
        <line x1={tB.x} y1={tB.y} x2={tB.x} y2={tB.y - 160} stroke="#3a4a63" strokeWidth="6" />
        <circle cx={tA.x} cy={tA.y - 140} r={8} fill={C.red} opacity={pulse} />
        <circle cx={tB.x} cy={tB.y - 160} r={8} fill={C.red} opacity={1 - pulse} />
        {/* pirate transmitter + beams */}
        <circle cx={src.x} cy={src.y} r={16} fill={C.red} />
        <circle cx={src.x} cy={src.y} r={16 + pulse * 40} fill="none" stroke={C.red} strokeWidth="3" opacity={1 - pulse} />
        {[[tA.x, tA.y - 140], [tB.x, tB.y - 160]].map(([x, y], i) => (
          <line key={i} x1={src.x} y1={src.y} x2={src.x + (x - src.x) * beam} y2={src.y + (y - src.y) * beam} stroke={C.red} strokeWidth="5" strokeDasharray="18 12" strokeDashoffset={-local * 3} />
        ))}
        <text x={src.x} y={src.y + 70} textAnchor="middle" fill="#ff8a8d" fontFamily={MONO} fontSize="34">?</text>
      </svg>
    </AbsoluteFill>
  );
};

const CaseFile: React.FC<{ local: number }> = ({ local }) => {
  const stamp = interpolate(local, [8, 16], [1.8, 1], clamp);
  const stampO = interpolate(local, [8, 12], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: '#0a0a0a', alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 560, width: 820, height: 760, background: C.paper, transform: 'rotate(-2deg)', boxShadow: '0 30px 80px rgba(0,0,0,0.7)', padding: 60, fontFamily: MONO, color: '#222' }}>
        <div style={{ fontSize: 34, letterSpacing: '0.12em' }}>СПРАВА № 1987-11-22</div>
        <div style={{ height: 3, background: '#222', margin: '22px 0 34px' }} />
        {['Місце: Чикаго, Іллінойс', 'Канали: 2', 'Тривалість: ~30 с + ~90 с', 'Підозрюваних: 0', 'Строк давності: сплив (1992)'].map((l) => (
          <div key={l} style={{ fontSize: 36, margin: '18px 0' }}>{l}</div>
        ))}
        <div
          style={{
            position: 'absolute', right: 40, bottom: 70, border: `8px solid ${C.red}`, color: C.red, fontSize: 84, fontWeight: 900,
            padding: '8px 28px', transform: `rotate(-12deg) scale(${stamp})`, opacity: stampO * 0.9, letterSpacing: '0.05em',
          }}
        >
          НЕ РОЗКРИТО
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const f = useCurrentFrame();
  // typewriter reveal, then hold, then cut
  const chars = Math.floor(interpolate(f, [from, from + Math.min(28, (to - from) * 0.45)], [0, text.length], clamp));
  const shown = text.replace(/\*/g, '');
  let count = 0;
  const parts = text.split(/(\*[^*]+\*)/).filter(Boolean).map((p, i) => {
    const accent = p.startsWith('*');
    const raw = accent ? p.slice(1, -1) : p;
    const visible = raw.slice(0, Math.max(0, chars - count));
    count += raw.length;
    return <span key={i} style={{ color: accent ? C.red : undefined }}>{visible}</span>;
  });
  const jitter = random(`c${f}`) < 0.06 ? 4 : 0;
  return (
    <div
      aria-label={shown}
      style={{
        position: 'absolute', left: 70, right: 70, top: 250, minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 68, lineHeight: 1.12, color: '#f2f2f2',
        textShadow: `${2 + jitter}px 0 rgba(255,0,40,0.65), ${-2 - jitter}px 0 rgba(0,220,255,0.55), 0 6px 24px rgba(0,0,0,0.9)`,
      }}
    >
      <div>{parts}</div>
    </div>
  );
};

export const MaxHorror: React.FC = () => {
  const f = useCurrentFrame();
  const scene = sceneAt(f);
  const local = f - scene.from;
  // glitch strength: spikes at every scene change, constant hum while the mask is on air
  const cut = Math.min(...HORROR_SCENES.map((s) => Math.abs(f - s.from)));
  const glitch = Math.max(interpolate(cut, [0, 8], [1, 0], clamp), scene.mode === 'mask' ? 0.35 : 0);
  const rgb = glitch * 14;
  const shake = glitch > 0.5 ? (random(`s${f}`) - 0.5) * 30 * glitch : 0;
  const flicker = scene.mode === 'mask' ? 0.85 + 0.15 * random(`fl${f}`) : 1;

  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <Audio src={staticFile('audio/horror/drone.mp3')} volume={0.55} />
      {SFX.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur ?? 75}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}

      {/* picture, with RGB split on glitch */}
      <AbsoluteFill style={{ transform: `translateX(${shake}px)`, opacity: flicker, filter: `drop-shadow(${rgb}px 0 0 rgba(255,0,50,0.5)) drop-shadow(${-rgb}px 0 0 rgba(0,200,255,0.45))` }}>
        {scene.mode === 'tv' && <NewsTV label={scene.from >= 630 ? 'ДОКТОР ХТО · СЕРІЯ 1' : 'ВЕЧІРНІ НОВИНИ · СПОРТ'} />}
        {scene.mode === 'mask' && (
          <>
            <StripeWall />
            <MaskFigure />
          </>
        )}
        {scene.mode === 'towers' && <Towers local={local} />}
        {scene.mode === 'file' && <CaseFile local={local} />}
      </AbsoluteFill>

      <Tears strength={glitch} />
      <Grain opacity={scene.mode === 'black' ? 0.35 : 0.12 + glitch * 0.25} />
      <Scanlines />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.85) 100%)' }} />

      {/* darken the top band so captions always read */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 720, background: 'linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.45) 70%, transparent)' }} />
      {HORROR_CAPTIONS.map((c) => (f >= c.from && f < c.to ? <Caption key={c.from} {...c} /> : null))}

      {/* VHS on-screen display, inside the top safe zone */}
      {scene.osd ? (
        <div style={{ position: 'absolute', left: 70, top: 150, fontFamily: MONO, fontWeight: 700, fontSize: 34, color: C.green, textShadow: '0 0 8px rgba(120,255,140,0.6)' }}>
          ▶ PLAY&nbsp;&nbsp;{scene.osd}
        </div>
      ) : null}
      {f >= 1300 ? (
        <div style={{ position: 'absolute', left: 70, right: 70, top: 1440, textAlign: 'center', fontFamily: MONO, fontSize: 24, color: '#8a8a8a', opacity: interpolate(f, [1300, 1315], [0, 1], clamp) }}>
          Реальна подія. Джерела: UPI (24.11.1987), WGN-TV, WTTW News (2017)
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
