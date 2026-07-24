# CNO Creative Co — Monthly Analytics Report

A standalone, deterministic reporting tool for CNO Creative Co. Feed it a CSV of social media data and it produces the same branded, client-ready analytics report every time.

**No required install. No required API key. No build step. Works offline.**

---

## What it does

Most social tools show isolated platform numbers. This one turns them into a **visual, client-specific measurement system** spanning awareness, audience quality, campaigns, and business outcomes.

**Reads any export.** One upload accepts multiple files at once and normalizes column names across Rella, Instagram/Meta, TikTok, LinkedIn, and YouTube — no renaming required. It auto-detects account-level vs. post-level data. See [`06_CSV_SCHEMA.md`](06_CSV_SCHEMA.md).

**One clear manual import.** Click **Import data** once, then add one CSV, many CSVs, or a whole client/month folder. The same panel audits each file's platform, row type, row count, and date coverage, safely removes exact duplicate rows, and can download one standardized combined master CSV without losing original source columns. See [`DATA_IMPORT_GUIDE.md`](DATA_IMPORT_GUIDE.md).

**Native sync foundation.** A separate CNO-only OAuth service now handles Meta, TikTok, and LinkedIn authorization server-side, encrypts tokens before storage, supports scheduled refreshes, and transfers normalized analytics into the report through ten-minute, single-use links. Provider app approval and deployment configuration are still required. See [`sync-service/README.md`](sync-service/README.md).

**Interactive, like a real dashboard.**
- Pick any **time period inside the report** — a month, last 30/90 days, all time, or a custom date range — and everything recomputes vs. the previous comparable period. No re-uploading.
- **Interactive charts** with hover tooltips and a current-vs-previous overlay, plus a sparkline on every metric card.
- A visualization-first performance board, client success scorecard, attention-to-action journey, profile/content grids, campaign and content-pillar comparisons, and the full source spreadsheet.

**Analysis the platforms don't give you.**
- **Business journey** — reach → profile visits → website clicks → leads → bookings, using only the steps present in the upload
- **Organic efficiency** — engagement rate by reach, follower growth rate, reach rate, link/profile conversion, Story retention, video completion, watch time, LinkedIn CTR
- **Paid efficiency** — CPM, CPC, CTR, frequency, cost per lead/conversion, and ROAS with paid-only denominators and tracking-aware availability
- **Anomaly detection** — spikes/dips flagged against a rolling 3-month baseline (real signal vs. noise)
- **Format intelligence** — which formats earn reach/engagement, by median (not outlier-skewed averages)
- **Effort vs. return per platform** — posts published against what they actually earned; flags dead channels
- **CNO-only data audit** — checks source coverage, row grain, non-additive reach, overlapping exports, missing KPIs, and account-total versus post-detail reconciliation before a report is published
- **No false blending** — when several platforms are checked, headline KPIs and trend charts are shown in separate platform panels instead of one cross-platform engagement rate

**Story-first and yours to shape.**
- The report **opens with the story and the client's goals**, then the numbers. A warm opening letter, a headline, and **Working Now / Needs Attention / Best Next Move**, every claim grounded in the data.
- **Customize** panel: report goal (reorders/emphasizes KPIs), featured-KPI picker, section toggles, client display name — remembered across visits
- **Every summary, finding, and recommendation is editable inline** and prints as edited
- Deterministic by default: identical input always yields the identical report

**Optional AI narrative (bring your own key).**
- Open **AI narrative** as its own CNO workspace, then paste an **OpenAI or Anthropic API key**. The opening letter and takeaways are rewritten from *this client's actual numbers*, optional CNO context, campaign/pillar patterns, and data-quality cautions.
- OpenAI uses the Responses API, configurable reasoning depth, strict JSON-schema output, `store: false`, evidence keys, and confidence labels. CNO gets a private evidence review before sharing; generated copy remains an editable draft.
- The key is kept **only for the current browser session**. It is never included in a share link. The browser calls the chosen provider directly during the pilot; a production staff-account system should move the call and secret to the authenticated CNO backend.

**Private, view-only sharing.**
- A share link contains **only the one client's data** — never anyone else's — and opens as a **locked, view-only report**: no uploading, no client switching, no editing, no export. This holds even without a password, so one client can never reach another's results.

