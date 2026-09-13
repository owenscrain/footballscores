'use client';

import { useEffect, useState } from 'react';
import styles from './board.module.css';

const SCORES_POLL_MS = 20000;
const WEATHER_POLL_MS = 10 * 60 * 1000; // 10 minutes
const TRAINS_POLL_MS = 15000; // 15 seconds
const ROTATE_MS = 8000;
const TIME_ZONE = 'America/Chicago';

function leagueForToday() {
  // Saturday -> college football. Everything else (incl. Thu/Mon NFL nights) -> NFL.
  // Always checked in Chicago time, not the viewing device's local timezone —
  // otherwise a device set to a different timezone can land on the wrong
  // day and silently pick the wrong league.
  const weekday = new Date().toLocaleDateString('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short'
  });
  return weekday === 'Sat' ? 'cfb' : 'nfl';
}

function sortGames(games) {
  const stateTier = (g) => (g.state === 'in' ? 0 : g.state === 'pre' ? 1 : 2);
  // Games with a ranked (Top 25) team come first within their state tier —
  // matters for CFB, harmless no-op for NFL since rank is always null there.
  const rankedTier = (g) => (g.away.rank || g.home.rank ? 0 : 1);
  return [...games].sort((a, b) => {
    const s = stateTier(a) - stateTier(b);
    if (s !== 0) return s;
    const r = rankedTier(a) - rankedTier(b);
    if (r !== 0) return r;
    return new Date(a.startDate) - new Date(b.startDate);
  });
}

function formatKickoff(iso) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE });
  const nowInZone = new Date().toLocaleDateString('en-US', { timeZone: TIME_ZONE });
  const dInZone = d.toLocaleDateString('en-US', { timeZone: TIME_ZONE });
  if (nowInZone === dInZone) return time;
  return `${d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TIME_ZONE })} ${time}`;
}

function WeatherIcon({ category }) {
  // Small inline icon set — clear/cloudy/rain/snow/storm/fog.
  switch (category) {
    case 'clear':
      return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" fill="#e9edf2" />
          <g stroke="#e9edf2" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 1.5v3M12 19.5v3M22.5 12h-3M4.5 12h-3M19.1 4.9l-2.1 2.1M7 17l-2.1 2.1M19.1 19.1L17 17M7 7 4.9 4.9" />
          </g>
        </svg>
      );
    case 'rain':
      return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.5 15a4.5 4.5 0 0 1-.5-8.98A5.5 5.5 0 0 1 16.3 4.02 4.5 4.5 0 0 1 17.5 15h-11Z" fill="#e9edf2" />
          <g stroke="#e9edf2" strokeWidth="1.6" strokeLinecap="round">
            <path d="M8 18l-1.2 2.4M12 18l-1.2 2.4M16 18l-1.2 2.4" />
          </g>
        </svg>
      );
    case 'snow':
      return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.5 15a4.5 4.5 0 0 1-.5-8.98A5.5 5.5 0 0 1 16.3 4.02 4.5 4.5 0 0 1 17.5 15h-11Z" fill="#e9edf2" />
          <g stroke="#e9edf2" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="8" cy="19.5" r="0.6" fill="#e9edf2" />
            <circle cx="12" cy="20.5" r="0.6" fill="#e9edf2" />
            <circle cx="16" cy="19.5" r="0.6" fill="#e9edf2" />
          </g>
        </svg>
      );
    case 'storm':
      return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.5 14a4.5 4.5 0 0 1-.5-8.98A5.5 5.5 0 0 1 16.3 3.02 4.5 4.5 0 0 1 17.5 14h-11Z" fill="#e9edf2" />
          <path d="M13 14l-3 5h2.5l-2 5 5-6h-2.5L15 14h-2Z" fill="#e9edf2" />
        </svg>
      );
    case 'fog':
      return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="#e9edf2" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 9h16M3 13h18M5 17h14" />
          </g>
        </svg>
      );
    case 'cloudy':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.5 19a4.5 4.5 0 0 1-.5-8.98A5.5 5.5 0 0 1 16.3 8.02 4.5 4.5 0 0 1 17.5 19h-11Z" fill="#e9edf2" />
        </svg>
      );
  }
}

function TeamCard({ team, state }) {
  const isFinal = state === 'post';
  const isPre = state === 'pre';
  const lost = isFinal && !team.winner;

  return (
    <div className={styles.teamCard}>
      <div className={`${styles.teamName} ${lost ? styles.dimmed : ''}`}>
        {team.rank && <span className={styles.rank}>#{team.rank}</span>}
        {team.name}
      </div>

      {isPre ? (
        team.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo} alt="" className={styles.teamLogo} />
        ) : (
          <span className={styles.teamLogoFallback}>{team.abbrev}</span>
        )
      ) : (
        <div className={`${styles.score} ${lost ? styles.scoreDimmed : ''}`}>{team.score}</div>
      )}

      <div className={`${styles.colorBar} ${lost ? styles.dimmed : ''}`} style={{ '--c': team.color }} />
    </div>
  );
}

