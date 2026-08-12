# CNO Reports — Developer handoff

Last updated: August 12, 2026

Current web build: `main` / package version `1.8.0`

Latest tagged desktop release: `v1.7.0`

Current repository: `https://github.com/cnocreative/cno-analytics-report` (CNO-owned)

Live pilot: `https://cno-analytics-report-5hi6.onrender.com/#demo` (CNO-owned Render account; the non-suffixed Render site is retired)

Live native sync/share service: `https://cno-native-sync-gp4h.onrender.com` (durable Postgres storage; the non-suffixed service address is retired)

Latest installers: `https://github.com/cnocreative/cno-analytics-report/releases`

## 1. Executive summary

CNO Reports is a branded social-media analytics and client-reporting system for CNO Creative Co. Its purpose is to take exports from Rella and native social platforms, standardize them, calculate trustworthy metrics, visualize performance, and produce a polished monthly client report.

The product is intentionally more than a copy of a native analytics dashboard. It is meant to connect social activity to client-specific goals such as:

- brand authority and awareness;
- attracting the right audience;
- campaign and event momentum;
- website interest, inquiries, and DMs;
- bookings, memberships, retail sales, and attributed revenue; and
- paid-media efficiency and return.

The current release is a controlled pilot:

- The report generator, multi-format importer, deterministic calculations, interactive visualizations, AI-assisted client letter, customization, PWA, Windows installer, and Mac ARM installer are implemented.
- The importer reads CSV, TSV, Excel `.xlsx` workbooks, `.zip` platform downloads, and JSON exports, in whatever text encoding the platform used.
- The static website works without a database for manual reporting.
- A Node OAuth, sync, and short-link service is implemented and deployed. The report app drives it directly: connection state, refresh, and data load all happen inside the report window. Its live health check reports durable Postgres storage and complete server configuration.
- Live provider authorization and metric validation still depend on CNO-owned provider apps, exact callback registration, provider approval, and real-account testing. Automated native pulling should not be represented as fully complete until those checks pass.
- Individual staff accounts, client accounts, a cloud report archive, server-side AI, automatic monthly generation, approval workflow, and email delivery are **future secured backend work**, not completed features.

Private client data is intentionally excluded from this public repository. The bundled demo and test fixtures use only the fictional `Example Brand`.

## 2. Product vision and non-negotiable requirements

The intended final product should:

1. Be simple enough for a client who does not specialize in data.
2. Still provide enough depth, formulas, source data, and diagnostics for a data-savvy client or analyst.
3. Keep each platform separate unless the user intentionally requests a portfolio comparison.
4. Never add unlike Instagram, TikTok, LinkedIn, YouTube, or Meta definitions into a misleading blended rate.
5. Make the most important story understandable on the first page and put deeper analysis on later pages.
6. Use deterministic calculations so the same data produces the same metrics.
7. Use AI for understandable narrative interpretation, not for inventing calculations, causes, outcomes, or targets.
8. Let CNO review and edit every client-facing word before publication.
9. Keep CNO tools, evidence, credentials, and unpublished work out of client views.
10. Eventually refresh automatically from native platforms after a one-time browser authorization.
11. Eventually give CNO staff and clients secure accounts with tenant-isolated report archives.
12. Match the warmth, editorial quality, typography, color, wax seal, and letter-like experience of `cnocreative.co`.

## 3. Complete request and feature inventory

Status meanings:

- **Complete**: implemented and verified in the current pilot.
- **Foundation**: code/design exists, but production deployment or provider approval remains.
- **Future**: requested product behavior that still needs implementation.

### 3.1 Data import and normalization

| Request | Status | Current behavior / remaining work |
|---|---|---|
| Import Rella data | Complete for file export | Rella account and content exports can be uploaded as CSV or XLSX. There is no live Rella API connection inside the product. |
| Import native platform data | Complete | Alias normalization supports common Instagram/Meta, TikTok, LinkedIn, YouTube, Facebook, Pinterest, Threads, and X-style headings, including the exact wording each native export uses. |
| Accept one or many files | Complete | The Import data panel accepts one file, multiple files, a folder, or drag-and-drop. |
| Accept formats other than CSV | Complete | CSV/TSV with automatic delimiter detection, `.xlsx`/`.xlsm` and legacy `.xls` (OLE2/BIFF8) workbooks with every visible sheet imported separately and Excel date cells converted, `.zip` platform downloads read recursively, `.json` exports, Excel XML and HTML "spreadsheet" files. LinkedIn still ships `.xls`, so reading it removes a manual re-save every month. |
| Handle native text encodings | Complete | UTF-8, UTF-16 either byte order with or without a mark, and Windows-1252 are detected per file. Meta and Instagram ship UTF-16, which previously imported as unreadable characters. |
| Handle title rows above the headings | Complete | The importer scores the first ten rows and starts at the real heading row, so LinkedIn and Facebook exports import without hand editing. |
| Fill in a missing client or platform | Complete | Resolved from the file's own columns, then the folder and file names, then headings only one platform uses, then staff-set import defaults. Inferred client names are reconciled against clients named outright in the same import, so one brand cannot be filed under two spellings. Rows are never silently assigned to a platform the export did not name; unresolved rows are flagged in the audit. |
| Eliminate confusing separate account/content upload buttons | Complete | There is one import center; it classifies account-period rows and post rows automatically. |
| Preserve full source data | Complete | Original fields remain available in the normalized export and filter-aware Full Data table. |
| Download combined master CSV | Complete | CNO can download one standardized combined CSV. |
| Prevent duplicate imports | Complete with limit | Exact duplicate normalized rows are removed. Semantic duplicates with slightly different source fields still require review. |
| Detect data grain | Complete | Account monthly, account daily/period, post-level, and paid rows are classified. |
| Handle arbitrary CSVs | Partial by design | The alias map is broad, but no importer can correctly understand every unknown heading without a mapping. Unrecognized fields remain in Full Data and are reported in the import audit. |
| Retain hourly/day-level detail | Conditional | Daily/weekly charts work only when the export contains dates. Posting-hour analysis works only when timestamps or `published_hour` exist. The app cannot recreate granularity absent from the source export. |
| Synthetic multi-platform test fixtures | Complete | Fixtures cover Instagram, TikTok, LinkedIn, YouTube retention, paid reconciliation, generic Ads Manager headings, UTF-16 CSV, semicolon CSV, a multi-sheet XLSX workbook, a ZIP archive, and a nested JSON export. |

