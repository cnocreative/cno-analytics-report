# Running CNO Reports for free

What the free setup gives you, what it costs in behaviour, and the one place where "free" bites.

## What is genuinely free, permanently

| Piece | Free? | Notes |
|---|---|---|
| The report itself (`index.html`) | Yes, always | One self-contained file. No build, no dependencies, no server. Works offline. |
| Static site on Render | Yes | Static sites do not sleep and have no monthly hour limit. |
| Manual import of every format | Yes | CSV, TSV, XLSX, XLS, ZIP, JSON — all read in the browser. Nothing leaves the device. |
| All metrics, charts, audits, exports | Yes | Deterministic and computed locally. |
| Portable `#data=` client links | Yes | The report travels inside the URL. No service needed. |
| Desktop installers, PWA install | Yes | Built by GitHub Actions on the free tier. |
| GitHub Actions daily sync trigger | Yes | Well inside the free minute allowance for a public repo. |
| `cno-native-sync` web service | Yes, with caveats | See below. |
| Meta / TikTok / LinkedIn API access | Yes | The APIs cost nothing. The cost is review time, not money. |

## The two caveats on the free web service

**It sleeps.** Render spins a free web service down after about 15 minutes idle. The next request
takes roughly 30–60 seconds to wake it. That affects:

- CNO staff opening the connection console — mildly annoying, no more.
- **A client opening a short report link** — they wait. The report now shows "Opening your report",
  then explains the wait after six seconds, so it reads as slow rather than broken. It still is not
  a great first impression for a client-facing link.

**Free instance hours are capped per month.** One always-idle service is fine. Do not add a
keep-warm pinger to defeat the sleep: it burns the monthly allowance and can take the service down
entirely, which is worse than a slow first load.

## The database: resolved

The service runs on a free Postgres database. `/health` reports `"storage":"postgres"` and
`"durable":true`, which is what you want to see.

This matters because of what it replaced. Without a database, connections, saved report links and
pulled analytics lived in a file on the container, and **a redeploy or restart wiped them** — every
push to `main` redeploys. Client links in an inbox stopped working within hours and read to the
client as an expiry.

Two protections now exist so this cannot come back quietly:

- the service **refuses to create a client link at all** if it is running without a database, rather
  than minting one that is already doomed; and
- the monthly job **stops and reports** rather than building a month on storage that cannot keep it.

If `/health` ever shows `"durable":false`, stop and get the `DATABASE_URL` restored before creating
any client link.

### Render's free Postgres is a 30-day timer, not a free tier

Render's free Postgres **expires after 30 days** and is then deleted. Wiring it into `render.yaml`
would create a database that silently dies a month later, taking the connections and report links
with it. That is why it is deliberately **not** in the Blueprint — a time bomb is worse than an
honest gap.

### Free Postgres that does not expire

Use an external provider's free tier and paste its connection string into `DATABASE_URL`:

| Provider | Free tier | Notes |
|---|---|---|
| **Neon** | Yes, no expiry | Postgres, generous free tier, sleeps when idle but wakes in about a second. Best fit here. |
| **Supabase** | Yes, no expiry | Postgres plus extras you will not use. Pauses after a week of no activity; the daily sync keeps it active. |

Either takes a few minutes:

1. Create a free Postgres.
2. Copy the connection string (must be TLS — both providers are by default).
3. Render → `cno-native-sync` → **Environment** → set `DATABASE_URL`.
4. Restart. `/health` should now report `"storage":"postgres"` and `"durable":true`, and the console
   warning disappears.

The service creates its own tables on first boot. Nothing else to do.

## What is worth paying for, and when

Nothing, until a client depends on it. At that point, in order of value:

1. **A paid Render instance (~$7/month)** — removes the sleep, so client links open immediately.
   This is the first thing worth buying, because it is the only one a client actually notices.
2. **Managed Postgres** — only if you would rather not run Neon or Supabase.

Both are optional. A CNO-only pilot, with reports delivered as PDFs or portable links, costs nothing
at all and always will.

## Keeping it free and safe

- Do not defeat the sleep with a pinger.
- Do not put secrets in GitHub. Render generates `CNO_ADMIN_TOKEN`, `TOKEN_ENCRYPTION_KEY` and
  `SYNC_CRON_SECRET` itself; read them from the Environment tab when you need them.
- If `TOKEN_ENCRYPTION_KEY` is ever rotated, every stored authorization becomes unreadable and every
  client has to reconnect. Treat it as permanent.
- Portable `#data=` links keep working with no service at all, so they remain the zero-dependency
  fallback if the service is ever down or asleep.
