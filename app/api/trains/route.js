import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Addison (Brown Line), Loop-bound platform specifically — using this stop ID
// instead of the station's mapid means the CTA API only ever returns
// Loop-bound trains, no client-side filtering needed.
// Source: CTA Train Tracker API docs, Appendix B (Individual Stop IDs).
const ADDISON_LOOPBOUND_STPID = 30278;

const BASE_URL = 'http://lapi.transitchicago.com/api/1.0/ttarrivals.aspx';

export async function GET() {
  const key = process.env.CTA_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'CTA_API_KEY not configured', departures: [] }, { status: 500 });
  }

  const url = `${BASE_URL}?key=${key}&stpid=${ADDISON_LOOPBOUND_STPID}&max=2&outputType=JSON`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.ctatt?.errCd && data.ctatt.errCd !== '0') {
      return NextResponse.json(
        { error: data.ctatt.errNm || `CTA error ${data.ctatt.errCd}`, departures: [] },
        { status: 502 }
      );
    }

    const etas = Array.isArray(data.ctatt?.eta) ? data.ctatt.eta : [];
    const departures = etas.map((eta) => {
      const arrival = new Date(eta.arrT.replace(' ', 'T'));
      const now = new Date();
      const minutes = Math.max(0, Math.round((arrival - now) / 60000));
      return {
        destination: eta.destNm, // should always be "Loop" — this stop is Loop-bound only
        minutes,
        due: eta.isApp === '1' || minutes === 0,
        delayed: eta.isDly === '1'
      };
    });

    return NextResponse.json(
      { station: 'Addison (Brown Line)', departures, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err), departures: [] }, { status: 500 });
  }
}
