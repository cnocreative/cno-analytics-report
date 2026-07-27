# First-wave feedback status

This checklist records what the report supports and what the operator does each month.

- [x] CNO wax seal centered on the report and used in the opening letter.
- [x] Instagram, TikTok, LinkedIn, YouTube, Facebook/Meta, and other detected platforms appear as checkboxes.
- [x] Metrics, audience data, charts, and comparisons recalculate for the selected platform(s); one platform is selected by default, and a multi-platform selection renders separate platform KPI panels and charts instead of a blended engagement rate or funnel.
- [x] Multiple CSV selection and page-wide drag-and-drop.
- [x] Campaign tags and campaign comparison using robust medians.
- [x] Content-pillar tags and pillar comparison, with a visible count of untagged posts.
- [x] Daily, weekly, monthly, last-30-day, last-90-day, all-time, and custom date views.
- [x] Editable narrative, findings, recommendations, headline, and opening letter; edits persist in the browser.
- [x] Previous-report recommendation continuity when reports are created in the same browser.
- [x] Unique interactive report links, with optional client-side password protection.
- [x] Caption length is explicitly labeled as characters.
- [x] Audience section is separated by platform and expands when demographic fields are uploaded.
- [x] Website clicks, DMs, meaningful comments, comment replies, leads, bookings, memberships, retail sales, revenue, and event outcomes are recognized.
- [x] Current-versus-prior comparisons on headline, profile, content, and journey metrics.
- [x] Branded wax-seal envelope and letter introduction.
- [x] Paid/boosted data: spend, paid reach/impressions, paid clicks/leads/follows/conversions/revenue, CPM, CPC, CTR, frequency, cost per lead/follow/conversion, and ROAS. Raw paid totals are calculated first; platform-reported rates are fallback validation values, and total organic-plus-paid outcomes are never substituted.
- [x] Prioritized organic formulas: follower net/percent growth, ER by reach, reach rate, raw interaction counts, top posts by ER, average ER by format, average engagement by weekday/hour, Instagram Story retention, TikTok watch/completion, YouTube duration/subscriber growth, and LinkedIn post CTR.
- [x] Tracking-aware availability: cost per conversion and ROAS remain hidden when paid conversion/revenue attribution is not supplied.
- [x] Full uploaded dataset is available as a spreadsheet at the bottom and can be downloaded in normalized form.
- [x] Visualization-first success scorecard covering authority, audience quality, campaign momentum, and business growth, with optional per-metric monthly targets and progress-to-goal bars (`<metric>_target` columns).
- [x] Formula-matched platform benchmark context, with warnings against blending platforms or mismatching engagement-rate denominators; client-specific peer norms can replace the reference.
- [x] CNO website styling—including typography, color, fine rules, editorial layouts, and “Hand it over” upload action.
- [x] Report opens as a concise “Dear [client]” letter and a simplified first page, with separate performance, content, and full-data pages for readers who want more depth.
- [x] Paid vs. organic and goal progress appear near the top as compact summaries; full paid efficiency and full goal tables live on the deeper performance page.
- [x] CNO can reorder sections, move them between pages, or hide them without changing the underlying data.
- [x] Required AI analysis: paste an OpenAI or Anthropic API key to write the letter, key takeaways, and plain-language explanations throughout the report. It includes structured evidence keys, confidence levels, sample-size rules, data-quality cautions, optional CNO context, and a CNO-only evidence review. The key can be remembered on one trusted CNO device but never travels in a share link.
- [x] CNO-only data-quality audit and visibly separate **CNO workspace · staff tools** versus **Client report · view only** experiences.
- [x] Shared links are scoped to a single client's data and open view-only (no uploading, switching clients, editing, or export), so one client can never see another's results even if a password is mishandled.
- [x] Installable, offline-capable app (PWA): add to home screen or install on Mac/Windows/phone, and bookmark to return anytime.
- [x] Expanded paid vs. organic section: reach and impressions splits, paid share of reach, and an AI read on spend.
- [x] Native OAuth service exchanges Meta authorization for a long-lived token and automatically rotates supported TikTok/LinkedIn access and refresh tokens before scheduled sync.

## Monthly refresh workflow

1. Export the required period from Rella and/or each native platform. Export account-level and post-level data when both are available.
2. Export attributable outcomes from the client’s operational systems when they matter: inquiries, bookings, memberships, event registrations/attendance, orders, and revenue.
3. Add `client`, `platform`, `campaign`, `campaign_phase`, and `pillar` columns where those labels are not already present. Do not alter the source metric columns.
4. Upload all files together. Select one platform at a time for platform-specific reporting, then select multiple only for an intentional portfolio view.
5. Choose the report period and chart detail. Sanity-check headline totals against the native platform for the same date range.
6. Generate the required AI analysis, check its evidence, and edit the letter where human context is required. The charts and calculations remain deterministic.
7. Create a new password-protected share link for that client and cycle. Send the password separately.

Manual CSV calculation still needs no server database, but a client-ready share link or PDF requires the AI letter. A shared link is a self-contained encrypted snapshot, so refreshing manual source data requires creating a fresh link. The optional native-sync service is a separate CNO-only backend and is not exposed in client reports.
