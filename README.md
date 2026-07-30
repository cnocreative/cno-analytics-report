# CNO Creative Co — Monthly Analytics Report

A standalone, deterministic reporting tool for CNO Creative Co. Feed it a CSV of social media data and it produces the same branded, client-ready analytics report every time.

**No required install. No build step. Metrics work offline. An AI key is required only when publishing a client-ready report.**

---

## What it does

Most social tools show isolated platform numbers. This one turns them into a **visual, client-specific measurement system** spanning awareness, audience quality, campaigns, and business outcomes.

**Reads any export.** One upload accepts multiple files at once and normalizes column names across Rella, Instagram/Meta, TikTok, LinkedIn, and YouTube — no renaming required. It auto-detects account-level vs. post-level data. See [`06_CSV_SCHEMA.md`](06_CSV_SCHEMA.md).

**One clear manual import.** Click **Import data** once, then add one CSV, many CSVs, or a whole client/month folder. The same panel audits each file's platform, row type, row count, and date coverage, safely removes exact duplicate rows, and can download one standardized combined master CSV without losing original source columns. See [`DATA_IMPORT_GUIDE.md`](DATA_IMPORT_GUIDE.md).

**Native sync foundation.** A separate CNO-only OAuth service now handles Meta, TikTok, and LinkedIn authorization server-side, encrypts tokens before storage, requires an exact client-to-native-account assignment, and transfers normalized analytics into the report through ten-minute, single-use links. Manual refresh works once deployed; the included protected scheduler workflow activates only after its deployment secrets and provider approvals are configured. See [`sync-service/README.md`](sync-service/README.md).

**Interactive, like a real dashboard.**
- Pick any **time period inside the report** — a month, last 30/90 days, all time, or a custom date range — and everything recomputes vs. the previous comparable period. No re-uploading.
- **Interactive charts** with hover tooltips and a current-vs-previous overlay, plus a sparkline on every metric card.
- A visualization-first performance board, client success scorecard, attention-to-action journey, profile/content grids, campaign and content-pillar comparisons by median engagement rate, and a filter-aware source spreadsheet that downloads as one CSV.

**Analysis the platforms don't give you.**
- **Business journey** — reach → profile visits → website clicks → leads → bookings, using only the steps present in the upload
- **Organic efficiency** — engagement rate by reach, follower growth rate, reach rate, link/profile conversion, Story retention, video completion, watch time, LinkedIn CTR
- **Paid efficiency** — CPM, CPC, CTR, frequency, cost per lead/conversion, and ROAS with paid-only denominators and tracking-aware availability
- **Anomaly detection** — spikes/dips flagged against a rolling 3-month baseline (real signal vs. noise)
- **Format intelligence** — the requested average engagement rate selects the leading format, with median engagement rate beside it so one breakout post cannot silently distort the interpretation
- **CNO-approved client targets** — Customize includes a client-and-platform target library for organic, business, campaign, and paid metrics. Blank means no goal; CNO values override imported targets, and AI is prohibited from inventing a number.
- **Effort vs. return per platform** — posts published against what they actually earned; flags dead channels
- **CNO-only data audit** — checks source coverage, row grain, non-additive reach, overlapping exports, missing KPIs, and account-total versus post-detail reconciliation before a report is published
- **No false blending** — when several platforms are checked, headline KPIs and trend charts are shown in separate platform panels instead of one cross-platform engagement rate

**Story-first and yours to shape.**
- **Page 1 begins as a real client letter**: “Dear [client],” followed by a connected narrative about what changed, what it means, what CNO is watching, and what happens next, ending with “With care, CNO Creative Co.” Goals, paid vs. organic, outcomes, and the most important KPIs follow the letter.
- Deeper pages hold performance trends, audience/profile behavior, creative detail, benchmarks, and the full data for clients who want to investigate.
- **Customize** controls the report goal, featured KPIs, client display name, section visibility, page assignment, and section order — remembered separately for each client across visits.
- **Every summary, finding, and recommendation is editable inline** and prints as edited
- Charts and calculations remain deterministic: identical input yields identical metrics.

