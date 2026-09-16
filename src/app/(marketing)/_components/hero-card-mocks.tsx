/**
 * Mini-superfícies do produto, desenhadas em SVG monocromático.
 * Usadas nos cartões 3D do hero e na grade de recursos. Sem hooks —
 * herdam a cor via `currentColor` do cartão que as contém.
 */
import type { ReactNode } from "react";

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <text
        x="16"
        y="24"
        fontSize="10"
        letterSpacing="1.4"
        fill="currentColor"
        opacity="0.55"
      >
        {label.toUpperCase()}
      </text>
      {children}
    </svg>
  );
}

function WeightLine() {
  return (
    <Frame label="peso">
      <g stroke="currentColor" strokeLinecap="round">
        <line x1="16" y1="134" x2="224" y2="134" opacity="0.2" />
        <line
          x1="16"
          y1="112"
          x2="224"
          y2="112"
          strokeDasharray="2 5"
          opacity="0.4"
        />
        <polyline
          points="16,64 52,76 88,60 124,94 160,86 196,110 224,100"
          strokeWidth="2"
          opacity="0.95"
        />
      </g>
      <circle cx="224" cy="100" r="3.2" fill="currentColor" />
    </Frame>
  );
}

function WorkoutRows() {
  const rows = [58, 84, 110];
  return (
    <Frame label="treino">
      {rows.map((y, i) => (
        <g key={y}>
          <rect
            x="16"
            y={y}
            width={78 - i * 12}
            height="9"
            rx="2"
            fill="currentColor"
            opacity="0.75"
          />
          <rect
            x="150"
            y={y}
            width="30"
            height="9"
            rx="2"
            fill="currentColor"
            opacity="0.3"
          />
          <rect
            x="192"
            y={y}
            width="32"
            height="9"
            rx="2"
            fill="currentColor"
            opacity="0.3"
          />
        </g>
      ))}
    </Frame>
  );
}

function MacroRings() {
  const rings = [
    { r: 46, dash: 0.68 },
    { r: 34, dash: 0.42 },
    { r: 22, dash: 0.85 },
  ];
  return (
    <Frame label="macros">
      <g transform="translate(120 92)" stroke="currentColor" fill="none">
        {rings.map(({ r, dash }) => {
          const c = 2 * Math.PI * r;
          return (
            <g key={r}>
              <circle r={r} strokeWidth="7" opacity="0.16" />
              <circle
                r={r}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${c * dash} ${c}`}
                transform="rotate(-90)"
                opacity="0.9"
              />
            </g>
          );
        })}
      </g>
    </Frame>
  );
}

function GoalBars() {
  const bars = [
    { y: 66, pct: 0.72 },
    { y: 104, pct: 0.4 },
  ];
  return (
    <Frame label="metas">
      {bars.map(({ y, pct }) => (
        <g key={y}>
          <rect
            x="16"
            y={y}
            width="208"
            height="12"
            rx="2"
            fill="currentColor"
            opacity="0.14"
          />
          <rect
            x="16"
            y={y}
            width={208 * pct}
            height="12"
            rx="2"
            fill="currentColor"
            opacity="0.9"
          />
        </g>
      ))}
    </Frame>
  );
}

function ImcGauge() {
  return (
    <Frame label="imc">
      <g
        transform="translate(120 120)"
        stroke="currentColor"
        fill="none"
        strokeLinecap="round"
      >
        <path d="M-78 0 A78 78 0 0 1 78 0" strokeWidth="8" opacity="0.16" />
        <path d="M-78 0 A78 78 0 0 1 34 -70" strokeWidth="8" opacity="0.9" />
        <line x1="0" y1="0" x2="30" y2="-58" strokeWidth="3" />
        <circle r="4" fill="currentColor" stroke="none" />
      </g>
      <text
        x="120"
        y="150"
        fontSize="15"
        textAnchor="middle"
        fill="currentColor"
        opacity="0.85"
      >
        23,4
      </text>
    </Frame>
  );
}

function BodyMeasure() {
  return (
    <Frame label="medidas">
      <g stroke="currentColor" fill="none">
        <path
          d="M120 40 q-26 6 -26 34 l-6 46 q0 6 8 6 h48 q8 0 8 -6 l-6 -46 q0 -28 -26 -34z"
          opacity="0.5"
        />
        {[70, 96, 122].map((y) => (
          <line
            key={y}
            x1="70"
            y1={y}
            x2="170"
            y2={y}
            strokeDasharray="2 4"
            opacity="0.55"
          />
        ))}
      </g>
      {[70, 96, 122].map((y, i) => (
        <text
          key={y}
          x="176"
          y={y + 3}
          fontSize="9"
          fill="currentColor"
          opacity="0.5"
        >
          {["102", "84", "96"][i]}
        </text>
      ))}
    </Frame>
  );
}

function Streak() {
  const h = [26, 40, 14, 48, 34, 44, 20];
  return (
    <Frame label="semana">
      {h.map((v, i) => (
        <rect
          key={i}
          x={20 + i * 30}
          y={132 - v}
          width="16"
          height={v}
          rx="2"
          fill="currentColor"
          opacity={i === 3 ? 0.95 : 0.34}
        />
      ))}
    </Frame>
  );
}

function DocPdf() {
  return (
    <Frame label="arquivos">
      <g stroke="currentColor" fill="none">
        <path
          d="M74 40 h70 l24 24 v72 a4 4 0 0 1 -4 4 h-90 a4 4 0 0 1 -4 -4 v-92 a4 4 0 0 1 4 -4z"
          opacity="0.5"
        />
        <path d="M144 40 v24 h24" opacity="0.5" />
        {[80, 92, 104].map((y) => (
          <line key={y} x1="86" y1={y} x2="150" y2={y} opacity="0.4" />
        ))}
      </g>
      <text x="120" y="128" fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.7">
        PDF
      </text>
    </Frame>
  );
}

function AreaEvolucao() {
  return (
    <Frame label="evolução">
      <path
        d="M16 118 L52 96 L88 104 L124 72 L160 82 L196 52 L224 60 V138 H16 Z"
        fill="currentColor"
        opacity="0.12"
      />
      <polyline
        points="16,118 52,96 88,104 124,72 160,82 196,52 224,60"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </Frame>
  );
}

export type HeroMock = { key: string; node: ReactNode };

export const HERO_MOCKS: HeroMock[] = [
  { key: "weight", node: <WeightLine /> },
  { key: "workout", node: <WorkoutRows /> },
  { key: "macros", node: <MacroRings /> },
  { key: "goals", node: <GoalBars /> },
  { key: "imc", node: <ImcGauge /> },
  { key: "body", node: <BodyMeasure /> },
  { key: "streak", node: <Streak /> },
  { key: "doc", node: <DocPdf /> },
  { key: "area", node: <AreaEvolucao /> },
];
