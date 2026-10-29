import { weatherIcon } from "@shared/weather";

const CLOUD = "M7 18h10a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7.1 9.6 4.2 4.2 0 0 0 7 18z";

export function WeatherIcon({ code, size = 28 }: { code: number | null; size?: number }) {
  const kind = weatherIcon(code);
  const sun = <circle cx="12" cy="12" r="4.5" fill="var(--sunshine)" stroke="none" />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8aa1b8" strokeWidth={1.5} strokeLinecap="round" role="img" aria-label={kind}>
      {kind === "sun" && (
        <>
          {sun}
          <path stroke="var(--sunshine)" d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5" />
        </>
      )}
      {kind === "partly" && (
        <>
          <circle cx="15" cy="8.5" r="3.5" fill="var(--sunshine)" stroke="none" />
          <path d={CLOUD} fill="#fff" />
        </>
      )}
      {(kind === "cloud" || kind === "fog" || kind === "snow") && <path d={CLOUD} fill="#fff" />}
      {(kind === "rain" || kind === "storm") && (
        <>
          <path d={CLOUD} fill="#fff" transform="translate(0 -3)" />
          <path stroke="#4c8deb" d="M9 18.5l-1 2M13 18.5l-1 2M17 18.5l-1 2" />
        </>
      )}
    </svg>
  );
}
