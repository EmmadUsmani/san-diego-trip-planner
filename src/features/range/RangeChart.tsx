import { useEffect, useId, useState } from "react";
import type { RangeTimeline } from "@shared/range";
import type { Leg, TripDay } from "@shared/types";
import { BoltIcon } from "../../components/icons";
import { buildChart, DEFAULT_BOX, type ChartBox } from "./chart";
import styles from "./Range.module.css";

const NARROW_BOX: ChartBox = { width: 420, height: 340, padL: 40, padR: 10, padT: 36, padB: 16 };
function useNarrow() {
  const q = "(max-width: 719px)";
  const [n, setN] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setN(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return n;
}

export function RangeChart({ timeline, legs, days }: { timeline: RangeTimeline; legs: Leg[]; days: TripDay[] }) {
  const uid = useId().replace(/:/g, "");
  const narrow = useNarrow();
  const m = buildChart(timeline, legs, days, narrow ? NARROW_BOX : DEFAULT_BOX);
  const { box } = m;
  const lowClip = `low-${uid}`;
  const okClip = `ok-${uid}`;
  const end = timeline.points[timeline.points.length - 1]!;
  const endP = m.points[m.points.length - 1]!;
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${box.width} ${box.height}`}
      role="img"
      aria-label={`Battery from ${Math.round(timeline.points[0]!.pct)}% to ${Math.round(end.pct)}%, lowest ${Math.round(timeline.minPct)}%`}
      data-testid="range-chart"
    >
      <defs>
        <clipPath id={okClip}>
          <rect x={0} y={0} width={box.width} height={m.lowY} />
        </clipPath>
        <clipPath id={lowClip}>
          <rect x={0} y={m.lowY} width={box.width} height={box.height - m.lowY} />
        </clipPath>
      </defs>
      {m.dayColumns.map((d, i) => (
        <g key={d.day}>
          <text className={styles.dayLabel} x={(d.x0 + d.x1) / 2} y={16} textAnchor="middle">
            {d.label}
          </text>
          {i > 0 && <line className={styles.divider} x1={d.x0} x2={d.x0} y1={box.padT} y2={box.height - box.padB} />}
        </g>
      ))}
      {m.yTicks.map((t) => (
        <g key={t.pct}>
          {t.pct !== 20 && <line className={styles.grid} x1={box.padL} x2={box.width - box.padR} y1={t.y} y2={t.y} />}
          <text className={t.pct === 20 ? styles.tickLow : styles.tick} x={box.padL - 10} y={t.y + 4} textAnchor="end">
            {t.pct}%
          </text>
        </g>
      ))}
      <line className={styles.lowLine} x1={box.padL} x2={box.width - box.padR} y1={m.lowY} y2={m.lowY} data-testid="range-low-line" />
      <path className={styles.line} d={m.path} clipPath={`url(#${okClip})`} />
      <path className={styles.lineLow} d={m.path} clipPath={`url(#${lowClip})`} data-testid="range-low-path" />
      {m.charges.map((c, i) => (
        <g key={i} transform={`translate(${c.x - 22} ${c.y - 11})`}>
          <circle cx={11} cy={11} r={11} fill="var(--sky)" />
          <g transform="translate(3 3)" color="var(--sky-ink)">
            <BoltIcon size={16} />
          </g>
        </g>
      ))}
      <circle className={endP.pct < timeline.lowPct ? styles.dotLow : styles.dot} cx={endP.x} cy={endP.y} r={5} />
      <circle className={styles.dot} cx={m.points[0]!.x} cy={m.points[0]!.y} r={5} />
      {m.labels.map((l, i) => (
        <text key={i} data-kind={l.kind} className={l.low ? styles.labelLow : styles.label} x={l.x} y={l.y} textAnchor={l.anchor}>
          {l.text}
          {l.suffix && <tspan className={styles.labelSuffix}> {l.suffix}</tspan>}
        </text>
      ))}
    </svg>
  );
}