### 3.2 Platform separation and filtering

| Request | Status | Current behavior / remaining work |
|---|---|---|
| Platform checkboxes | Complete | Detected platforms appear as checkable chips. |
| Do not combine Instagram and TikTok metrics | Complete | One platform is selected by default. Several may be selected, and the AI letter then covers each separately: it receives one metric block per platform and no blended figure at all, and must name the platform beside every number. Only genuinely additive business outcomes (spend, leads, bookings, revenue) are offered as a combined total. |
| Multi-platform comparison | Complete with guardrails | Staff can select several platforms, but the report renders separate platform cards and charts instead of a blended engagement rate or funnel. |
| Select any reporting period without re-uploading | Complete | Month, last 30 days, last 90 days, all time, and custom ranges recalculate in place. |
| Daily, weekly, or monthly chart detail | Complete when dates exist | Post/date-aware metrics honor the selected grain. Monthly-only exports cannot honestly produce daily trends. |
| Previous comparable period | Complete | Current-period metrics compare with an equal-length prior period when data exists. |

### 3.3 Organic metrics and formulas

The following requested metrics are recognized or calculated:

| Metric | Current rule |
|---|---|
| Impressions | Raw platform count |
| Reach | Raw platform count; non-additive warnings apply |
| Net follower growth | Ending followers minus starting followers, or authoritative platform growth when snapshots are unavailable |
| Follower growth rate | Net follower growth divided by starting followers |
| Engagement | Likes + comments + shares + saves when all components exist; otherwise authoritative platform/Rella engagement total |
| Primary engagement rate | `(likes + comments + shares + saves) / reach × 100` |
| Reach rate | Reach divided by ending followers |
| Profile visits | Raw platform count |
| Website/link clicks | Raw native-platform count |
| Likes, comments, shares, saves | Preserved separately |
| DMs | Raw count when supplied |
| Meaningful comments | Human-tagged outcome; never inferred from ordinary comment count |
| Comment replies | Raw or manually supplied count |
| Top posts | Sorted by post engagement rate by reach |
| Best format | Average post engagement rate grouped by format, with median and sample size beside it |
| Best posting time | Average engagement grouped by weekday and hour when timestamps exist |
| Story views | Raw Instagram Story count |
| Story exit rate | Exits divided by Story views |
| Story completion rate | Direct completions divided by Story views; otherwise `1 - exit rate` |
| TikTok watch time | Raw total watch time |
| Video completion rate | Completed views divided by total views |
| YouTube average view duration | Native value or total watch time divided by views |
| YouTube subscriber growth | Ending subscribers minus starting subscribers |
| LinkedIn post CTR | Clicks divided by impressions |

Important engagement-rate policy:

- CNO’s primary client-facing formula always uses reach, not followers.
- A universal “good engagement rate” is not assumed.
- Numeric targets are client- and platform-specific.
- Public benchmark rates are shown only with their original denominator and are never silently compared as if formulas match.

### 3.4 Paid, boosted, and dark-ad metrics

| Metric | Current rule |
|---|---|
| Spend | Paid-platform raw total |
| Paid reach/impressions | Paid-specific raw totals |
| Organic reach/impressions | Organic-specific raw totals |
| Paid clicks/leads/follows/conversions/revenue | Paid-attributed totals only |
| CPM | `spend / paid impressions × 1,000` |
| CPC | `spend / paid clicks` |
| CTR | `paid clicks / paid impressions × 100` |
| Frequency | `paid impressions / paid reach` |
| Cost per lead | `spend / paid leads` |
| Cost per follow | `spend / paid follows` |
| Cost per conversion | `spend / paid conversions` |
| ROAS | `paid-attributed revenue / spend` |

Rules that must not regress:

- Platform-reported CPM, CPC, CTR, frequency, CPL, CPA, and ROAS are displayed when supplied.
- Paid-only raw totals independently recalculate the rate for validation.
- A difference over 5% creates a CNO-only warning.
- Organic clicks, total follower growth, total conversions, or total revenue must never be substituted into paid denominators.
- Cost per conversion and ROAS remain unavailable when conversion or revenue attribution is absent.

