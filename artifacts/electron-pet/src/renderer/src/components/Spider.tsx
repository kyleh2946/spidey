type Vec2 = { x: number; y: number };

type Props = {
  behavior: string;
  direction: number;
  legPhase: number;
  petType?: string;
};

const LEFT_HIPS: Vec2[] = [
  { x: -14, y: -10 },
  { x: -16, y: -2 },
  { x: -16, y: 6 },
  { x: -13, y: 13 },
];
const RIGHT_HIPS: Vec2[] = [
  { x: 14, y: -10 },
  { x: 16, y: -2 },
  { x: 16, y: 6 },
  { x: 13, y: 13 },
];

const LEFT_REST: Vec2[] = [
  { x: -48, y: -24 },
  { x: -52, y: 2 },
  { x: -50, y: 24 },
  { x: -44, y: 42 },
];
const RIGHT_REST: Vec2[] = [
  { x: 48, y: -24 },
  { x: 52, y: 2 },
  { x: 50, y: 24 },
  { x: 44, y: 42 },
];

const LEFT_PHASE_OFFSETS = [0, 0.5, 0.25, 0.75];
const RIGHT_PHASE_OFFSETS = [0.5, 0, 0.75, 0.25];

function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function getLegTip(
  hip: Vec2,
  rest: Vec2,
  phaseOffset: number,
  legPhase: number,
  isWalking: boolean,
  behavior: string
): Vec2 {
  if (!isWalking) {
    if (behavior === "sleep") return lerpVec(hip, rest, 0.35);
    if (behavior === "dead") {
      return { x: hip.x * 0.4 + (rest.x > 0 ? 20 : -20), y: Math.abs(rest.y) * 0.4 + 15 };
    }
    return rest;
  }

  const stride = 10;
  const lift = 12;
  const phase = (legPhase + phaseOffset) % 1;

  let liftAmount = 0;
  let strideOffset = 0;

  if (phase < 0.4) {
    const t = phase / 0.4;
    liftAmount = Math.sin(t * Math.PI) * lift;
    strideOffset = (t - 0.5) * stride;
  } else {
    const t = (phase - 0.4) / 0.6;
    strideOffset = (0.5 - t) * stride * 0.5;
  }

  const sign = hip.x < 0 ? -1 : 1;
  return {
    x: rest.x + strideOffset * sign * 0.3,
    y: rest.y - liftAmount + strideOffset * 0.35,
  };
}

function getLegKnee(hip: Vec2, tip: Vec2): Vec2 {
  const midX = (hip.x + tip.x) / 2;
  const midY = (hip.y + tip.y) / 2;
  const outward = hip.x < 0 ? -1 : 1;
  return { x: midX + outward * 10, y: midY - 7 };
}

type LegProps = { hip: Vec2; knee: Vec2; tip: Vec2; color: string };
function Leg({ hip, knee, tip, color }: LegProps) {
  return (
    <>
      <line x1={hip.x} y1={hip.y} x2={knee.x} y2={knee.y} stroke={color} strokeWidth="5" strokeLinecap="round" />
      <line x1={knee.x} y1={knee.y} x2={tip.x} y2={tip.y} stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={tip.x} cy={tip.y} r="2.2" fill={color} opacity="0.65" />
    </>
  );
}

const PET_COLORS: Record<string, { body: string; hi: string; hair: string; eye: string }> = {
  tarantula:       { body: "#2d1b0e", hi: "#4a2c0a", hair: "#5c3512", eye: "#d97706" },
  scorpion:        { body: "#1a1828", hi: "#2d2750", hair: "#4c1d95", eye: "#7c3aed" },
  dragon_spider:   { body: "#180818", hi: "#3b1238", hair: "#7c2d7c", eye: "#ef4444" },
  golden_tarantula:{ body: "#92400e", hi: "#b45309", hair: "#d97706", eye: "#fbbf24" },
};