**Required AI client analysis (bring your own key during the pilot).**
- Open **AI analysis**, paste an OpenAI or Anthropic API key, and generate the required client letter before sharing or printing. The default is [`gpt-5-mini`](https://developers.openai.com/api/docs/models/gpt-5-mini) with low reasoning and concise structured output. At its published token rates, the compact request is designed to stay below about $0.04 per generation; actual cost depends on the imported report size.
- The letter and short section explanations use this client's actual numbers, optional CNO context, campaign/pillar patterns, and data-quality cautions. Copy stays simple, concise, evidence-based, and editable.
- OpenAI uses the Responses API, low reasoning by default, strict JSON-schema output, `store: false`, evidence keys, and confidence labels. CNO still reviews the draft before publication.
- CNO can remember the key on one trusted device or keep it for only the current session. The key is never included in a share link. The production cloud phase moves the call and secret to the authenticated CNO backend.

**Private, view-only sharing.**
- A share link contains **only one client's selected platform data** — never another client or an unselected platform — and opens at the **AI-approved reporting period** as a locked, view-only report: no uploading, period/client switching, editing, or staff export. Charts, page turning, and approved historical comparisons stay interactive. This holds even without a password, so one client can never reach another's results.
- When the private service is deployed, reports use short, cross-device links backed by encrypted server storage. CNO can revoke them from the staff console. Optional report passwords add browser-side encryption, so the password is never sent to the service. Older data-in-the-URL links remain readable, but the app warns when one is too long for reliable email or chat delivery.

**Clear CNO and client experiences.**
- The working application is labeled **CNO workspace · staff tools** and contains import, sync, audit, AI, editing, and publishing controls.
- Shared snapshots are labeled **Client report · view only** and remove CNO controls. This is a clear pilot workflow distinction, not employee authentication. The staff-account and client-portal rollout is defined in [`DATA_ACCURACY_AND_ACCESS.md`](DATA_ACCURACY_AND_ACCESS.md).

**Installable and offline.**
- It is a **PWA**: add it to the home screen or install it as an app on Mac, Windows, or phone. The deterministic report shell and imported metrics keep working offline after the app has been cached; AI generation and native sync still require internet access.
- It can also be packaged as a **native desktop app** (a real `.exe` / `.dmg`) for Windows and macOS. GitHub builds both installers for you — see [`DESKTOP.md`](DESKTOP.md).

## Usage

Open `index.html` in any browser (or visit the deployed site with `#demo` to auto-load a sample).

1. Click **Import data**, then drop in the whole reporting folder or select all available CSVs at once
2. Pick a **client** and **period** (month / last 30 / 90 / all / custom range)
3. Run **Data audit** and reconcile its warnings against the native source
4. **Customize** the goal, featured KPIs, report pages, and section order
5. Generate the required **AI analysis**, review/edit the client letter, then share or **Print / PDF**

Templates: `resources/template_accounts.csv`, `resources/template_content.csv`. A larger synthetic test file covering Instagram, TikTok, and LinkedIn is at `resources/native_platform_comprehensive_test.csv`; the compact `resources/native_platform_priority_metrics_test.csv` validates every prioritized organic/paid formula plus YouTube retention. Upload `resources/paid_rate_reconciliation_test.csv` beside it to exercise multi-file loading and the deliberate paid-rate discrepancy warning. `resources/native_ads_manager_generic_test.csv` verifies that ordinary Ads Manager headings such as Reach, Impressions, Link Clicks, and CTR are routed to paid metrics when the row is clearly identified as paid.

The account-transfer runbook is in [`MIGRATE_TO_CNO_ACCOUNTS.md`](MIGRATE_TO_CNO_ACCOUNTS.md). It covers GitHub ownership, the CNO Render Blueprint, custom domains, OAuth callbacks, secrets, and final handoff checks.

The complete v1.7 verification record is in [`RELEASE_AUDIT_v1.7.0.md`](RELEASE_AUDIT_v1.7.0.md).

## Keeping reports refreshed

No backend is required for manual CSV refreshes or deterministic analytics. For each reporting cycle, export the available date range from Rella and/or the native platforms, add any offline outcomes from the client’s booking/CRM/sales records, then upload the whole folder through **Import data**. The report audits and merges the files, separates platforms, removes exact duplicate rows, and recalculates the selected period. Confirm that the selected client’s approved targets are correct under **Customize**, generate and review the required AI letter, then create a new password-protected share link.

The primary engagement-rate standard is always `(likes + comments + shares + saves) ÷ reach × 100`. If an export omits one of those components, the report uses the platform/Rella engagement total divided by reach when available and identifies that source in the CNO data audit.

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
| `CLOUD_AUTOMATION_BLUEPRINT.md` | Managed accounts, report archive, monthly delivery, and production security plan |
| `MIGRATE_TO_CNO_ACCOUNTS.md` | Transfer checklist for CNO-owned GitHub, Render, domains, secrets, and callbacks |
| `sync-service/` | Private OAuth, encrypted token storage, exact account assignment, scheduler-ready native sync, and one-use report imports |

## Brand

The interface mirrors cnocreative.co: Cormorant Garamond editorial headings, DM Sans controls and labels, terracotta, sage, cream, fine rules, the CNO lockup, and the wax seal.
