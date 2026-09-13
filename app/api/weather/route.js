import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Roughly Wrigley Field / North Side Chicago.
const LAT = 41.9484;
const LON = -87.6553;

const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FChicago`;

// Collapse Open-Meteo's WMO weather codes into a handful of icon buckets.
function categorize(code) {
  if (code === 0) return 'clear';
  if ([1, 2, 3].includes(code)) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'cloudy';
}

export async function GET() {
  try {
    const res = await fetch(URL, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    const tempF = Math.round(data.current?.temperature_2m ?? null);
    const code = data.current?.weather_code ?? null;

    return NextResponse.json(
      { tempF, category: categorize(code), fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