### 3.5 Client goals, success metrics, and targets

The reporting framework supports four general client-growth areas:

1. **Build brand authority**
   - reach;
   - impressions/views;
   - follower growth rate;
   - profile visits;
   - saves.

2. **Grow the right audience**
   - website/link clicks;
   - meaningful comments and conversation depth;
   - DMs;
   - qualified leads;
   - profile-to-click conversion.

3. **Build campaign or event momentum**
   - campaign/event announcement reach;
   - preview/content engagement;
   - registrations;
   - attendance;
   - post-event followers, leads, and bookings.

4. **Drive business growth**
   - inquiries and leads;
   - new bookings;
   - membership sign-ups;
   - retail sales;
   - conversions;
   - attributed revenue.

Current target behavior is complete in the pilot:

- Targets are saved separately for each client and platform.
- CNO can enter approved targets under Customize.
- Optional `<metric>_target` CSV columns are also supported.
- CNO-entered targets override imported targets.
- Imported targets can be disabled per client/platform.
- Blank means no target.
- AI receives only non-null `approved_targets`.
- Changing a target invalidates stale AI analysis and requires regeneration.
- Volume, growth, revenue, CTR, and ROAS targets are treated as “at or above.”
- CPM, CPC, CPL, and CPA limits are treated as “at or below.”
- Multi-platform target editing is blocked so one platform’s target cannot be reused for another.

Recommended future improvement:

- Add effective dates and version history to targets. A target changed in August should not rewrite what the approved June target was.
- Add optional target ranges, stretch goals, and pacing.
- Add a formal goal-approval field showing who approved the target and when.

### 3.6 Campaigns and content pillars

| Request | Status | Current behavior / remaining work |
|---|---|---|
| Tag posts by campaign | Complete through data columns | `campaign` and `campaign_phase` are retained and compared. |
| Compare campaigns | Complete | Median engagement rate, median engagement/reach, shares, follows, and post count are shown with small-sample warnings. |
| Tag posts by content pillar | Complete through data columns | `pillar` is retained and compared; untagged posts are counted. |
| Make categories client-specific | Complete at import level | CNO controls the text labels in each client’s CSV. |
| Categorize inside the app | Future | Add an editable post-tagging interface and save mappings in the cloud. Today the labels should be added before or during CSV preparation. |
| Compare campaign periods | Partial | Date filters and campaign tags support analysis, but a dedicated named-period comparison builder would improve usability. |

### 3.7 Visualizations and analysis depth

Implemented visual and analytical features include:

- four headline KPI cards;
- current-versus-prior sparklines;
- interactive SVG charts with hover tooltips;
- daily/weekly/monthly bucketing;
- separate platform performance cards;
- paid-versus-organic delivery summary;
- client goal-progress cards;
- reach-to-profile-to-action journey;
- profile and audience grids;
- Story/video/click-attention analysis;
- format performance tables and bars;
- campaign and pillar comparisons;
- posting weekday/hour analysis;
- content consistency and concentration checks;
- top-post ranking by engagement rate;
- anomaly/spike/dip detection against a recent baseline;
- formula-matched benchmark context;
- effort-versus-return analysis;
- metrics matrix; and
- full filter-aware source spreadsheet.

The report deliberately emphasizes visual evidence over automatically written analysis. AI explains the most important story, but it does not replace charts, formulas, or the source table.

Recommended future improvements:

- Add selectable chart types and metric overlays.
- Add annotations for campaigns, launches, events, promotions, and anomalies directly on timelines.
- Add distribution plots, percentile views, cohort retention, and confidence intervals where sample sizes support them.
- Add a clear data-provenance drawer for every number.
- Add exportable chart images and presentation-ready slides.
- Add saved dashboard presets for different client types.

### 3.8 AI analysis and storytelling

Current behavior:

- AI analysis is required before sharing or printing a client-ready report.
- The letter may cover one platform or several. With several, the AI receives a separate metric block per platform and no blended figure exists in its context, so it cannot quote a cross-platform rate even by accident. It is instructed to name the platform beside every number and never to rank one platform against another. The word allowance and number allowance scale with the platform count so the letter has room without becoming a list.
- OpenAI and Anthropic are supported in the pilot.
- The default is `gpt-5-mini`, low reasoning, concise output, and a strict JSON schema.
- OpenAI uses the Responses API with `store: false`.
- The AI writes:
  - a 180–280 word client letter;
  - a headline;
  - up to two positive findings;
  - up to two concerns;
  - one recommended next move;
  - a paid-media takeaway;
  - short plain-language notes throughout the report; and
  - a CNO-only analyst caution.
- The letter must begin `Dear [client],` and end `With care, CNO Creative Co`.
- The letter is intentionally concise and should use no more than four numbers unless approved targets require another.
- The prompt distinguishes observation, association, and hypothesis.
- Causes may not be stated as facts without human context.
- Creative-pattern claims require an adequate post sample.
- Previous report findings are supplied for continuity and must be confirmed, weakened, or left unresolved using current evidence.
- Every finding includes evidence keys and a confidence level for CNO review.
- Output is sanitized before rendering.
- Every client-facing text element can be edited.
- The API key can be remembered on a trusted CNO device or only for the session.
- API keys are never placed in client links.

