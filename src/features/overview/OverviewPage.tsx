import { useEffect, useState } from "react";
import { isEmphasizedPrayer, PRAYER_NAMES } from "@shared/prayers";
import { formatTime, formatTimeCompact, laParts } from "@shared/time";
import type { Place, Trip, TripDay, TripEvent, Weather, WeatherDay } from "@shared/types";
import { useTrip, useWeather } from "../../api/hooks";
import { useLoginDialog } from "../../auth/LoginDialog";
import { useCanEdit } from "../../auth/useCanEdit";
import { CarIcon } from "../../components/icons";
import { batteryNow, countdownLabel, nowNext, todayIndex, tripPhase, type UpcomingItem } from "./today";
import { HeroArt, WeatherIcon } from "./WeatherIcon";
import styles from "./Overview.module.css";

const FULL_DAY: Record<string, string> = { Sat: "Saturday", Sun: "Sunday", Mon: "Monday", Tue: "Tuesday" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const planTitle = (t: string) => t.replace(/^(Brunch|Dinner):\s*/, "");
const pct = (n: number) => `~${Math.round(n)}%`;

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Avatars() {
  return (
    <span className={styles.avatars} aria-hidden>
      <span className={`${styles.av} ${styles.avE}`}>E</span>
      <span className={`${styles.av} ${styles.avO}`}>Ö</span>
    </span>
  );
}

function AirbnbCard({ lodging, doorCode }: { lodging: Place | undefined; doorCode: string | undefined }) {
  const canEdit = useCanEdit();
  const { openLogin } = useLoginDialog();
  const [shown, setShown] = useState(false);
  const link = lodging?.links?.[0];
  return (
    <div className={`card ${styles.airbnb}`} data-testid="airbnb-card">
      <div>
        <h2>Airbnb</h2>
        <div className={styles.addr}>{lodging?.address ?? ""}</div>
      </div>
      <div className={styles.times}>
        <div>Check-in<b>after 3 PM</b></div>
        <div>Check-out<b>before 10 AM</b></div>
      </div>
      <div className={styles.codeRow}>
        {canEdit ? (
          <>
            <button type="button" className={styles.dark} aria-pressed={shown} onClick={() => setShown((s) => !s)} data-testid="door-code-toggle">
              {shown ? "Hide code" : "Show code"}
            </button>
            <span className={styles.code} data-testid="door-code" aria-live="polite">
              {shown ? (doorCode ?? "Not set") : "••••"}
            </span>
          </>
        ) : (
          <>
            <button type="button" className={styles.dark} onClick={openLogin} data-testid="door-code-login">
              Log in to see the door code
            </button>
            <span className={styles.code} data-testid="door-code" aria-label="Door code hidden">••••</span>
          </>
        )}
        {link && (
          <a className={styles.guide} href={link.url} target="_blank" rel="noreferrer">
            {link.label} →
          </a>
        )}
      </div>
    </div>
  );
}

function dotClass(e: TripEvent, place: Place | undefined) {
  if (e.kind === "locked") return styles.fixed;
  if (e.kind === "booked") return styles.booked;
  if (place?.category === "food") return styles.food;
  return styles.activity;
}

function DayCard({ day, weather, weatherFailed, placesById, last }: { day: TripDay; weather: WeatherDay | undefined; weatherFailed: boolean; placesById: Map<string, Place>; last: boolean }) {
  const low = day.batteryEndPct < 20;
  return (
    <article className={`card ${styles.day}`} data-testid={`day-card-${day.date}`}>
      <div className={styles.dayHead}>
        <div>
          <h3>{FULL_DAY[day.weekday] ?? day.weekday}</h3>
          <small>{day.label.replace(/^\w+, /, "")}{day.clocksFallBack ? " · Clocks fall back 1 hr" : ""}</small>
        </div>
        {weather && weather.code != null && <WeatherIcon code={weather.code} size={40} label={weather.summary} />}
      </div>
      {weather && weather.hiF == null ? (
        <div className={styles.wxErr}>Forecast not available yet</div>
      ) : weather ? (
        <div className={styles.wx}>
          <span className={styles.hi}>{weather.hiF != null ? `${Math.round(weather.hiF)}°` : "-"}</span>
          <span className={styles.lo}>{weather.loF != null ? `${Math.round(weather.loF)}°` : ""}</span>
          {weather.precipMax != null && <span className={styles.rain}>{Math.round(weather.precipMax)}% rain</span>}
        </div>
      ) : (
        <div className={styles.wxErr}>{weatherFailed ? "Weather unavailable" : "Loading weather..."}</div>
      )}
      <ul className={styles.plan} aria-label={`${FULL_DAY[day.weekday]} plan`}>
        {day.events.length === 0 && <li className={styles.empty}>Nothing planned</li>}
        {day.events.map((e) => (
          <li key={e.id} className={`${styles.item} ${e.skipped ? styles.skipped : ""}`}>
            <span className={`${styles.dot} ${dotClass(e, e.placeId ? placesById.get(e.placeId) : undefined)}`} />
            <span className={styles.n}>{planTitle(e.title)}</span>
            <span className={styles.t}>{formatTimeCompact(e.start)}</span>
          </li>
        ))}
      </ul>
      <div className={styles.prayers} data-testid={`prayers-${day.date}`}>
        {PRAYER_NAMES.map((p) => (
          <div key={p} className={`${styles.pr} ${isEmphasizedPrayer(p) ? styles.em : ""}`} data-testid={`prayer-${day.date}-${p}`}>
            <span>{cap(p)}</span>
            <span>{formatTimeCompact(day.prayers[p])}</span>
          </div>
        ))}
      </div>
      <div className={`${styles.battery} ${low ? styles.low : ""}`}>
        Battery {pct(day.batteryEndPct)} {last ? "at home" : "by night"}
      </div>
    </article>
  );
}

function rainAhead(weather: Weather | undefined, date: string, nowParts: { hour: number } | null) {
  const wd = weather?.days.find((d) => d.date === date);
  if (!wd) return null;
  const from = nowParts?.hour ?? 0;
  const hours = wd.hourly.filter((h) => h.hour >= from);
  const probs = hours.map((h) => h.precipProb).filter((n): n is number => n != null);
  const cur = hours.find((h) => h.tempF != null)?.tempF ?? wd.hiF;
  return { prob: probs.length ? Math.max(...probs) : (wd.precipMax ?? 0), tempF: cur, label: from >= 12 ? "this pm" : "today" };
}

function mapsUrl(p: Place) {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

function MobileToday({ trip, weather, now }: { trip: Trip; weather: Weather | undefined; now: Date }) {
  const phase = tripPhase(now);
  const day = trip.days[todayIndex(now, trip.days)]!;
  const nn = nowNext(day, now, phase);
  const placesById = new Map(trip.places.map((p) => [p.id, p]));
  const batt = batteryNow(trip.range, now, phase);
  const leg = nn.next ? day.legs.find((l) => l.toEventId === nn.next!.id) : undefined;
  const curPlace = nn.current?.placeId ? placesById.get(nn.current.placeId) : undefined;
  const nextPlace = nn.next?.placeId ? placesById.get(nn.next.placeId) : undefined;
  const rain = rainAhead(weather, day.date, phase === "during" ? laParts(now) : null);
  const heading = phase === "before" ? "Day 1" : phase === "after" ? "Trip complete" : (FULL_DAY[day.weekday] ?? day.weekday);
  const upcoming = nn.upcoming.slice(0, 6);
  return (
    <div className={styles.mobile} data-testid="mobile-today">
      <div className={styles.mHead}>
        <div>
          <h1>{heading}</h1>
          <small>{phase === "during" ? formatTime(now).toLowerCase() : `${FULL_DAY[day.weekday]}, ${day.label.replace(/^\w+, /, "")} · ${countdownLabel(now)}`}</small>
        </div>
        <div className={styles.batt} data-testid="today-battery">
          <span className={`${styles.bar} ${batt < 20 ? styles.low : ""}`}><i style={{ width: `${Math.max(0, Math.min(100, batt))}%` }} /></span>
          {pct(batt)}
        </div>
      </div>

      {nn.current ? (
        <div className={`${styles.tile} ${styles.now}`} data-testid="today-now">
          <div className={styles.k}>Now</div>
          <div className={styles.big}>{planTitle(nn.current.title)}</div>
          <div className={styles.sub}>until {formatTimeCompact(nn.current.end).replace(/[ap]$/, "")}</div>
          {curPlace && <a className={styles.maps} href={mapsUrl(curPlace)} target="_blank" rel="noreferrer">Open in Maps</a>}
        </div>
      ) : (
        <div className={`${styles.tile} ${styles.now}`} data-testid="today-now">
          <div className={styles.k}>Now</div>
          <div className={styles.big}>{phase === "after" ? "Trip complete" : phase === "before" ? "Trip hasn't started" : "Free time"}</div>
        </div>
      )}

      {nn.next && (
        <div className={`${styles.tile} ${styles.next}`} data-testid="today-next">
          <div className={styles.k}>Next</div>
          {leg && (
            <div className={styles.sub}>
              <CarIcon size={14} /> {leg.minutes} min drive
            </div>
          )}
          <div className={styles.big}>
            {planTitle(nn.next.title)} {formatTimeCompact(nn.next.start).replace(/[ap]$/, "")}
          </div>
          {nextPlace && <a className={styles.maps} href={mapsUrl(nextPlace)} target="_blank" rel="noreferrer">Open in Maps</a>}
        </div>
      )}

      <div className={styles.mini}>
        <div className={styles.pray} data-testid="today-prayer">
          {nn.nextPrayer ? (
            <>
              Next prayer · {cap(nn.nextPrayer.name)}
              <b>{formatTimeCompact(nn.nextPrayer.at).replace(/[ap]$/, "")}</b>
            </>
          ) : (
            <>
              Prayers
              <b>Done today</b>
            </>
          )}
        </div>
        <div className={styles.rainTile} data-testid="today-weather">
          {rain ? (
            <>
              Rain {Math.round(rain.prob)}% {rain.label}
              <b>{rain.tempF != null ? `${Math.round(rain.tempF)}°` : ""}</b>
            </>
          ) : (
            <>
              Weather
              <b style={{ fontSize: 16 }}>unavailable</b>
            </>
          )}
        </div>
      </div>

      {upcoming.length > 0 && (
        <ul className={styles.list} aria-label="Later today">
          {upcoming.map((u: UpcomingItem) => (
            <li key={u.kind === "prayer" ? u.name : u.event.id}>
              <span className={styles.when}>{formatTimeCompact(u.at).replace(/[ap]$/, "")}</span>
              {u.kind === "prayer" ? (
                <span className={`${styles.pn} ${isEmphasizedPrayer(u.name) ? styles.em : ""}`}>{cap(u.name)}</span>
              ) : (
                <span>{planTitle(u.event.title)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OverviewPage() {
  const { data: trip, isPending, error } = useTrip();
  const weatherQ = useWeather();
  const now = useNow();
  if (!trip) {
    return (
      <section data-testid="route-overview" className="stack">
        <h1>Overview</h1>
        <p className="muted">{isPending ? "Loading..." : error ? "Couldn't load the trip." : ""}</p>
      </section>
    );
  }
  const placesById = new Map(trip.places.map((p) => [p.id, p]));
  const lodging = trip.lodgingPlaceId ? placesById.get(trip.lodgingPlaceId) : undefined;
  return (
    <section data-testid="route-overview" className={styles.page}>
      <div className={styles.desktop} data-testid="overview-desktop">
        <header className={styles.hero}>
          <div>
            <span className={styles.pill} data-testid="countdown">{countdownLabel(now)}</span>
            <h1 className={styles.title}>La Jolla &amp;<br />San Diego</h1>
            <div className={styles.dates}>
              <span>Oct 31 – Nov 3</span>
              <span className={styles.who}>
                <Avatars />
                Emmad &amp; Ömer
              </span>
            </div>
          </div>
          <div className={styles.art}><HeroArt /></div>
          <AirbnbCard lodging={lodging} doorCode={trip.settings.doorCode} />
        </header>
        <div className={styles.days}>
          {trip.days.map((d, i) => (
            <DayCard
              key={d.date}
              day={d}
              weather={weatherQ.data?.days.find((w) => w.date === d.date)}
              weatherFailed={weatherQ.isError}
              placesById={placesById}
              last={i === trip.days.length - 1}
            />
          ))}
        </div>
      </div>
      <MobileToday trip={trip} weather={weatherQ.data} now={now} />
    </section>
  );
}
