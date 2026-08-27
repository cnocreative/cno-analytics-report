# Turning on Saves (and CNO's real engagement-rate formula)

Written 27 Aug 2026, after the July close. This is **not** a replacement for
[`META_SETUP_FOR_OWNER.md`](META_SETUP_FOR_OWNER.md) — that file owns the Meta app creation and
App Review work. This one covers only the reporting-side question: where saves come from, and how
to switch a platform's source without breaking the numbers.

---

## The problem in one line

Rella does not return saves. The report app supports them, and CNO's own standard depends on them.

## Why it matters more than it looks

The app's stated engagement-rate standard is:

> **(Likes + comments + shares + saves) ÷ reach × 100** — reach is the denominator, not followers.

with a documented fallback: *"If interaction components are incomplete, the report uses the
platform/Rella engagement total divided by reach."*

That fallback is currently active. The July data brief confirmed it directly —
`engagement_rate_source: "platform/Rella engagement total ÷ reach"`. So **every engagement rate on
the July reports is the fallback, not CNO's standard formula.** Adding saves fixes the missing
metric and the formula in the same move.

`01_METRICS_DICTIONARY.md` already treats saves as a promoted, high-intent metric — "Saves and
Shares (track separately — high intent)" — so the standard and the dictionary agree; only the data
is missing.

## Shares are already fine

Rella returns shares per post, they are in the July CSVs, and they render correctly. Nothing to do.

## Where saves actually come from

The native Meta connector already requests and maps them. In `sync-service/src/providers.js`:

- **line 331** — per-post request: `metric: "reach,impressions,plays,saved,shares,total_interactions,video_views"`
- **line 334** — `saves: vals.saved`
- **line 283** — account-level total map includes `saves: "saves"`

So the code is written and waiting. The gap is the connection, not the software. This also matches
the month-close skill's own connector table, which says of Meta/Instagram: **"Use native. Richest
source available."**

## Render is NOT where you connect the accounts

This is the easiest thing to get wrong, so it is worth being precise. There are three separate
places, and only one of them is where a client account actually gets connected.

| Where | What happens there | Who does it |
|---|---|---|
| **developers.facebook.com** | The Meta app is created inside CNO's verified business portfolio, permissions are added, and App Review is submitted for `instagram_manage_insights` and friends | Christa creates the app (Meta requires the portfolio owner); the rest is CNO-side |
| **Render** | Only stores the app's credentials as environment variables — `META_CLIENT_ID` and `META_CLIENT_SECRET` — plus the redirect URI config. Plumbing, set once, never touched again | CNO-side, one-time |
| **The connection console**, `https://sync.cnocreative.co/admin` | **This is where accounts are actually connected.** Sign in with CNO's internal token, choose the client, click Connect, sign in on Meta's own page, approve analytics access, and assign the exact profile to that client workspace | Per client, in the browser |

So: Render is a one-time prerequisite, not the monthly step. Once the credentials are in place, every
client's Instagram and Facebook is connected through the console by OAuth — no tokens copied, no
commands, and CNO never sees the client's password or two-factor code.

`META_SETUP_FOR_OWNER.md` covers the developers.facebook.com and Render halves in detail, including
the fact that Meta attaches permissions through *use cases* chosen at app-creation time and cannot
add them later — which is why that file says to create a fresh app rather than patch an old one.

## What is and isn't known about the current state

- `https://sync.cnocreative.co/health` returns `"setup_complete": true`, which means the admin
  token and encryption key are set **and at least one platform's app credentials are configured**.
  It does *not* tell us which platform, whether Meta App Review passed, or whether any client
  account is actually connected.
- Confirming that needs the connection console at `https://sync.cnocreative.co/admin`, which
  requires CNO's internal access token. Claude does not have it and should not be given it.

**So the first step next run is simply: Christa signs into the console and reads what is connected.**
Everything below depends on that answer.

---

## The rule that must not be broken when switching sources

**One source per platform, per grain.**

The importer only collapses rows that match on *every* value. Native rows and Rella rows never
match, so if both are loaded for the same platform at the same grain, every post is counted twice
and every total, rate and ranking for that platform is overstated. This is verified behaviour, not
a theory. The data audit raises **"came from more than one source"** when it happens — if that
appears, remove one source and re-import rather than explaining it away.

Mixing *grains* is fine and often correct: a native daily account series alongside Rella post
detail is legitimate.

## The source split once native Meta is live

| Platform | Source | Why |
|---|---|---|
| Instagram | **native Meta** | Only source with saves; also gives a real daily series and full post detail |
| Facebook | **native Meta** | Same connector, same reason |
| LinkedIn | Rella | No CNO LinkedIn app exists; native returns nothing |
| TikTok | Rella | Native returns one snapshot row only — no reach, impressions, or profile visits |
| YouTube | Rella | Not covered by the native connectors |

Instagram and Facebook move **entirely** to native — account rows and post rows both. They must not
keep any Rella rows once switched.

## Doing it next run — the order

1. Christa signs into `/admin` and reports what is connected for each client.
2. If Meta is live for a client: **Sync now** for that client across the month, then
   **Open latest in CNO Reports** to push the rows into the report window.
3. Build that client's Rella CSV for LinkedIn / TikTok / YouTube **only** — no Instagram or
   Facebook rows in it at all.
4. Import both. Run **Data audit** and confirm "came from more than one source" does **not**
   appear. If it does, stop and remove a source.
5. Check that the engagement-rate source has changed away from the Rella fallback, and that saves
   are populated rather than zero.
6. Only then build the letter and the link.

## Until then

Reports stay Rella-only, saves stay absent, and the engagement rate stays on the fallback formula.
Both should keep being flagged in the sender notes each month.

**One caution for client conversations:** the report currently renders missing saves as a flat
**zero** in the "Audience quality" panel rather than as unavailable. If a client asks, the honest
answer is that the data source does not carry saves — not that nobody saved anything. Worth fixing
app-side so absence reads as "—" rather than "0".
