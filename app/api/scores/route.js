import { NextResponse } from 'next/server';

// Force this route to always run fresh on the server — never statically cached.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ENDPOINTS = {
  cfb: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=100',
  nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
};

function normalizeGame(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const competitors = comp.competitors || [];
  const home = competitors.find((c) => c.homeAway === 'home');
  const away = competitors.find((c) => c.homeAway === 'away');
  if (!home || !away) return null;

  const status = event.status || comp.status || {};
  const statusType = status.type || {};

  const mapTeam = (c) => ({
    id: c.team?.id,
    name: c.team?.shortDisplayName || c.team?.name || c.team?.displayName || 'TBD',
    abbrev: c.team?.abbreviation || '—',
    logo: c.team?.logo || null,
    color: c.team?.color ? `#${c.team.color}` : '#3a4150',
    altColor: c.team?.alternateColor ? `#${c.team.alternateColor}` : '#8a93a3',
    score: c.score ?? '0',
    winner: !!c.winner,
    record: c.records?.[0]?.summary || null,
    rank: c.curatedRank && c.curatedRank.current < 26 ? c.curatedRank.current : null
  });

  return {
    id: event.id,
    name: event.shortName || event.name,
    startDate: event.date,
    state: statusType.state, // 'pre' | 'in' | 'post'
    completed: !!statusType.completed,
    statusDetail: statusType.shortDetail || statusType.detail || '',
    period: status.period ?? comp.status?.period ?? null,
    displayClock: status.displayClock ?? comp.status?.displayClock ?? null,
    venue: comp.venue?.fullName || null,
    home: mapTeam(home),
    away: mapTeam(away)
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') === 'nfl' ? 'nfl' : 'cfb';
  const url = ENDPOINTS[league];

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (kiosk-scoreboard)' }
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error ${res.status}`, games: [] },
        { status: 502 }
      );
    }

    const data = await res.json();
    const games = (data.events || [])
      .map(normalizeGame)
      .filter(Boolean);

    return NextResponse.json(
      { league, games, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err), games: [] },
      { status: 500 }
    );
  }
}
