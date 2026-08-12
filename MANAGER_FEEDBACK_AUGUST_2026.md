# CNO Reports — August 2026 feedback review

Review date: August 12, 2026

This document records the current stable baseline, the correct production addresses, the latest manager feedback, and the safest order for implementing the next improvements. It deliberately separates low-risk report refinements from work that depends on provider approval, additional source data, or the future authenticated cloud product.

## 1. Current stable baseline

The web report is working well and should be treated as the regression baseline. Since the prior developer handoff, the project has added:

- CNO-owned GitHub and Render deployment;
- native CSV, TSV, UTF-16, Windows-1252, XLSX, legacy XLS, ZIP, JSON, Excel XML, and HTML-table import;
- automatic heading-row, delimiter, encoding, client, and platform resolution with audit warnings instead of silent Instagram defaults;
- fixes for real Meta Business Suite and LinkedIn export structures;
- multi-platform AI letters that keep every platform's metrics separate and prohibit blended rates;
- a client-directed letter page and opening experience;
- cross-device short report links with explicit failure instead of silently opening an empty workspace;
- a browser-driven native connection panel;
- a deployed OAuth/sync/share service with durable Postgres storage;
- provider setup diagnostics, token encryption, CSRF protection, login throttling, disconnect controls, and scheduled-refresh foundations;
- Meta privacy/data-deletion pages and TikTok verification support; and
- additional data-quality, date, source-provenance, and service-worker fixes.

Do not redesign or replace these working systems during the feedback pass. Make changes incrementally and regression-test imports, formulas, client scoping, AI validation, report links, and the letter flow after each group.

## 2. Production address registry

Use these exact addresses until CNO intentionally completes and verifies custom-domain DNS:

| Surface | Active address | Status |
|---|---|---|
| Report website | `https://cno-analytics-report-5hi6.onrender.com/` | Active CNO-owned static site |
| Demo | `https://cno-analytics-report-5hi6.onrender.com/#demo` | Active fictional demo |
| Native sync/share service | `https://cno-native-sync-gp4h.onrender.com` | Active; health check reports Postgres, durable storage, and setup complete |
| Repository | `https://github.com/cnocreative/cno-analytics-report` | Active CNO-owned repository |

Retired/suspended addresses that must not be restored in app links or instructions:

- `https://cno-analytics-report.onrender.com/`
- `https://cno-native-sync.onrender.com`

Domain rules:

1. The Render-generated suffixes (`-5hi6` and `-gp4h`) are part of the active addresses, not accidental text.
2. Do not set `PUBLIC_BASE_URL` to a proposed custom domain before that domain resolves publicly.
3. OAuth callback URLs must exactly match the address that the sync service is actually using, including the `-gp4h` suffix and no trailing slash after `/callback`.
4. If custom domains are added later, update the app metadata, Render origins, provider callback registrations, legal pages, desktop documentation, and scheduled-sync secret together.
5. Keep the retired sync address only in the application's explicit retired-address migration list; do not use it as an example or default.

## 3. Feedback triage

Status labels:

- **Quick win** — localized front-end change with low regression risk.
- **Contained enhancement** — feasible in the current product but needs data/AI/test work.
- **Data-dependent** — the report cannot show it unless the export, API, or business system supplies it.
- **Cloud phase** — requires authenticated persistence, scheduling, or delivery infrastructure.

### Overall report

| Request | Classification | Recommended implementation |
|---|---|---|
| First-open tutorial with arrows | **Quick win** | Add a five- or six-step guided tour over Import data, period, platform, audit, AI, and Share. Save `tour_completed` locally, include Skip/Back/Next, and add “Replay tutorial” under Help/Get the app. Do not block report use. |
| Automatically email reports monthly | **Cloud phase** | Implement only after cloud report versions, client recipients, approval state, tenant isolation, and delivery logging exist. Send a secure report link, not report data. Never email an unapproved or failed-audit draft. |
| Larger main takeaways and larger type overall | **Quick win** | Increase the base report type modestly, make the primary recommendation/headline more prominent, and preserve responsive/print layouts. Test desktop, mobile, and PDF before release. |
| Sensible defaults for each client | **Contained enhancement** | Add named client presets for goal, featured KPIs, section order/page, hidden sections, platform selection, chart grain, letter setting, and target policy. Local presets are a quick pilot improvement; cross-device presets belong in the future client database. |
| Avoid repeating the letter | **Quick win** | Recommended structure: the envelope contains a short two- or three-sentence teaser; Page 0 contains the full letter; Summary contains no repeated letter. Alternatively remove Page 0, but do not show the same full letter twice. |
| Add letter-style color contrast throughout | **Quick win** | Reuse terracotta emphasis for the primary takeaway, cautions, recommendation, benchmark status, and selected values. Keep semantic positive/negative colors accessible and avoid coloring every number. |

