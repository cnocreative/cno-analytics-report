# Data accuracy, AI, and access model

This document defines the product boundaries that keep CNO Reports trustworthy as it moves from a CSV pilot to a multi-client system.

## Two clearly different experiences

### CNO workspace

The normal application is an operator workspace for CNO staff. It contains data import, native sync, the data-quality audit, AI drafting, customization, sharing, export, and print controls. The masthead labels this mode **CNO workspace · staff tools**.

This label is an interface distinction during the pilot, not authentication. Anyone with the unprotected workspace URL can currently open the static application, although no client data exists there until it is imported locally.

### Client report

A generated share link is scoped to one client and opens in **Client report · view only** mode. It retains date, chart-detail, and platform exploration while removing import, client switching, native sync, data audit, AI, customization, re-sharing, export, installation, and editing controls.

The optional password encrypts the report snapshot in the URL. It is not a user account and cannot be centrally revoked after distribution.

## Recommended account rollout

Do not add home-grown employee passwords to the static page. Introduce managed authentication when the metric logic and client experience have passed pilot testing.

### Phase 1: pilot (current)

- Local CNO workspace with no account database
- One-client, view-only encrypted snapshot links
- Shared internal token for the separate native-sync console
- No claim that the workspace label itself is a security boundary

### Phase 2: CNO staff accounts

- Managed email magic-link, passkey, or enterprise identity provider
- Server-issued HTTP-only sessions
- Roles: `owner`, `analyst`, and `viewer`
- Owner-only connection and staff administration
- Analyst import, audit, AI draft, edit, and publish permissions
- Viewer read-only internal review
- Per-user audit log for imports, edits, AI generations, connection changes, and report publication
- Replace the shared native-sync admin token with individual staff identities

### Phase 3: client portal

- Separate `client_viewer` identities and organizations
- Database-enforced tenant isolation and row-level security
- Revocable report access, expiration dates, and optional password/2FA policy
- Published report versions are immutable snapshots; drafts remain CNO-only
- Live dashboards read only the latest approved publication, not unreviewed sync output
- Managed KMS/HSM for OAuth-token encryption keys

## Metric aggregation rules

1. Account/platform totals are authoritative for headline metrics. Post rows provide creative detail and are fallback totals only when the account export is absent.
2. Spend from an account or Ads Manager summary is never added again from ad-level rows.
3. Reach is non-additive. A sum of daily unique reach is labeled directional because the same person can appear on multiple days. Exact monthly reach requires a period-total row from the platform.
4. Followers are snapshots. The latest snapshot per platform is used; snapshots are not summed across dates.
5. Cross-platform reach, views, and engagement definitions are not treated as interchangeable. One platform remains selected by default.
6. Missing values remain missing. They are never silently converted into zero for KPI availability.
7. Paid-efficiency metrics require paid-specific denominators:
   - CPM = spend / paid impressions × 1,000
   - paid CPC = spend / paid clicks
   - paid CTR = paid clicks / paid impressions
   - frequency = paid impressions / paid reach
   - cost per paid lead = spend / paid-attributed leads
   - cost per paid follow = spend / paid-attributed follows
   - cost per paid conversion = spend / paid conversions
   - ROAS = paid-attributed revenue / spend
8. Total website clicks, total follower growth, and total revenue are not assumed to have been caused by paid media.
9. Platform-reported paid rates are fallback/validation fields. Raw paid totals win whenever the required numerator and denominator are available.
10. Story exit rate is exits / Story views. Story completion is completed Story views / Story views, or 1 − exit rate only when direct completions are unavailable.
11. Cost per conversion and ROAS remain unavailable when conversion/revenue attribution is not configured.

## CNO data-quality audit

The CNO-only **Data audit** panel checks:

- account and post row coverage;
- selected-platform and source coverage;
- missing core KPIs;
- potential same-platform/date overlap across exports;
- daily unique-reach aggregation risk;
- account totals versus post-detail reconciliation; and
- whether the report is using account totals or post-derived fallbacks.

Reconciliation differences are not automatically errors. Account totals can include stories, ads, deleted posts, or platform surfaces absent from a post export. The audit flags the difference for review instead of forcing the two grains to match.

## AI boundary

AI is required for a client-ready letter, share link, and PDF, but it remains CNO-side only. Deterministic metrics and visualizations continue to calculate without an API key so imports can still be audited and explored.

The AI receives a compact, structured context containing selected metrics, comparisons, sample sizes, goal progress, paid-specific measures, top-post evidence, campaign/pillar summaries, data-quality warnings, the prior recommendation, and optional human context supplied by CNO.

For OpenAI, the application uses the Responses API with strict JSON-schema output, explicit reasoning depth, `store: false`, and an evidence list plus confidence level for every finding. Model output is sanitized before it reaches the report. The generated narrative is still a draft: CNO reviews and edits it before publication.

The current bring-your-own-key pilot can remember the key in browser storage on a trusted CNO device, or keep it for only the current session. It is never included in a client share link. Browser storage is a convenience boundary, not production secret management. The authenticated cloud version must move AI calls to the CNO backend and keep the provider key only in server-side secret management. See [`CLOUD_AUTOMATION_BLUEPRINT.md`](CLOUD_AUTOMATION_BLUEPRINT.md).

## Publication gate

Before a client report is sent:

1. Match the reporting dates and platform selection to the native source.
2. Resolve every warning in Data audit or document why it is acceptable.
3. Spot-check headline metrics against the authoritative platform total.
4. Review AI evidence references, hypotheses, and human context.
5. Confirm the report contains only the intended client.
6. Publish a new view-only snapshot and send its password separately.
