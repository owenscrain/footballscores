# Gridiron Board

A live football scoreboard built for a small vertical (9:16) display. Automatically
shows **college football on Saturdays** and the **NFL on Sundays** (any other day it
falls back to NFL, since Thursday/Monday night games happen too). Cycles through
every game for the day, live scores update in the background, no setup beyond
deploying it.

Data comes from ESPN's public scoreboard endpoints — free, no API key needed. A
tiny server route (`app/api/scores/route.js`) fetches it and reshapes it; the
frontend polls that route every 20 seconds and rotates to the next game every 7
seconds. Tap/click the screen to pause rotation; tap a dot to jump to a specific
game; the CFB / NFL / AUTO pills at the bottom let you override which league is
showing.

## 1. Run it locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Resize your browser window to something tall and
narrow (e.g. 400x800) to preview it the way it'll look on your display.

## 2. Push it to GitHub

Vercel deploys from a git repo, so put this folder in one:

```bash
git init
git add .
git commit -m "Initial scoreboard"
gh repo create gridiron-board --private --source=. --push
```

(No `gh` CLI? Create an empty repo on github.com, then `git remote add origin
<your-repo-url>` and `git push -u origin main`.)

## 3. Deploy to Vercel

1. Go to https://vercel.com/new and import the GitHub repo you just created.
2. Framework preset will auto-detect as **Next.js** — leave all settings default.
3. No environment variables are needed (ESPN's endpoint is public).
4. Click **Deploy**. In about a minute you'll get a URL like
   `https://gridiron-board.vercel.app`.

Every future `git push` redeploys automatically.

## 4. Point Ablesign at it (Fire TV)

Ablesign displays content through playlist items, so add this as a **Web Page /
URL** item rather than an image or video:

1. In the Ablesign dashboard, open the playlist (or screen) assigned to your
   Fire TV device.
2. Add a new content item and choose the **Web Page / Website / URL** type
   (naming varies slightly by Ablesign plan/version).
3. Paste your Vercel URL, e.g. `https://gridiron-board.vercel.app`.
4. Set the item's duration to something long — a full day (`86400` seconds) or
   the max your plan allows. The page already updates itself in place (polling
   scores every 20s, rotating games every 7s), so it doesn't need Ablesign to
   reload it on a timer. If Ablesign has an "auto-refresh this web item" option,
   you can leave it off, or set it to something infrequent like once an hour as
   a safety net in case the tab ever stalls.
5. If the playlist has other items in rotation, either make this the only item,
   or give it the lion's share of the loop duration — otherwise you'll only see
   it for a few seconds at a time.
6. Confirm the screen/device orientation in Ablesign is set to **portrait**
   (9:16) to match the layout, and push the update to the Fire TV Stick.

Fire TV's built-in webview is Chromium-based, so everything here (CSS grid,
`fetch`, custom fonts) renders fine without any extra config.

If you ever want to sanity-check the page outside of Ablesign, just open the
Vercel URL in any browser and shrink the window to a tall, narrow size.

## How the league switching works

`app/page.js` has a `leagueForToday()` function: Saturday → `cfb`, everything else
→ `nfl`. It's re-checked once a minute so the board flips over automatically at
midnight without a refresh. If you'd rather it stay on one league permanently, tap
the CFB or NFL pill — that disables AUTO until you tap AUTO again.

## Weather & time

`app/api/weather/route.js` pulls current conditions from [Open-Meteo](https://open-meteo.com)
(also free, no key) for a fixed coordinate near Wrigley Field / the North Side —
edit the `LAT`/`LON` constants there if you ever want a different spot. The
footer polls it every 15 minutes and shows temperature + a simple weather icon.

The clock in the footer is always rendered in **US Central time** — via
`timeZone: 'America/Chicago'` in `app/page.js` — regardless of what timezone the
Fire TV Stick itself is set to.

## Train departures (CTA)

`app/api/trains/route.js` pulls live arrivals from the [CTA Train Tracker
API](https://www.transitchicago.com/developers/traintracker/) for **Addison
(Brown Line), Loop-bound platform only** — it queries stop ID `30278`
specifically (not the whole station), so the CTA API itself only ever returns
Loop-bound trains; no extra filtering needed on our end. The footer area shows
the next two Loop-bound departures, polled every 30 seconds.

**Set up the API key before deploying:**

1. Copy `.env.local.example` to `.env.local` for local dev (`.env.local` is
   git-ignored, so it won't get committed).
2. In Vercel: Project Settings → Environment Variables → add `CTA_API_KEY`
   with the same value, for all environments.

Since this key was shared in a chat transcript, it's worth regenerating a
fresh one from CTA's [developer portal](https://www.transitchicago.com/developers/)
once you're set up, just as good hygiene — CTA keys are low-stakes (rate
limited, no billing attached) but there's no reason to leave the original
one active longer than needed.

If you ever want a different station/direction, the CTA docs list every
stop ID — Appendix B of the [Train Tracker developer guide](https://www.transitchicago.com/assets/1/6/cta_Train_Tracker_API_Developer_Guide_and_Documentation.pdf)
has the full table; just swap the `ADDISON_LOOPBOUND_STPID` constant.

## Forcing a specific league

Auto-detection picks CFB on Saturdays and NFL every other day. To pin one
league permanently (handy for Ablesign, or to test the other league on a
Saturday), just add a query param to the URL you give Ablesign:

```
https://your-app.vercel.app?league=nfl
https://your-app.vercel.app?league=cfb
```

## Customizing

- **Poll / rotation speed** — `SCORES_POLL_MS`, `WEATHER_POLL_MS`, and `ROTATE_MS` constants at the top of `app/page.js`.
- **Colors** — CSS variables at the top of `app/globals.css` (`--bg`, `--live`, etc). Each team's color bar under its score uses that team's real color, pulled live from ESPN.
- **Fonts** — loaded in `app/layout.js` via `next/font/google`: Oswald + JetBrains Mono for the score content, and a system `Helvetica Neue/Helvetica/Arial` stack (CTA's actual signage typeface) for the header, footer, and (eventually) train rows. Real Helvetica is commercially licensed, so non-Apple devices will substitute their closest system font — Android/Fire OS uses Roboto.
- **FCS/other divisions** — the college endpoint is filtered to FBS (`groups=80`) in `app/api/scores/route.js`. Remove that query param to get all divisions.

## Not wired up yet

Everything from the original plan is now connected: scores, weather, Central
time, and CTA train departures. Future refinements (styling tweaks, additional
stations, etc.) can build on top of this.