**Clear CNO and client experiences.**
- The working application is labeled **CNO workspace · staff tools** and contains import, sync, audit, AI, editing, and publishing controls.
- Shared snapshots are labeled **Client report · view only** and remove CNO controls. This is a clear pilot workflow distinction, not employee authentication. The staff-account and client-portal rollout is defined in [`DATA_ACCURACY_AND_ACCESS.md`](DATA_ACCURACY_AND_ACCESS.md).

**Installable and offline.**
- It is a **PWA**: add it to the home screen or install it as an app on Mac, Windows, or phone, and it keeps working offline. Bookmark it and come back anytime.
- It can also be packaged as a **native desktop app** (a real `.exe` / `.dmg`) for Windows and macOS. GitHub builds both installers for you — see [`DESKTOP.md`](DESKTOP.md).

## Usage

Open `index.html` in any browser (or visit the deployed site with `#demo` to auto-load a sample).

1. Click **Import data**, then drop in the whole reporting folder or select all available CSVs at once
2. Pick a **client** and **period** (month / last 30 / 90 / all / custom range)
3. Run **Data audit** and reconcile its warnings against the native source
4. **Customize** the goal, featured KPIs, and sections; use **AI narrative** only when you want an optional, evidence-reviewed draft; edit any text inline
5. **Export data** to download normalized CSVs, or **Print / PDF** for the client leave-behind

Templates: `resources/template_accounts.csv`, `resources/template_content.csv`. A larger synthetic test file covering Instagram, TikTok, and LinkedIn is at `resources/native_platform_comprehensive_test.csv`; the compact `resources/native_platform_priority_metrics_test.csv` validates every prioritized organic/paid formula plus YouTube retention.

## Keeping reports refreshed

No API key or backend is required. For each reporting cycle, export the available date range from Rella and/or the native platforms, add any offline outcomes from the client’s booking/CRM/sales records, then upload the whole folder through **Import data**. The report audits and merges the files, separates platforms, removes exact duplicate rows, and recalculates the selected period. Create a new password-protected share link after the refresh; that link contains a private snapshot of the uploaded report data.

For the exact recommended folder structure, refresh checklist, and the tradeoffs of a future automatic API sync, see [`DATA_IMPORT_GUIDE.md`](DATA_IMPORT_GUIDE.md).

> **Note:** Rella returns the *current* follower total for any date range, so follower *trends* come from monthly **growth**, not by differencing the total. The tool handles this.

## Architecture

Two decoupled halves, on purpose:

1. **Data export** — pull analytics from Rella into the CSV schema.
2. **Report generator** — this repo. A single static page that turns that CSV into the report, deterministically. Same input always yields the same output, which is why it's a program and not a prompt.

## Deploying

Static site, no build. On [Render](https://render.com): connect the repo, choose **Static Site**, leave the build command empty, set publish directory to `.`. The included `render.yaml` does this automatically.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The generator (the whole app) |
| `fonts.css` + `resources/*.woff2` | CNO website typography (Cormorant Garamond and DM Sans), with offline fallbacks |
| `cno-logo.png` / `cno-seal.png` | CNO lockup and wax seal used in the report and the opening letter |
| `manifest.webmanifest` + `sw.js` + `icon-*.png` | Installable/offline PWA support |
| `resources/brand-style.md` | Official brand palette, type, and voice |
| `01_METRICS_DICTIONARY.md` | Every metric and its exact formula |
| `06_CSV_SCHEMA.md` | The CSV contract (including optional `<metric>_target` goal columns) |
| `DATA_IMPORT_GUIDE.md` | Monthly import workflow and realistic native-platform connection options |
| `DATA_ACCURACY_AND_ACCESS.md` | Metric-governance rules and the CNO staff/client access roadmap |
| `sync-service/` | Private OAuth, encrypted token storage, scheduled native-platform sync, and one-use report imports |

## Brand

The interface mirrors cnocreative.co: Cormorant Garamond editorial headings, DM Sans controls and labels, terracotta, sage, cream, fine rules, the CNO lockup, and the wax seal.
