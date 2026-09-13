import { NextResponse } from 'next/server';
import { BASE_URL, LEAGUE_PATHS, todayInChicago, normalizeGames } from '../../lib/balldontlie';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') === 'nfl' ? 'nfl' : 'cfb';
  const key = process.env.BALLDONTLIE_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: 'BALLDONTLIE_API_KEY not configured', games: [] },
      { status: 500 }
    );
  }

  const path = LEAGUE_PATHS[league];
  const date = todayInChicago();
  const url = `${BASE_URL}/${path}/v1/games?dates[]=${date}`;

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: key }
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Upstream error ${res.status}: ${body.slice(0, 300)}`, games: [] },
        { status: 502 }
      );
    }

    const data = await res.json();
    const games = normalizeGames(data);

    return NextResponse.json(
      { league, games, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err), games: [] }, { status: 500 });
  }
}