### Summary page

| Request | Classification | Recommended implementation |
|---|---|---|
| Restore “vs prior” for LinkedIn | **Contained enhancement / possibly data-dependent** | The comparison engine already works across platforms. First show an explicit reason when LinkedIn has no prior comparable rows. If prior rows exist, add a regression fixture using the exact LinkedIn export and fix the date/metric mapping rather than forcing a comparison from missing data. |
| AI explanation when a metric decreases | **Contained enhancement** | Add a concise “what changed / what may explain it / what CNO will check next” explanation. AI must label causes as hypotheses unless campaign/content evidence supports them. A deterministic fallback should say what decreased and what related evidence is or is not available. |
| Move recommendation to the top | **Quick win** | Make Recommendations the first Summary section after the report heading, before headline KPIs. Keep it editable. Update the default section order without overwriting a client's saved custom order. |
| Goal snapshot repeats headline metrics | **Quick win** | Suppress duplicate goal cards already used in the featured KPI row, then fill with non-duplicate approved outcomes. Hide the snapshot entirely if fewer than two meaningful non-duplicate goal metrics remain. |
| Compare engagement rate and posts with benchmarks; views and engagement with prior | **Contained enhancement** | Add a comparator policy by metric. Views and total engagement use equal-length prior history. Engagement rate uses the client's own historical baseline first and a formula-matched external benchmark second. Posting volume uses the client's approved cadence/target or historical baseline; do not imply a universal industry posting target. |
| Make opening letter clearly editable and allow bolding | **Contained enhancement** | Inline editing already works in the CNO workspace. Add an obvious “Edit letter” control and a very small formatting toolbar for bold/italic. Preserve sanitization and store only safe formatting. Cloud-backed editing/version history remains future work. |

### Performance page

| Request | Classification | Recommended implementation |
|---|---|---|
| Explain missing “Active interest,” “Audience quality,” and “Business outcomes” data | **Data-dependent** | Replace generic “Add data” with a source-specific message. Profile visits/clicks/audience fields may come from native platform access. Meaningful-comment quality usually needs CNO tagging. Leads, bookings, memberships, retail sales, and revenue normally require CRM/booking/sales data and are not supplied by social APIs. |
| Show both Posts count and percentage change | **Quick win** | Ensure the large value is always rendered and the comparison remains secondary beneath it. Add a visual regression case where Posts is a featured KPI. |
| Add numbers and Y-axis labels to trends | **Contained enhancement** | Add readable zero/baseline and max ticks, abbreviated values, and optional latest-point labels. Keep hover values and responsive SVG behavior. Avoid dense labels on mobile. |
| Add editable AI explanations to performance sections | **Mostly complete; refine** | AI section notes and inline editing already exist. Make them consistently visible after generation, improve prompts for decreases and missing data, and give every chart a deterministic plain-language fallback before AI runs. |
| Move Full goals & outcomes upward | **Quick win** | Make it the first detailed Performance section, followed by the existing attention-to-action path. Preserve client-specific saved orders. |
| Different goal/outcome layouts by client | **Contained enhancement** | Include goals/outcomes in the client preset system. Only show measures available for that client or deliberately configured for collection. |
| Preserve the attention-to-action path | **Must preserve** | This is specifically liked. Do not remove it; improve source/fallback labels around missing steps instead. |

### Content page

