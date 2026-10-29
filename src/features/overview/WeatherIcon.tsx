import { weatherIcon } from "@shared/weather";

const SUN = "#ffb547";
const CLOUD = "#c9ced6";
const RAIN = "#4c8deb";

function Cloud({ x = 0, y = 0, fill = CLOUD }: { x?: number; y?: number; fill?: string }) {
  return <path transform={`translate(${x} ${y})`} d="M9 26h19a6 6 0 0 0 .6-12A9 9 0 0 0 11 12.5 6.8 6.8 0 0 0 9 26z" fill="#fff" stroke={fill} strokeWidth={2} strokeLinejoin="round" />;
}

export function WeatherIcon({ code, size = 40, label }: { code: number | null; size?: number; label?: string }) {
  const kind = weatherIcon(code);
  const sun = (
    <g stroke={SUN} strokeWidth={2.4} strokeLinecap="round">
      <circle cx={20} cy={20} r={7} fill={SUN} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={20 + Math.cos(a) * 11} y1={20 + Math.sin(a) * 11} x2={20 + Math.cos(a) * 15} y2={20 + Math.sin(a) * 15} />;
      })}
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={label ?? kind} data-icon={kind}>
      {kind === "sun" && sun}
      {kind === "partly" && (
        <>
          <g transform="translate(-4 -5) scale(.8)">{sun}</g>
          <Cloud x={2} y={4} />
        </>
      )}
      {(kind === "cloud" || kind === "fog" || kind === "snow") && <Cloud x={1} y={4} />}
      {kind === "rain" && (
        <>
          <Cloud x={1} y={0} fill={RAIN} />
          <g stroke={RAIN} strokeWidth={2.2} strokeLinecap="round">
            <line x1={13} y1={30} x2={11} y2={35} />
            <line x1={20} y1={30} x2={18} y2={35} />
            <line x1={27} y1={30} x2={25} y2={35} />
          </g>
        </>
      )}
      {kind === "storm" && (
        <>
          <Cloud x={1} y={0} fill="#6a62b8" />
          <path d="M21 24l-5 8h5l-2 6 7-9h-5z" fill={SUN} />
        </>
      )}
      {kind === "fog" && (
        <g stroke={CLOUD} strokeWidth={2.2} strokeLinecap="round">
          <line x1={8} y1={32} x2={32} y2={32} />
          <line x1={12} y1={37} x2={28} y2={37} />
        </g>
      )}
      {kind === "snow" && (
        <g fill={RAIN}>
          <circle cx={13} cy={34} r={1.6} />
          <circle cx={20} cy={36} r={1.6} />
          <circle cx={27} cy={34} r={1.6} />
        </g>
      )}
    </svg>
  );
}

export function HeroArt() {
  return (
    <svg viewBox="0 0 260 150" width="100%" role="img" aria-label="Sun over waves" style={{ maxWidth: 260 }}>
      <circle cx={140} cy={45} r={42} fill="none" stroke={SUN} strokeWidth={1.5} strokeDasharray="2 5" strokeLinecap="round" />
      <circle cx={140} cy={45} r={30} fill={SUN} />
      <path d="M0 98c20-18 40-18 60 0s40 18 60 0 40-18 60 0 40 18 60 0" fill="none" stroke="#2c6e91" strokeWidth={5} strokeLinecap="round" />
      <path d="M0 128c20-18 40-18 60 0s40 18 60 0 40-18 60 0 40 18 60 0" fill="none" stroke="#a9c5d3" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}
