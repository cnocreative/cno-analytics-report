# CNO Reports cloud automation blueprint

This is the production path from the current downloadable/browser pilot to a private report library that refreshes and delivers every month. It preserves the deterministic metric engine while moving credentials, scheduled work, and report history behind authenticated services.

## Product boundary

### CNO workspace

CNO staff can:

- create and archive clients;
- connect native social accounts once;
- configure each client's goals, KPIs, report sections, page order, and delivery schedule;
- inspect source coverage and calculation warnings;
- generate, edit, approve, and publish the AI-written letter;
- view connection health, sync history, and an audit log; and
- invite or revoke client viewers.

Recommended roles:

- `owner`: billing, staff, secrets, integrations, and all clients;
- `analyst`: import, validate, generate, edit, and publish assigned clients;
- `viewer`: internal read-only access.

### Client portal

Client users see only the organizations to which they are assigned. They can:

- open the latest report;
- move through the simple first page and deeper data pages;
- switch permitted dates/platforms;
- browse their own report archive; and
- download an approved PDF or data attachment when CNO enables it.

Clients cannot see imports, API keys, OAuth status, unpublished drafts, other clients, or CNO-only notes.

## Recommended architecture

Use one managed authentication and Postgres platform for the first production version (for example, Supabase Auth + Postgres), the existing Node sync service as the server, and object storage for immutable report snapshots.

Core records:

| Record | Purpose |
|---|---|
| `organizations` | CNO and client tenants |
| `users` / `memberships` | identity, organization, and role |
| `clients` | report settings, goals, timezone, schedule |
| `connections` | provider/account metadata, exact client-account assignment, and encrypted OAuth tokens |
| `sync_runs` | source, dates, row count, validation result, errors |
| `metric_snapshots` | normalized deterministic metrics for one reporting period |
| `report_versions` | approved copy, page/section layout, status, publish date |
| `report_access` | which client organizations can open which reports |
| `deliveries` | email recipient, send status, and link expiration |
| `audit_events` | actor, action, record, and timestamp |

Every tenant-owned row carries an `organization_id`. Database row-level security must deny access unless the authenticated membership is allowed to read that tenant. Client access must never rely only on hiding controls in the browser. An OAuth grant that reveals several profiles must also require an explicit provider-account assignment inside the matching client tenant before any sync job can run.

## Monthly automated flow

1. A scheduler selects clients whose local reporting period has closed.
2. The server refreshes OAuth access if needed and syncs every connected platform.
3. The deterministic engine normalizes rows, calculates metrics, reconciles account totals against post detail, and records warnings.
4. If required sources are missing or totals fail tolerance, the job pauses for CNO review.
5. The server sends a compact evidence package—not raw credentials—to the configured AI model.
6. AI returns the plain-language letter and section explanations under a strict schema.
7. A draft report version is saved. CNO edits/approves it, or a client-specific policy allows auto-approval only when all validation gates pass.
8. Publication creates an immutable snapshot and a tenant-scoped portal link.
9. The email service sends a short notification containing the secure link, not the report data.
10. Revocation removes portal access immediately; prior emailed links no longer bypass authorization.

## Secret and token handling

- The production OpenAI key belongs in server-side secret management, never in report HTML, local storage, share links, or the client portal.
- Social passwords and 2FA codes are entered only on the native platform.
- OAuth access and refresh tokens remain encrypted server-side. Refresh tokens are rotated when the provider returns replacements.
- Move the token encryption key to a managed KMS before broad client rollout.
- Use HTTP-only secure sessions, staff MFA, invite-only client access, rate limits, and audit logs.
- Retain only the data required by the contract; define deletion and offboarding procedures before launch.

The downloadable v1.6 pilot can remember a staff user's AI key on that device for convenience, but browser storage is not the final production secret boundary.

## Delivery phases

### Phase 1 — v1.6 pilot

- AI is required before sharing or PDF publication.
- A short client letter and layered report pages are generated.
- CNO can move sections between pages and reorder them.
- API key can be remembered on one trusted CNO device.
- Native OAuth service stores encrypted tokens and refreshes supported connections.

### Phase 2 — authenticated CNO beta

- Managed staff accounts, roles, server-side AI calls, client records, report drafts, audit log.
- Connection health dashboard and automatic monthly draft creation.
- No client login yet; CNO validates calculations against native dashboards.

### Phase 3 — private client portal

- Tenant-isolated client accounts and report archive.
- Publication workflow, secure email notification, revocation, passwordless sign-in.
- Import old approved reports into each client's archive.

### Phase 4 — guarded automation

- Automatic delivery only after source completeness, reconciliation, and AI-schema checks pass.
- Exceptions route to CNO rather than sending an uncertain report.
- Monitoring alerts CNO about revoked authorization, platform API changes, missing conversion tracking, or unusual metric discontinuities.

## Launch gates

Do not enable unattended client delivery until:

- every provider adapter has passed app review and has been validated against native exports for at least two complete periods;
- formulas, timezones, attribution windows, and non-additive reach rules pass fixture tests;
- tenant isolation has automated authorization tests;
- CNO can preview, edit, approve, revoke, and reproduce every report version;
- token refresh/revocation and failed-delivery paths have been tested; and
- privacy, retention, terms, and client-consent language are approved.