AI target guardrail:

- AI may mention a numeric target only when it is present in `approved_targets`.
- It may not invent, infer, estimate, round, recommend, or imply another numeric target.

Known limitation:

- The API request currently originates from the browser. This is acceptable only for the controlled bring-your-own-key pilot.
- Production must move AI calls and the CNO-owned key to an authenticated server-side endpoint.

Recommended future AI work:

- Build a fixed evaluation set of reports and score factuality, target compliance, tone, readability, evidence references, and unsupported causal claims.
- Version prompts and schemas.
- Store CNO edits as feedback data.
- Add deterministic post-generation checks for every number and target mentioned in prose.
- Add per-client tone/context profiles without allowing them to alter metric truth.
- Add cost controls, retries, rate limits, and model fallback on the server.

### 3.9 Report structure and reading experience

The report is split into four pages:

1. **Summary**
   - real client letter;
   - four essential KPIs;
   - paid-versus-organic summary;
   - approved goal progress;
   - next steps.

2. **Performance**
   - detailed profile and audience analysis;
   - trends;
   - funnel/journey;
   - Story/video attention;
   - full paid metrics;
   - full goal/outcome table.

3. **Content**
   - formats;
   - campaigns;
   - pillars;
   - timing;
   - consistency;
   - top posts.

4. **Full Data**
   - benchmarks;
   - effort versus return;
   - metric matrix;
   - complete filtered source table.

CNO can:

- reorder sections;
- move sections between pages;
- hide sections;
- change the featured KPIs;
- change the report goal;
- change the client display name;
- choose chart grain;
- enable or disable the opening letter;
- edit all report copy; and
- reset edits/customization.

These settings currently persist in browser `localStorage`, scoped by client where appropriate.

### 3.10 Brand and design requirements

Implemented brand direction:

- CNO wax seal centered in the report and letter experience;
- warm envelope/opening animation;
- report opens like a letter from CNO;
- Cormorant Garamond editorial typography;
- DM Sans interface typography;
- terracotta, burnt orange, sage, cream, and black palette;
- fine rules, corner marks, generous editorial spacing, and italic terracotta accents;
- CNO tagline: `Hand it over. We’ll handle it.`;
- top workspace bar and report visuals modeled after `cnocreative.co`;
- responsive letter and report layouts;
- no squashed logos.

The desired feeling is warm, custom, inviting, and slightly magical—not a generic SaaS dashboard.

Future design work:

- Continue matching the production CNO website’s current animation timing, navigation rhythm, and responsive behavior.
- Run formal mobile/tablet accessibility review.
- Add keyboard and screen-reader chart summaries.
- Test print/PDF typography across Chrome, Edge, Safari, Windows, and macOS.

### 3.11 CNO workspace versus client view

Current pilot distinction:

- **CNO workspace · staff tools**
  - import;
  - data audit;
  - native sync;
  - AI;
  - customization;
  - editing;
  - sharing;
  - export;
  - print;
  - installation.

- **Client report · view only**
  - one client;
  - one selected platform;
  - locked approved period;
  - interactive charts;
  - report pages;
  - permitted historical comparisons;
  - no import, editing, AI, staff export, customization, or other-client access.

Important limitation:

- The CNO workspace label is not authentication. Anyone who knows the static workspace URL can open the empty tool, although client data is local until imported.
- Real staff/client isolation requires managed accounts and database authorization.

### 3.12 Sharing, privacy, and password protection

Implemented:

- Client bundles contain only the selected client and only the selected platforms.
- CNO-only evidence, confidence, analyst notes, API keys, and other clients’ data are removed.
- Portable links use gzip compression.
- Optional passwords use PBKDF2-SHA-256 with 150,000 rounds plus AES-GCM.
- Damaged/truncated links show an explicit error rather than opening an empty normal workspace.
- The private service includes short random report IDs, encrypted-at-rest payload storage, optional client-side password encryption, one-year expiry, access tracking, and revocation.

Current production boundary:

- The private service is live at the suffixed Render hostname and uses durable Postgres storage.
- Short links and central revocation are available through that service; the app refuses to pretend an unreliable fallback link is permanent.
- Older data-in-the-URL links remain readable for compatibility, but they can be truncated by email, SMS, or chat applications.
- Full tenant-authenticated client access and immutable cloud report archives remain future work.

### 3.13 Downloadable and offline versions

Implemented:

- Static website.
- Installable PWA with cached shell assets.
- Windows NSIS installer.
- Mac Apple Silicon DMG.
- GitHub Actions release builds.
- Deterministic metrics work offline after caching.

Online services still required for:

- AI generation;
- native syncing;
- cloud short links; and
- future account/archive functionality.

Known desktop limitation:

- Release metadata files are produced, but `electron/main.js` does not implement an in-app auto-updater.
- Users currently install a new release manually.
- Add a signed, tested update flow before promising automatic desktop updates.

## 4. Current technical architecture

### 4.1 Static report application

`index.html` contains almost the entire front end:

