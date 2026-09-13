export const BASE_URL = 'https://api.balldontlie.io';

// League path segments in BALLDONTLIE's API.
export const LEAGUE_PATHS = {
  cfb: 'ncaaf',
  nfl: 'nfl'
};

// Today's date in Chicago time, formatted YYYY-MM-DD for the API's
// dates[] filter — matches the same timezone logic used everywhere
// else in the app (leagueForToday, the clock, etc).
export function todayInChicago() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// BALLDONTLIE doesn't provide team colors or logos, so we derive a stable
// (but not "real") color per team from its name — same team always gets
// the same color, it just isn't necessarily the school's actual color.
export function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function teamDisplayName(team) {
  return team?.college || team?.location || team?.full_name || team?.name || 'TBD';
}

function deriveState(statusRaw) {
  const status = (statusRaw || '').toLowerCase();
  if (status.includes('final')) return 'post';
  if (/qtr|quarter|half|overtime|\bot\b|in progress|live/.test(status)) return 'in';
  return 'pre';
}

export function normalizeGame(g) {
  if (!g) return null;

  const homeTeam = g.home_team;
  const awayTeam = g.away_team || g.visitor_team;
  if (!homeTeam || !awayTeam) return null;

  const homeScore = g.home_team_score ?? 0;
  const awayScore = g.away_team_score ?? g.visitor_team_score ?? 0;
  const state = g.status_state || deriveState(g.status);
  const completed = state === 'post';

  const mapTeam = (team, score, isWinner) => ({
    id: team.id,
    name: teamDisplayName(team),
    abbrev: team.abbreviation || '—',
    logo: null, // BALLDONTLIE doesn't provide logo URLs
    color: hashColor(team.abbreviation || teamDisplayName(team)),
    score: String(score),
    winner: isWinner,
    record: null,
    rank: null // ranking join not wired up yet — see README
  });

  return {
    id: g.id,
    name: `${teamDisplayName(awayTeam)} @ ${teamDisplayName(homeTeam)}`,
    startDate: g.datetime || g.date,
    state,
    completed,
    statusDetail: g.status || '',
    period: g.period ?? null,
    displayClock: null, // not separately provided — statusDetail already has it, e.g. "3rd Qtr"
    venue: g.venue || null,
    home: mapTeam(homeTeam, homeScore, completed && homeScore > awayScore),
    away: mapTeam(awayTeam, awayScore, completed && awayScore > homeScore)
  };
}

export function normalizeGames(data) {
  return (data?.data || []).map(normalizeGame).filter(Boolean);
}
