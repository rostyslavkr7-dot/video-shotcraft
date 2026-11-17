/**
 * Neutral, code-drawn amber dropper bottle. It is a stand-in, deliberately not a
 * copy of any brand's label: replace it with your own photo of the product via
 * the `productImage` prop of SerumPromo (a transparent PNG works best).
 */
export const Bottle: React.FC<{ width?: number; label?: string; sub?: string; glow?: number }> = ({
  width = 380,
  label = 'HAIR SERUM',
  sub = '60 ml',
  glow = 0,
}) => {
  const h = width * 2.1;
  return (
    <svg width={width} height={h} viewBox="0 0 200 420" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0" stopColor="#5a2c08" />
          <stop offset="0.18" stopColor="#a5581a" />
          <stop offset="0.32" stopColor="#d98a3d" />
          <stop offset="0.5" stopColor="#9a4c12" />
          <stop offset="1" stopColor="#3d1c05" />
        </linearGradient>
        <linearGradient id="cap" x1="0" x2="1">
          <stop offset="0" stopColor="#0d0d0d" />
          <stop offset="0.35" stopColor="#3a3a3a" />
          <stop offset="1" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="shine" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity={0.55 * glow} />
          <stop offset="1" stopColor="#ffcf8a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="260" rx="190" ry="230" fill="url(#glow)" />
      {/* rubber bulb + collar */}
      <rect x="74" y="0" width="52" height="78" rx="24" fill="url(#cap)" />
      <rect x="62" y="70" width="76" height="62" rx="6" fill="url(#cap)" />
      <rect x="62" y="84" width="76" height="3" fill="#ffffff" opacity="0.12" />
      {/* neck */}
      <rect x="78" y="128" width="44" height="22" fill="url(#glass)" />
      {/* body */}
      <path d="M78 148 C 78 160, 22 162, 22 196 L 22 392 Q 22 418 48 418 L 152 418 Q 178 418 178 392 L 178 196 C 178 162, 122 160, 122 148 Z" fill="url(#glass)" />
      <rect x="34" y="200" width="16" height="190" rx="8" fill="url(#shine)" opacity="0.7" />
      {/* label */}
      <rect x="34" y="236" width="132" height="128" rx="4" fill="#f5efe6" />
      <text x="100" y="292" textAnchor="middle" fontFamily="Georgia, 'Liberation Serif', serif" fontSize="14" letterSpacing="2" fill="#1b1410">
        {label}
      </text>
      <rect x="82" y="306" width="36" height="1.5" fill="#a5581a" />
      <text x="100" y="334" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="11" letterSpacing="2" fill="#6b5f55">
        {sub}
      </text>
    </svg>
  );
};