- UI and CNO styles;
- CSV parser and alias registry;
- row classification and deduplication;
- metric calculations;
- audits;
- charts;
- AI prompt/schema/API calls;
- customization and editing;
- share encryption;
- page organization; and
- demo fixtures.

Advantages:

- easy to host;
- no build required;
- deterministic;
- works locally/offline;
- simple to distribute.

Technical debt:

- one large HTML file is difficult to unit test and maintain;
- business logic, rendering, storage, and UI events are tightly coupled;
- browser-only state complicates versioning and cloud migration.

Recommended refactor:

1. Extract pure normalization and metric functions into tested ES modules.
2. Extract import adapters by source/platform.
3. Extract report state and persistence.
4. Extract chart components.
5. Extract AI context/schema/prompt code.
6. Keep the branded renderer thin.
7. Add a build step only if it materially improves maintainability; preserve a simple distributable output.

### 4.2 Native sync and short-link service

`sync-service/` is a Node service backed by Postgres. It includes:

- private staff console;
- Meta, TikTok, and LinkedIn OAuth authorization-code flows;
- one-use anti-forgery state;
- encrypted access and refresh tokens;
- provider account discovery;
- exact client-to-account assignment;
- manual sync;
- scheduler endpoint;
- normalized sync snapshots;
- single-use import links;
- encrypted short report storage;
- expiry and revocation.

Production dependencies:

- persistent Postgres;
- `TOKEN_ENCRYPTION_KEY`;
- `CNO_ADMIN_TOKEN` for the pilot console;
- `SYNC_CRON_SECRET`;
- Meta credentials;
- TikTok credentials;
- LinkedIn credentials;
- approved provider permissions and callback URLs.

The service is described in `render.yaml` but has not been provisioned/configured on the public Render environment.

### 4.3 Desktop wrapper

`electron/main.js` wraps the static report with:

- isolated renderer context;
- no Node integration in the report page;
- familiar print/reload/zoom menus; and
- external links opened in the system browser.

### 4.4 Current persistence

Browser storage keys include:

- `cno_report_v2`: client customization and target settings;
- `cno_report_v2_edits`: inline text edits;
- `cno_report_v2_ai`: AI narratives by report context;
- `cno_report_v2_lastmove`: prior recommendation continuity;
- `cno_ai_cfg`: AI provider/model/depth preference;
- `cno_ai_key`: remembered pilot API key;
- `cno_sync_service_url`: private service address.

Imported CSV data itself is not a durable cloud archive.

## 5. Data authority and aggregation rules

These rules are central to accuracy:

1. Account/platform totals are authoritative for headline metrics.
2. Post rows provide creative detail and only become fallback totals when account data is absent.
3. Spend summaries are not added again from ad-level rows.
4. Reach is non-additive. Summed daily unique reach is directional, not exact monthly unique reach.
5. Follower totals are snapshots and are not summed across dates.
6. Missing values stay missing; they are not silently turned into zero.
7. Platform definitions remain separate.
8. Paid metrics require paid-specific denominators.
9. A reported paid rate has display priority, but a raw-total recalculation validates it.
10. Story completion uses direct completions when available.
11. Business outcomes must come from native analytics, CRM, booking, event, ecommerce, or maintained attribution data; the app must not claim social caused an outcome without attribution.

## 6. Data-quality audit

The CNO-only audit checks:

- account and post row coverage;
- file/source coverage;
- selected platform coverage;
- missing core KPIs;
- overlapping files/date ranges;
- duplicate rows;
- non-additive reach risk;
- incomplete engagement components;
- account totals versus post-detail reconciliation;
- thin KPI coverage;
- platform-reported versus recalculated paid rates;
- missing conversion/revenue tracking; and
- whether headline metrics use account totals or post fallbacks.

Reconciliation differences are not automatically errors. Account totals may include Stories, ads, deleted posts, or platform surfaces absent from a post export.

## 7. Current browser workflow

1. Open the website or desktop app.
2. Import all available client CSVs together.
3. Select the client.
4. Select the platform, or platforms, for the official report.
5. Select period and chart detail.
6. Run Data audit.
7. Reconcile headline numbers against the native platform for the exact dates.
8. Set/confirm client and platform targets.
9. Configure report goal, KPIs, pages, and sections.
10. Add human context for campaigns, seasonality, events, promotions, or operational changes.
11. Generate AI analysis.
12. Review evidence and edit every client-facing statement as needed.
13. Print/PDF or create the client link.
14. Send a password separately when used.

## 8. Native browser-connection goal

The intended staff experience is:

1. Select the client in CNO Reports.
2. Click **Connect selected client**.
3. A secure browser window opens.
4. Choose Meta/Instagram, TikTok, or LinkedIn.
5. The client signs in on the platform’s own website.
6. The provider shows its consent screen.
7. CNO confirms the exact social profile and optional matching ad account.
8. The encrypted authorization is retained and refreshed when supported.

CNO staff should never:

- use terminal commands for the normal connection flow;
- copy OAuth tokens;
- see the client’s platform password or 2FA code;
- paste provider secrets into the report; or
- reauthorize every month unless access was revoked, expired, or changed.

### What is implemented today

The report's **Native sync** panel is a working client of the service, not a placeholder:

- the service address is a visible, saved setting;
- **Check** reports whether the service is reachable, whether this browser is signed in, whether a database is configured, and which provider apps still lack credentials;
- once signed in, the panel lists every platform for the selected client with its live state — ready, choose account, reconnect, not connected, not set up — and shows only that client's connections;
- **Connect selected client** opens the secure window and the panel then polls until the sign-in completes, because the cross-origin popup cannot message the report; and
- **Refresh and load into this report** runs the sync and loads the normalized rows straight into the open report, replacing the previous pull rather than duplicating it, and reports per-platform failures without discarding the platforms that succeeded.

The service itself runs with or without Postgres. Without `DATABASE_URL` it keeps state in a local
JSON file so a CNO owner can deploy and complete a real browser connection before committing to a
database; the console and `/health` both say plainly that this mode is not durable.

### What is still required, and by whom

None of it is application code. An authorized CNO owner has to:

1. register CNO-owned Meta, TikTok, and LinkedIn developer apps and complete each provider's review;
2. register `https://YOUR-SERVICE/oauth/<provider>/callback` for each;
3. deploy the service with `CNO_ADMIN_TOKEN`, `TOKEN_ENCRYPTION_KEY`, `SYNC_CRON_SECRET`, and a persistent `DATABASE_URL`; and
4. reconcile two full reporting periods per provider against native analytics before live use.

Until step 1 completes, the panel says so instead of offering a button that fails part way through a client's sign-in.

## 9. Production cloud roadmap

### Phase 1 — current pilot

- manual CSV import;
- local browser customization;
- required AI letter;
- view-only client snapshots;
- PWA and desktop installers;
- OAuth/sync service code foundation.

### Phase 2 — authenticated CNO beta

- managed staff accounts;
- `owner`, `analyst`, and `viewer` roles;
- server-side AI;
- client records;
- cloud targets/settings;
- sync-health dashboard;
- report drafts;
- audit log;
- automatic monthly draft generation;
- no unattended client delivery yet.

### Phase 3 — client portal

- tenant-isolated client accounts;
- report archive;
- latest and historical approved reports;
- revocable access;
- passwordless sign-in;
- approved PDF/data downloads;
- secure email notifications.

### Phase 4 — guarded automation

- scheduled platform refresh;
- automated completeness/reconciliation gates;
- AI draft;
- CNO review/approval;
- automatic publication and email only when all validation gates pass;
- exception routing for missing data, revoked access, API changes, or suspicious metric discontinuities.

## 10. Prioritized next-development backlog

### P0 — required before real production automation

1. **Transfer ownership** — GitHub and the static site are done
   - GitHub now lives at `cnocreative/cno-analytics-report`.
   - The static site runs in the CNO Render account and the `cno-report-base` and
     `cno-repository` meta tags point at it.
   - Still to do: create the `cno-native-sync` service, then set `cno-sync-base` to its address.
   - Optional: move both to `reports.cnocreative.co` and `sync.cnocreative.co`.
   - Keep secrets out of GitHub; Render generates the three service secrets itself.

2. **Validate and harden the deployed private service**
   - Preserve the active `-gp4h` Render address until a custom-domain cutover is fully tested.
   - Keep persistent Postgres, encryption/admin/cron secrets, and `/health` monitoring in place.
   - Add automated smoke tests for short links on another device, password protection, expiry, and revocation.
   - Monitor free-tier sleeping and service availability before relying on unattended delivery.

3. **Complete provider setup** — see `PROVIDER_APP_REVIEW.md` for the submissions
   - Register CNO-owned Meta, TikTok, and LinkedIn apps.
   - Configure callback URLs.
   - Complete provider review/approval.
   - Validate account discovery and token refresh.
   - Compare each adapter against native exports for at least two full reporting periods.

4. **Implement managed staff authentication**
   - Replace the shared admin token.
   - Use managed identity, HTTP-only sessions, MFA/passkeys, and roles.
   - Add per-user audit events.

5. **Move AI server-side**
   - Store the CNO key only in server secret management.
   - Authenticate every generation.
   - Add rate limits, cost logging, retries, and model/version tracking.

6. **Implement tenant isolation**
   - Add organizations, memberships, clients, reports, and access tables.
   - Enforce row-level or service-level authorization.
   - Add automated tests proving one client cannot access another client’s data.

### P1 — data accuracy and maintainability

7. Extract the normalization and metric engine from `index.html` into pure tested modules. The
   file readers (`readSourceBuffer` and everything it calls) are already self-contained and pure
   apart from `DOMParser`, so they are the cleanest first extraction and the easiest to unit test.
8. Build automated formula tests for every metric and edge case.
9. Add timezone-aware reporting windows and provider attribution-window metadata.
10. Add field-level provenance: source file, source row, raw heading, formula, and fallback reason.
11. Create source-specific adapters/versioning for Rella and every native export format.
12. Add a mapping UI for unknown headings. The import audit already reports how many headings were
    recognized per file, so the remaining work is letting staff bind the rest to canonical fields
    and saving that mapping per source.
