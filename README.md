# HomeBody

A calm, personal workout PWA: a 252-exercise library with stick-figure pose icons, equipment filters, a guided set-by-set session flow with timestamp-based timers and break tracking, standalone timers, and an analytics dashboard. React + TypeScript + Vite, no backend.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173 (also exposed on your LAN, so you can open it on your phone)
npm test           # unit tests (session engine, storage, stats, dataset, pose icons)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build (service worker active)
```

Requires Node 20+.

## Deploy to Vercel

Vercel detects Vite automatically: build command `npm run build`, output `dist`. `vercel.json` adds the SPA rewrite (so `/analytics` etc. work on refresh) and cache headers for the service worker.

**Option A: Git (recommended)**
1. In Vercel, choose **Add New → Project** and import `walidsheikh365/HomeBody`.
2. Leave every setting at its default and choose **Deploy**. Every push to `main` then redeploys automatically.

**Option B: CLI**
```bash
npm i -g vercel
vercel          # first run links the project, then gives a preview URL
vercel --prod   # production URL
```

## Add to your iPhone Home Screen

1. Open the production URL in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Launch it from the icon. It opens full-screen (standalone), and the status bar follows the theme.

Notes for iPhone:
- Sounds play through Web Audio, which follows the **ring/silent switch**. Turn silent mode off to hear the timer cues.
- The screen stays awake during a session through the Wake Lock API (iOS 16.4+). On older iOS it falls back to the normal Auto-Lock.
- Timers are based on timestamps, so they stay correct if the phone locks briefly. A cue beep that would have played while the phone was locked is skipped, so stale beeps don't fire when you come back.
- Data on the Home Screen app and in Safari is stored **separately**. Pick one, and use Export/Import to move data.

## Back up and move data

**Settings → Your data**
- **Export** saves a JSON file. On iPhone it opens the share sheet, so you can save it to Files or AirDrop it to your Mac.
- **Import (Merge)** adds sessions that aren't already present, matching by ID. Use this to combine phone and desktop history.
- **Import (Replace)** restores everything from a backup.

## Architecture

```
src/
  data/exercises.ts      exercise library (id, name, body part, secondary, equipment, cue, kind)
  data/meta.ts           body-part order and equipment labels
  figures/               stick-figure pose engine, pose library, exercise → pose mapping
  lib/storage.ts         DataStore interface + LocalStore (localStorage) implementation
  lib/stats.ts           analytics computations (streaks, weekly, body parts, breaks, daily log)
  lib/audio.ts           Web Audio beeps (iOS unlock on first tap)
  lib/wakeLock.ts        Screen Wake Lock with re-acquire and graceful fallback
  lib/useNow.ts          render ticker; all timers derive from Date.now() - startedAt
  store/sessionEngine.ts pure guided-session transitions (complete, skip, back, extra set, breaks)
  store/AppStore.tsx     React context; persists each slice through the DataStore
  pages/                 Exercises, Session (builder/guided/summary), Timer, Analytics, Settings
  styles/global.css      themes (Soleil, Luna, Aurora) as CSS variables + layout
public/                  manifest, icons, service worker
```

**Swapping in a backend:** implement `DataStore` (in `src/lib/storage.ts`) on top of Supabase, Vercel KV or similar, and return it from `getDataStore()`. The UI only talks to that interface.

**Adding an exercise:** add a row to `src/data/exercises.ts`, then map its id to a pose in `src/figures/map.ts`. A test fails if any exercise has no pose.

**Regenerating the app icons:** `npm run icons`.