function GameCard({ game }) {
  return (
    <div className={styles.card}>
      <TeamCard team={game.away} state={game.state} />

      <div className={styles.midStatus}>
        {game.state === 'in' && (
          <>
            <span className={styles.liveDot} />
            <span className={styles.midText}>
              {game.period ? `Q${game.period}` : 'LIVE'} {game.displayClock || ''}
            </span>
          </>
        )}
        {game.state === 'pre' && <span className={styles.midText}>{formatKickoff(game.startDate)}</span>}
        {game.state === 'post' && <span className={styles.midTextFinal}>FINAL</span>}
      </div>

      <TeamCard team={game.home} state={game.state} />
    </div>
  );
}

export default function Page() {
  const [league, setLeague] = useState(() => leagueForToday());
  const [games, setGames] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [activeIndex, setActiveIndex] = useState(0);
  const [weather, setWeather] = useState(null);
  const [trains, setTrains] = useState([]);
  const [clock, setClock] = useState(new Date());
  const [scale, setScale] = useState(1);

  // Keep the fixed 1080x1920 stage scaled to fit whatever window/screen
  // this actually renders in, so sizing is always exactly what it's
  // designed to be instead of drifting with the viewport's reported size.
  useEffect(() => {
    function updateScale() {
      const s = Math.min(window.innerWidth / 720, window.innerHeight / 1280);
      setScale(s);
    }
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // League: auto-detect by day of week, unless overridden with ?league=cfb|nfl in the URL
  // (handy for Ablesign — just point the playlist item's URL at ?league=nfl to pin it).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('league');
    if (override === 'cfb' || override === 'nfl') {
      setLeague(override);
      return;
    }
    const id = setInterval(() => setLeague(leagueForToday()), 60000);
    return () => clearInterval(id);
  }, []);

  // Wall clock — always rendered in US Central time regardless of device timezone.
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Scores.
  useEffect(() => {
    let cancelled = false;

    async function fetchScores() {
      try {
        const res = await fetch(`/api/scores?league=${league}`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) {
          console.error('scores fetch failed:', data.error || res.status);
          setStatus('error');
          return;
        }
        setGames(sortGames(data.games || []));
        setStatus('ready');
        setActiveIndex((i) => (data.games && data.games.length ? i % data.games.length : 0));
      } catch (e) {
        if (!cancelled) setStatus('error');
      }
    }

    fetchScores();
    const id = setInterval(fetchScores, SCORES_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [league]);

  // Weather — North Side Chicago / Wrigley Field area, polled infrequently.
  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      try {
        const res = await fetch('/api/weather', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && !data.error) setWeather(data);
      } catch (e) {
        // Leave last-known weather on screen rather than blanking it out.
      }
    }

    fetchWeather();
    const id = setInterval(fetchWeather, WEATHER_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Train departures — Addison (Brown Line), Loop-bound only.
  useEffect(() => {
    let cancelled = false;

    async function fetchTrains() {
      try {
        const res = await fetch('/api/trains', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && !data.error) setTrains(data.departures || []);
      } catch (e) {
        // Leave last-known departures on screen rather than blanking it out.
      }
    }

    fetchTrains();
    const id = setInterval(fetchTrains, TRAINS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Rotate through games.
  useEffect(() => {
    if (games.length <= 1) return;
    const id = setInterval(() => setActiveIndex((i) => (i + 1) % games.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [games.length]);

  const activeGame = games[activeIndex];
  const leagueLabel = league === 'cfb' ? 'CFB TODAY' : 'NFL TODAY';
  const timeLabel = clock.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIME_ZONE
  });

  return (
    <div className={styles.viewport}>
      <main className={styles.wrap} style={{ transform: `scale(${scale})` }}>
        <header className={styles.fheader}>{leagueLabel}</header>

        <section className={styles.fcontent}>
          {status === 'loading' && <div className={styles.centerMsg}>Loading scores…</div>}
          {status === 'error' && <div className={styles.centerMsg}>Couldn&apos;t reach ESPN. Retrying…</div>}
          {status === 'ready' && games.length === 0 && (
            <div className={styles.centerMsg}>No games today</div>
          )}
          {status === 'ready' && activeGame && <GameCard game={activeGame} />}
        </section>

        {/* Train departures — Addison (Brown Line), Loop-bound only. */}
        <div className={styles.trainRows}>
          {(trains.length > 0
            ? trains
            : [
                { destination: 'Loop', minutes: null, due: false },
                { destination: 'Loop', minutes: null, due: false }
              ]
          ).map((t, i) => (
            <div className={styles.trainRow} key={i}>
              <span className={styles.trainLabel}>{t.destination}</span>
              <span className={styles.trainEta}>
                {t.minutes === null ? (
                  <span className={styles.trainNum}>—</span>
                ) : (
                  <>
                    <span className={styles.trainNum}>{t.due ? 'Due' : t.minutes}</span>
                    {!t.due && <span className={styles.trainUnit}>min</span>}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        <footer className={styles.ffooter}>
          <div className={styles.weather}>
            {weather ? (
              <>
                <WeatherIcon category={weather.category} />
                <span className={styles.temp}>{weather.tempF}°</span>
              </>
            ) : (
              <span className={styles.temp}>—</span>
            )}
          </div>
          <div className={styles.time}>{timeLabel}</div>
        </footer>
      </main>
    </div>
  );
}