13. Add stronger overlap and semantic deduplication rules.
14. Add target history/effective dates.
15. Add campaign/pillar tagging and named-period comparison inside the product.
16. Add benchmark administration with source URL, publication date, denominator, industry, account size, and expiration/review date.
17. Add native YouTube and fuller Facebook/LinkedIn paid support after product approval.
18. Add demographics ingestion and visualization by platform.
19. Add source freshness, sync completeness, and metric discontinuity alerts.

### P1 — workflow and client experience

20. Build report drafts, approvals, immutable published versions, and rollback.
21. Build client report archive and latest-report landing page.
22. Add monthly schedule configuration by client/timezone.
23. Add secure email notification and delivery tracking.
24. Add comments/approval notes between CNO staff.
25. Add optional client-specific dashboard presets.
26. Add server-generated PDFs with consistent cross-platform typography.
27. Add accessibility improvements and nonvisual chart summaries.
28. Add in-app desktop updating, code signing, and update rollback.

### P2 — advanced analysis

29. Statistical confidence and sample-size indicators.
30. Campaign lift and pre/post comparisons.
31. Content decay and longevity curves.
32. Follower and audience cohorts when source data permits.
33. Paid creative, placement, audience, and campaign breakdowns.
34. Conversion attribution windows and CRM reconciliation.
35. Forecasting and pacing against approved targets, clearly labeled as estimates.
36. Custom client benchmarks and competitor sets.
37. Exportable presentations and executive summaries.

## 11. Known limitations and risks

1. `index.html` is large and tightly coupled.
2. There is no full automated test runner in the root app.
3. The public sync hostname is live, but provider OAuth approvals and real-account metric coverage still need end-to-end validation.
4. Cross-device short links depend on the live service and its database availability; they are not a substitute for future authenticated client accounts.
5. Browser API-key storage is not a production security boundary.
6. CNO/client labels are not authentication.
7. Manual browser state is device-specific and can be lost when storage is cleared.
8. There is no cloud history for targets, edits, or reports.
9. Provider API permissions and metric availability can change.
10. Rella remains file-export only; there is no Rella API connection.
11. YouTube and several other platforms remain file-export only for native sync.
12. Benchmarks are bundled static references and require periodic review.
13. Native reach can be non-additive depending on export grain.
14. Imported data can only be as complete and accurate as the source export.
14a. The `.xls` reader covers the records LinkedIn and similar exports emit (NUMBER, RK, MULRK, LABELSST, LABEL, cached FORMULA results). It does not evaluate formulas or read charts and pivot caches.
14b. Without Postgres the service stores connections in a local file that does not survive a redeploy, so it is a setup and testing mode only.
15. Desktop automatic updating is not implemented.
16. Mac builds currently target Apple Silicon.
17. No unattended report should be sent until data and AI validation gates are enforced server-side.

## 12. Key files and responsibilities

| File | Responsibility |
|---|---|
| `index.html` | Entire static reporting app and metric/rendering engine |
| `01_METRICS_DICTIONARY.md` | Metric definitions, formulas, and benchmark policy |
| `06_CSV_SCHEMA.md` | Supported normalized data contract and target columns |
| `DATA_IMPORT_GUIDE.md` | Manual import and refresh workflow |
| `DATA_ACCURACY_AND_ACCESS.md` | Data authority, AI boundary, and staff/client access model |
| `CLOUD_AUTOMATION_BLUEPRINT.md` | Production accounts, archive, workflow, and security plan |
| `FIRST_WAVE_FEEDBACK_CHECKLIST.md` | Original stakeholder feedback implementation status |
| `RELEASE_AUDIT_v1.8.0.md` | Current release verification and honest limitations |
| `RELEASE_AUDIT_v1.7.0.md` | Previous release verification |
| `MIGRATE_TO_CNO_ACCOUNTS.md` | GitHub/Render/domain/provider migration runbook |
| `MANAGER_FEEDBACK_AUGUST_2026.md` | Current domain registry, latest stakeholder feedback, implementation difficulty, and recommended next batches |
| `PROVIDER_APP_REVIEW.md` | Ready-to-paste Meta/TikTok/LinkedIn app-review submissions and per-permission justifications |
| `RUNNING_COSTS.md` | What is free permanently, what the free tier costs in behaviour, and the Postgres trap |
| `resources/brand-style.md` | Brand colors, fonts, voice, and assets |
| `resources/template_accounts.csv` | Account/period CSV template |
| `resources/template_content.csv` | Post/content CSV template |
| `resources/*test.csv` | Fictional formula and importer fixtures |
| `sync-service/src/server.js` | Staff console, OAuth routes, sync, report-app API, imports, report links |
| `sync-service/src/providers.js` | Provider authorization, token refresh, account discovery, analytics adapters |
| `sync-service/src/crypto.js` | Token/payload encryption |
| `sync-service/src/store.js` | Storage layer: Postgres in production, a local JSON file when no database is configured |
| `sync-service/schema.sql` | Pilot Postgres schema |
| `render.yaml` | Static site and private service deployment blueprint |
| `electron/main.js` | Desktop wrapper |
| `.github/workflows/build-desktop.yml` | Windows/Mac release build |
| `.github/workflows/native-sync.yml` | Protected scheduled sync call |

## 13. Important `index.html` entry points

