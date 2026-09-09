"use client";

// 재물 흐름을 등급(1~5) 기반의 추상 곡선으로 표현한다. 특정 연도/금액을
// 예측하는 그래프가 아니라, 상대적인 흐름의 오르내림만 보여주는 연출용 시각화.

import { motion } from "framer-motion";

const WIDTH = 280;
const HEIGHT = 70;
const PADDING = 8;

function toPoints(curve: readonly number[]) {
  const step = (WIDTH - PADDING * 2) / (curve.length - 1);
  return curve.map((v, i) => {
    const x = PADDING + i * step;
    const y = HEIGHT - PADDING - ((v - 1) / 4) * (HEIGHT - PADDING * 2);
    return [x, y] as const;
  });
}

function toSmoothPath(points: readonly (readonly [number, number])[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` Q ${x0} ${y0}, ${mx} ${(y0 + y1) / 2}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last[0]} ${last[1]}`;
  return d;
}

export function FlowLine({ curve }: { curve: readonly number[] }) {
  const points = toPoints(curve);
  const path = toSmoothPath(points);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full text-(--gold)"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="flow-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <motion.path
        d={`${path} L ${WIDTH - PADDING} ${HEIGHT} L ${PADDING} ${HEIGHT} Z`}
        fill="url(#flow-fill)"
        stroke="none"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0.05, opacity: 0.7 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
      />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 3.2 : 2} fill="currentColor" />
      ))}
    </svg>
  );
}