| Request | Classification | Recommended implementation |
|---|---|---|
| Give Engagement mix a stronger “so what?” | **Quick win** | Generate a specific deterministic callout from the actual mix: zero saves, unusually share-heavy response, comments rising/falling, or likes dominating. Explain the business meaning and avoid causal claims. |
| Add links to top posts | **Contained enhancement / source-dependent** | Preserve `permalink`/`share_url` through normalization, exports, report bundles, and client-safe rendering. Meta and TikTok sync adapters already receive links, but the report data model currently drops them. CSV/native exports without a URL cannot be linked. |
| Remove scrolling from Format detail | **Quick win** | Render the short format table as a normal visual card without a fixed-height data wrapper. Keep horizontal overflow only when genuinely required on small screens. |
| Captions show “(no caption)” | **Data-dependent with pipeline fix available** | Do not invent captions. Native Meta/TikTok adapters already request caption/title text; preserve it end-to-end. For Rella exports that omit post metadata, show a clear “caption not included in source export” label and use post ID/date/type as the fallback identity. |
| Move Top posts to Full Data unless it becomes visual | **Quick win** | Default the existing table to Full Data. A future Content-page version can use three visual post cards with thumbnail/link, format, date, engagement rate, reach, and one “why it mattered” note. |
| Make Engagement mix callout specific | **Quick win** | Combine with the “so what” change above. Example logic: if saves are zero, say that explicitly; if shares are the strongest deep-action signal, say so; compare with prior only when prior components exist. |
| Add a clear takeaway to “What makes posts work” | **Quick win** | Promote the existing directional conclusion into a prominent callout and state sample size/confidence. |
| Include video length and carousel length | **Contained enhancement / source-dependent** | Add normalized `duration_seconds` and `carousel_slide_count` fields, aliases, export/bundle fields, and grouped analysis. Native adapters should request these fields where the provider allows them. Hide the analysis when the source does not provide enough posts. |

## 4. Recommended low-risk implementation batch

The following batch gives the largest visible improvement without changing the calculation engine, importer architecture, share encryption, or OAuth service:

1. Add the optional first-open tutorial and replay control.
2. Increase report typography and emphasize primary takeaways.
3. Move Recommendations to the top of Summary.
4. Deduplicate or hide Goal snapshot.
5. Move Full goals & outcomes to the top of Performance.
6. Ensure Posts always shows its actual count above the comparison.
7. Replace the generic Engagement mix note with a specific callout.
8. Remove the fixed-height scroll from Format detail.
9. Move the Top posts table to Full Data by default.
10. Use a short opening teaser plus one full letter, rather than repeating the full letter.
11. Clean stale non-suffixed Render URLs from documentation and examples.

These changes should be one release because they are primarily presentation, order, and explanatory-copy changes. They must not alter formulas or source authority.

## 5. Second implementation batch

After the low-risk batch is stable:

1. Add per-client presets and a “Save as this client's default” action.
2. Add metric-specific comparator policies.
3. Diagnose LinkedIn prior-period coverage with a real anonymized fixture.
4. Add numeric Y-axis ticks and chart labels.
5. Improve AI decrease explanations and deterministic fallbacks.
6. Add the explicit letter-edit control and safe bold/italic toolbar.
7. Preserve and render post permalinks.
8. Add video duration and carousel-slide fields when supplied.
9. Optionally replace the Top posts table with visual cards.

## 6. Native automation and email workstream

Automated native pulling is no longer a blank-slate project: the OAuth service, browser connection center, encrypted token storage, account assignment, refresh adapters, scheduler endpoint, and Postgres persistence exist. Remaining work is operational and provider-specific:

1. Finish provider app ownership/review and register the exact `-gp4h` callback URLs.
2. Validate each provider against a real CNO-owned test account for at least two full periods.
3. Reconcile API results against native exports and document unavailable metrics.
4. Add connection-health monitoring, revoked-permission alerts, and scheduled-run visibility.
5. Decide the monthly report window and timezone per client.
6. Store normalized snapshots and immutable report drafts in the cloud.
7. Add CNO approval before publication.
8. Add secure client recipients and email delivery only after approval and data-quality gates pass.

Meta/Instagram can supply post captions, permalinks, post engagement, account insights, and audience data allowed by the approved permissions. TikTok can supply video metadata and available performance fields. LinkedIn access and field depth depend on the approved product and organization permissions. None of these social APIs normally knows the client's offline bookings, memberships, retail sales, or total revenue; those require a separate business-data source or manual import.

## 7. Guardrails for every next release

- Preserve engagement rate by reach as the primary internal formula.
- Never blend unlike platform rates.
- Never show a prior-period change when no comparable source rows exist.
- Never let AI invent a reason, target, caption, URL, or business outcome.
- Keep one client and only approved platforms in a client link.
- Keep CNO controls, API keys, evidence, and drafts out of client links.
- Keep the active Render suffixes until a tested custom-domain cutover.
- Preserve the attention-to-action path.
- Preserve import support for all currently verified file formats.
- Run privacy scans and use only fictional/anonymized fixtures in the public repository.
- Regression-test the live website, sync health, short links, view-only mode, print/PDF, and desktop builds before release.
