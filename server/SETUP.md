# Connecting your real accounts

This backend holds API secrets and talks to each platform on your behalf, so
the frontend never sees a client secret. Nothing here is required — every
platform falls back to mock data until you connect it.

## Run both servers

```bash
# Terminal 1 — backend
cd server
npm install
cp .env.example .env   # fill in whatever you have
npm run dev            # http://localhost:8787

# Terminal 2 — frontend
cd ..
npm run dev            # http://localhost:5173
```

Then open the app, go to **Settings → Live Data Connections**, and click
**Connect** next to any platform whose credentials you've added to
`server/.env`.

## Known limits

- YouTube supports **two connected accounts** (Main + Live) via two separate
  OAuth logins. TikTok and Instagram support two each as well, via Apify
  usernames instead of OAuth (see below).
- Live data overrides **followers/subscribers** and **weekly growth** for any
  connected platform. Weekly growth works by snapshotting today's follower
  count (in `server/app-data.json` under `creator-os-follower-history`)
  every time the app fetches `/api/metrics` — once a snapshot from ~7 days
  ago exists, real growth numbers appear; until then the UI honestly says
  "gathering history" instead of showing a number. **Engagement rate** is
  still a mock placeholder — none of the connected APIs expose a true
  engagement-rate figure at the account level.

---

## Twitch (~5 minutes, works immediately)

1. Go to [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps) and
   register a new application.
2. OAuth Redirect URL: `http://localhost:8787/auth/twitch/callback`
3. Category: "Application Integration" (or whatever fits).
4. Copy the **Client ID**, then generate and copy a **Client Secret**.
5. Put both in `server/.env` as `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`.
6. Restart the backend, click **Connect** next to Twitch in Settings, log in
   and authorize. Followers + live status should now be real.

No app review needed — this works for your own channel right away.

---

## YouTube (~10 minutes, works immediately)

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create
   a project (or reuse one).
2. **APIs & Services → Library** → enable **YouTube Data API v3**.
3. **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**.
   - Application type: Web application.
   - Authorized redirect URI: `http://localhost:8787/auth/youtube/callback`
4. **APIs & Services → OAuth consent screen** → set to "Testing" and add your
   own Google account as a test user (this skips Google's review process
   entirely for personal use).
5. Copy the **Client ID** and **Client Secret** into `server/.env` as
   `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`.
6. Restart the backend, connect YouTube in Settings.

---

## TikTok & Instagram via Apify (~5 minutes total, no app review)

Both platforms' official developer portals require business verification
and/or app review just to get a follower count — a lot of overhead for a
personal dashboard. Instead, both use [Apify](https://apify.com) actors to
read your own public profile: `apidojo/tiktok-profile-scraper` for TikTok
and `apify/instagram-profile-scraper` for Instagram. One Apify account and
one API token cover both.

**Tradeoff to know:** this scrapes public profile pages rather than using
each platform's official API, which technically isn't sanctioned by their
Terms of Service, and it can break if either site changes or the actor
falls out of date. For a low-stakes personal tool this is a reasonable
bet — just know it's not "official."

1. Go to [apify.com](https://apify.com) and sign up (free tier includes $5
   of credit — enough for a very long time of just checking a couple of
   profiles).
2. Go to **Settings → Integrations** in your Apify console and copy your
   **API token**.
3. Put it in `server/.env` as `APIFY_API_TOKEN`.
4. Restart the backend, then in the app go to **Settings** and type the
   username (no `@`) into **TikTok — Main/Clips** and/or
   **Instagram — Main/Clips** — no redirect, no login screen, no Facebook
   Page or Business account required. It calls Apify immediately and shows
   real follower counts.

Cost is pay-per-use — checking one profile costs a fraction of a cent, so
the free credit alone should last months of casual use across both
platforms.