export default function Spider({ behavior, direction, legPhase, petType = "tarantula" }: Props) {
  const c = PET_COLORS[petType] ?? PET_COLORS.tarantula;

  const isWalking = ["wander", "hungry_wander", "angry", "chase_food"].includes(behavior);
  const isSleeping = behavior === "sleep";
  const isDead = behavior === "dead";
  const isAngry = behavior === "angry" || behavior === "screen_bite";
  const isEating = behavior === "eat_food";

  const eyeColor = isAngry ? "#ef4444" : isDead ? "#555" : c.eye;

  const leftLegs = LEFT_HIPS.map((hip, i) => {
    const tip = getLegTip(hip, LEFT_REST[i], LEFT_PHASE_OFFSETS[i], legPhase, isWalking, behavior);
    return { hip, knee: getLegKnee(hip, tip), tip };
  });
  const rightLegs = RIGHT_HIPS.map((hip, i) => {
    const tip = getLegTip(hip, RIGHT_REST[i], RIGHT_PHASE_OFFSETS[i], legPhase, isWalking, behavior);
    return { hip, knee: getLegKnee(hip, tip), tip };
  });

  const bodyRotDeg = isWalking ? (direction * 180) / Math.PI + 90 : 90;

  const filterStyle = isAngry
    ? "drop-shadow(0 0 10px rgba(220,38,38,0.9)) drop-shadow(0 0 20px rgba(220,38,38,0.4))"
    : isSleeping
    ? "drop-shadow(0 0 8px rgba(120,100,220,0.5))"
    : "drop-shadow(0 3px 8px rgba(0,0,0,0.7))";

  const fangLen = isAngry || isEating ? 9 : 6;

  return (
    <div style={{ width: 130, height: 130, filter: filterStyle }}>
      <svg
        viewBox="-70 -60 140 125"
        width="130"
        height="130"
        style={{
          transform: `rotate(${bodyRotDeg}deg)`,
          transition: isWalking ? "transform 0.08s linear" : "transform 0.4s ease",
          overflow: "visible",
        }}
      >
        <defs>
          <radialGradient id="spAbdomen" cx="38%" cy="30%" r="65%">
            <stop offset="0%" stopColor={c.hi} />
            <stop offset="100%" stopColor={c.body} />
          </radialGradient>
          <radialGradient id="spCephalo" cx="38%" cy="30%" r="65%">
            <stop offset="0%" stopColor={c.hi} />
            <stop offset="100%" stopColor={c.body} />
          </radialGradient>
          {isAngry && (
            <filter id="eyeGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Ground shadow */}
        {!isDead && (
          <ellipse cx="0" cy="52" rx="28" ry="6" fill="rgba(0,0,0,0.22)" />
        )}

        {/* Legs behind body */}
        {leftLegs.map((l, i) => <Leg key={`l${i}`} {...l} color={c.hair} />)}
        {rightLegs.map((l, i) => <Leg key={`r${i}`} {...l} color={c.hair} />)}

        {/* Body hairs */}
        {[-22, -10, 0, 10, 22].map((a) => {
          const rad = (a * Math.PI) / 180;
          const ox = Math.cos(rad + Math.PI / 2) * 19;
          const oy = Math.sin(rad + Math.PI / 2) * 24 + 12;
          return (
            <line
              key={a}
              x1={ox} y1={oy}
              x2={ox + Math.cos(rad) * 6} y2={oy + Math.sin(rad) * 6}
              stroke={c.hair} strokeWidth="1.5" opacity="0.55"
            />
          );
        })}

        {/* Abdomen */}
        <ellipse cx="0" cy="16" rx="20" ry="27" fill="url(#spAbdomen)" />
        <ellipse cx="0" cy="11" rx="9" ry="14" fill={c.hi} opacity="0.18" />
        {petType === "golden_tarantula" && (
          <ellipse cx="0" cy="16" rx="11" ry="16" fill="#fbbf24" opacity="0.12" />
        )}

        {/* Pedicel */}
        <ellipse cx="0" cy="-10" rx="6" ry="5" fill={c.body} />

        {/* Cephalothorax */}
        <ellipse cx="0" cy="-24" rx="19" ry="17" fill="url(#spCephalo)" />
        <line x1="-8" y1="-18" x2="8" y2="-18" stroke={c.hair} strokeWidth="1" opacity="0.25" />
        <line x1="-10" y1="-24" x2="10" y2="-24" stroke={c.hair} strokeWidth="1" opacity="0.25" />
        <line x1="-8" y1="-30" x2="8" y2="-30" stroke={c.hair} strokeWidth="1" opacity="0.2" />

        {/* Chelicerae */}
        {!isDead && (
          <>
            <ellipse
              cx="-5.5" cy={-37 - fangLen / 2}
              rx="3" ry={fangLen / 2 + 2}
              fill={c.body}
            />
            <ellipse
              cx="5.5" cy={-37 - fangLen / 2}
              rx="3" ry={fangLen / 2 + 2}
              fill={c.body}
            />
            <ellipse cx="-5.5" cy={-40 - fangLen / 2} rx="2" ry="2.5" fill="#050505" />
            <ellipse cx="5.5" cy={-40 - fangLen / 2} rx="2" ry="2.5" fill="#050505" />
          </>
        )}

        {/* Eyes */}
        {!isDead ? (
          <>
            <circle cx="-6.5" cy="-34" r="5" fill={eyeColor} filter={isAngry ? "url(#eyeGlow)" : undefined} />
            <circle cx="6.5" cy="-34" r="5" fill={eyeColor} filter={isAngry ? "url(#eyeGlow)" : undefined} />
            <circle cx="-5.5" cy="-33" r="1.8" fill="white" opacity="0.7" />
            <circle cx="7.5" cy="-33" r="1.8" fill="white" opacity="0.7" />
            <circle cx="-13" cy="-30" r="2.8" fill={eyeColor} opacity="0.65" />
            <circle cx="13" cy="-30" r="2.8" fill={eyeColor} opacity="0.65" />
            <circle cx="-15" cy="-24" r="2" fill={eyeColor} opacity="0.45" />
            <circle cx="15" cy="-24" r="2" fill={eyeColor} opacity="0.45" />
          </>
        ) : (
          <>
            <line x1="-11" y1="-38" x2="-2" y2="-29" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="-2" y1="-38" x2="-11" y2="-29" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="2" y1="-38" x2="11" y2="-29" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="11" y1="-38" x2="2" y2="-29" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {/* Pet-type extras */}
        {petType === "scorpion" && (
          <path
            d="M0 -8 Q28 -18 34 -32 Q36 -44 28 -48"
            stroke={c.hair} strokeWidth="5.5" fill="none" strokeLinecap="round"
          />
        )}
        {petType === "dragon_spider" && !isDead && (
          <>
            <circle cx="0" cy="-52" r="5" fill="#ef4444" opacity="0.75" />
            <path d="M-3 -48 Q0 -56 3 -48" stroke="#f97316" strokeWidth="1.5" fill="none" />
          </>
        )}
      </svg>
    </div>
  );
}