| Area | Important code |
|---|---|
| File readers | `readSourceFile`, `readSourceBuffer`, `decodeText`, `readZip`, `readWorkbook`, `jsonTables`, `domTables`, `spreadsheetMLTables` |
| Delimited text | `parseDelimitedText`, `splitDelimited`, `sniffDelimiter`, `matrixToObjects`, `headerScore` |
| Legacy Excel | `readOle`, `readLegacyWorkbook`, `biffString`, `rkValue` |
| Column aliases and normalization | `ALIAS`, `nativeMap`, `platformFromName`, `platformFromHeaders`, `clientFromName`, `clientFromFileName`, `reconcileInferredClients`, `normalizeRow`, `classify`, `ingestRows` |
| Native connections | `refreshSyncState`, `renderSyncConnections`, `syncFetch`, `dropImportedSource` |
| Deduplication | `recordKey`, `addUnique` |
| Data audit | `auditData`, `renderQualityPanel` |
| Metric engine | `windowMetrics`, `periodRowsForWindow`, `postEng` |
| Time series | `monthlySeries`, `contentSeries`, `accountSeries`, `seriesFor` |
| Metric definitions | `METRICS` |
| Targets | `TARGET_DEFS`, `clientTargetsFor`, `goalMetricRow`, target editor functions |
| Analysis | `contentAnalysis`, `baselineDev`, `analyze`, `benchmarkHtml` |
| AI | `AI_SYSTEM`, JSON schemas, `buildAIContext`, `validateAINarrative`, `generateAINarrative` |
| Report rendering | `render`, `metricCard`, `organizeReportPages`, `applyReportPage` |
| Charts | `chartHolder`, `mountCharts`, horizontal/weekday bars |
| Customization | `buildCustomUI`, `wireCustom`, `wireEdits` |
| Sharing | `buildBundle`, compression/encryption helpers, `saveShortReport`, `makeShareLink` |
| Client lock | `applyViewLock`, startup link loader |
| Letter animation | `maybeShowLetter`, `closeLetter`, envelope CSS/markup |

## 14. Security and privacy requirements

Do not:

- commit real client CSVs;
- commit platform credentials, OpenAI keys, Render secrets, OAuth tokens, passwords, or 2FA codes;
- include one client’s data in another client’s bundle;
- expose CNO-only evidence or analyst cautions to clients;
- treat a hidden browser control as authorization;
- log tokens or report passwords;
- use total/organic metrics as paid-attributed outcomes;
- represent a hypothesis as a known cause; or
- represent future cloud features as complete.

Before every public commit:

1. Scan tracked/staged files for real client names and private data.
2. Confirm demo/test data remains fictional.
3. Run syntax and formula checks.
4. Test staff and client views.
5. Test that client links contain one client and only the selected platforms.
6. Confirm API keys/tokens are absent from bundles and Git.

## 15. Release and testing expectations

For every meaningful release:

- parse all inline report JavaScript;
- parse all Node service modules;
- validate JSON manifests;
- run `git diff --check`;
- run privacy scans;
- load the fictional demo in a browser;
- inspect browser errors;
- verify no `NaN` or `undefined`;
- verify one open staff panel at a time;
- test at least one client-and-platform target;
- test imported-target disable/override behavior;
- test multi-platform separation;
- test engagement-rate formula and paid formulas;
- test account-total authority versus post-detail fallback;
- test a normal short link, password-protected link, wrong password, revocation, and damaged link when the service is available;
- verify the opening and Summary both begin `Dear [client],`;
- verify the sign-off;
- verify view-only controls are removed;
- verify Render serves the new version; and
- verify Windows/Mac release assets attach to the GitHub tag.

The existing fictional fixtures should remain the minimum regression set. Add edge-case fixtures rather than replacing them.

## 16. Definition of “production ready”

The system should not be called fully automated or production secure until:

- the repository and infrastructure are CNO-owned;
- the private service and persistent database are live;
- provider apps are approved and validated;
- staff authentication and roles are live;
- client tenant isolation has automated authorization tests;
- OpenAI requests are server-side;
- reports are stored as immutable approved versions;
- sync completeness and formula reconciliation gates can block publication;
- CNO can review, edit, approve, publish, revoke, and reproduce a report;
- monthly scheduling and delivery failures are monitored;
- retention/offboarding/privacy policies are defined; and
- two complete periods per provider have been reconciled against native analytics.

## 17. Recommended first week for the next developer

1. Read this document, `README.md`, `01_METRICS_DICTIONARY.md`, `DATA_ACCURACY_AND_ACCESS.md`, and `CLOUD_AUTOMATION_BLUEPRINT.md`.
2. Run the demo and import every test CSV.
3. Trace one metric from raw CSV heading through normalization, calculation, visualization, AI context, and client bundle.
4. Transfer or fork the repository into the CNO-owned GitHub account.
5. Verify the CNO-owned sync service, Postgres retention, and every configured secret from the Render dashboard without changing the active domain.
6. Add a repeatable cross-device test for short report links, passwords, expiry, and revocation.
7. Validate one provider OAuth flow with a CNO-owned test account.
8. Propose the module/test refactor before adding large new visualization features.
9. Create a production backlog from the P0/P1 priorities above.
10. Preserve the deterministic metric engine and the clear distinction between implemented, pilot, and future features.
