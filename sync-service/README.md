# CNO Native Analytics Sync

This is the private server-side companion to the static CNO reporting dashboard. It begins the fully automatic native-platform workflow without putting platform passwords, app secrets, or OAuth tokens in `index.html` or client share links.

## What is implemented

- Private CNO staff console at `/admin`
- Meta, TikTok, and LinkedIn OAuth authorization-code flows
- Short-lived, one-use OAuth state values to prevent forged callbacks and replay
- AES-256-GCM encryption before access or refresh tokens reach the database
- HTTP-only, secure, 30-day internal sessions so staff do not sign in every reporting cycle
- Long-lived Meta token exchange plus automatic TikTok/LinkedIn refresh-token rotation where the approved provider app returns refresh access
- Platform/account discovery after authorization
- A required account-assignment step when an authorization exposes more than one profile: CNO selects the exact native profile and, for Meta, the exact matching ad account before any sync can run
- Organic Instagram account/content pulls, optional Meta Ads pulls, TikTok profile/video pulls, and LinkedIn Page/share/follower-total pulls
- Normalization into the same account/post row structure used by CNO Reports
- Stored sync snapshots and a protected daily sync endpoint
- Ten-minute, single-use import links that transfer normalized rows into CNO Reports without transferring credentials
- Short, cross-device client report links stored as encrypted server payloads, with optional client-side password protection, one-year expiry, and staff revocation
- No provider tokens in logs, URLs returned to the report, client share links, or browser storage

## Reliable client report links

The static report still understands older portable `#data=` links, but those URLs can become long enough for email, SMS, and chat tools to truncate them. The preferred flow now stores the compressed report payload in this private service and copies a short URL containing only a random report ID.

1. CNO signs into `/admin` once on the trusted staff device.
2. CNO creates the report and clicks **Share link**.
3. The reporting app saves the already client-scoped payload through the authenticated staff session.
4. The client opens a short `?report=` URL on any device.
5. CNO can revoke that link under **Manage client report links**.

The stored payload is encrypted at rest with `TOKEN_ENCRYPTION_KEY`. If CNO adds a report password, the payload is also encrypted in the browser before upload, and the password is never sent to this service. Source platform credentials and the CNO OpenAI key are never included.

Provider APIs change frequently and require app review. Each adapter deliberately returns partial useful data when an optional metric or permission is unavailable instead of failing the entire client sync.

## The Rella-style connection flow

The safe reporting equivalent of a Rella Social Space is one CNO client workspace:

1. CNO chooses the client in CNO Reports and clicks **Connect selected client**.
2. A secure browser window opens. CNO chooses the provider and the client signs in on Meta, TikTok, or LinkedIn itself.
3. The provider shows its own consent screen.
4. Back in the private CNO console, CNO assigns the exact native account that belongs to that client. A Meta connection can assign one Instagram profile and one matching ad account.
5. The encrypted authorization stays on the server and scheduled refreshes continue until the provider revokes it, it expires without refresh access, or an app permission changes.

No terminal, command, copied token, or platform API key is part of this staff workflow. The service must be deployed once by a CNO account owner through the GitHub, Render, and provider websites; after that, connection and reconnection happen through browser buttons only.

An authorization that returns several profiles is never treated as permission to merge them. Syncing remains blocked until the exact account assignment is saved. This is the critical tenant boundary that prevents one client's metrics from entering another client's report.

This service is intentionally scoped to analytics collection and report refresh. Rella's scheduling, auto-posting, and community-management features are separate products and are not represented as part of CNO Reports.

## Security boundary

Clients authorize on Meta, TikTok, or LinkedIn itself. CNO never asks for or stores the client's platform password or 2FA code. The provider sends an authorization code to this service, the service exchanges it server-to-server, and only encrypted tokens are persisted. When a supported access token nears expiration, the service rotates it before syncing. Revoked access, provider policy changes, and Meta authorizations that can no longer be extended still require reconnection.

CNO staff can see:

- the client label;
- provider, discovered account names, and the exact account assignment for each client;
- last-sync status; and
- normalized analytics.

CNO staff cannot see OAuth tokens in the console. Render environment owners remain part of the infrastructure trust boundary because they can control the running service and its encryption key. Eliminating even that access requires a managed KMS/HSM with a narrowly scoped service identity; that is a later production-hardening step and is not honestly achievable with a completely free static site.

The current admin token is a pilot control, not a complete employee account system. After metric and provider validation, replace it with individual managed staff identities, server-issued HTTP-only sessions, `owner` / `analyst` / `viewer` roles, and an audit log. Keep client identities in a separate tenant-scoped portal. See [`../CLOUD_AUTOMATION_BLUEPRINT.md`](../CLOUD_AUTOMATION_BLUEPRINT.md).

## Platform prerequisites

### Meta / Instagram

Create a Meta developer app and request only the read permissions required for reporting. Instagram insights require a professional account and appropriate insights permissions. Paid/dark-ad reporting also needs `ads_read`. Facebook Page organic collection is not represented as complete in this pilot; native Facebook CSVs remain supported by the report importer. Meta's current requirements are summarized in its [official Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-26e7999c-fc7e-44c8-8f71-ab2de8d35c32).

Callback URL:

```text
https://YOUR-SYNC-SERVICE/oauth/meta/callback
```

### TikTok

Create and submit a TikTok developer app, configure Login Kit, and request the analytics/video scopes CNO needs. TikTok requires direct user consent and recommends keeping tokens server-side. See [TikTok OAuth token management](https://developers.tiktok.com/doc/login-kit-manage-user-access-tokens).

The default request uses the documented `user.info.basic`, `user.info.stats`, and `video.list` scopes. Watch time and completion fields remain supported by native CSV imports, but they should not be promised through Login Kit unless TikTok approves an API product that actually returns them.

Callback URL:

```text
https://YOUR-SYNC-SERVICE/oauth/tiktok/callback
```

### LinkedIn

Create a LinkedIn developer app and request Community Management access. Organization analytics requires `rw_organization_admin` and an authenticated member with the necessary administrator role. The adapter pulls Page views/clicks, organic share reach/impressions/interactions/clicks, and the current follower total. Per-post and sponsored detail still come from native exports until those separately reviewed products are enabled. See [LinkedIn OAuth](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication), [Organization Page Statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/page-statistics?view=li-lms-2026-07), [Share Statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/share-statistics?view=li-lms-2026-07), and [Follower Count](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-lookup-api?view=li-lms-2026-07).

Callback URL:

```text
https://YOUR-SYNC-SERVICE/oauth/linkedin/callback
```

## Deployment

The root `render.yaml` describes a second service named `cno-native-sync`. The preferred no-command setup is to sign into Render, choose **New → Blueprint**, connect the CNO-owned GitHub repository, and approve the services detected from `render.yaml`. Render reads these settings automatically:

- Root directory: `sync-service`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`

Set the variables shown in `.env.example`. Never commit their values. `TOKEN_ENCRYPTION_KEY` may be a base64-encoded 32-byte key (preferred) or another high-entropy generated secret of at least 32 characters; this makes Render-generated secrets safe to use without silently breaking token encryption.

Use persistent PostgreSQL for production. Render's free Postgres expires after 30 days, so it is suitable only for a proof of concept. `DATABASE_URL` can point to any TLS-enabled Postgres provider.

## Automatic refresh

`.github/workflows/native-sync.yml` calls the protected cron endpoint every day. Add these GitHub repository secrets:

- `CNO_SYNC_SERVICE_URL` — currently `https://sync.cnocreative.co`; do not use the retired non-suffixed Render address
- `CNO_SYNC_CRON_SECRET` — exactly the same random value as the service's `SYNC_CRON_SECRET`

The job stores the latest 90 days for every connected client. A provider failure returns a non-success status so the scheduler cannot silently report a successful run. In the internal console, click **Open latest in CNO Reports** to create a one-use import link. The report consumes the link, loads the normalized rows, and invalidates it.

## Local development (developer-only, not part of CNO staff setup)

```bash
cd sync-service
npm install
cp .env.example .env
npm start
```

`DATABASE_URL` is optional. Without it the service keeps everything in a local JSON file under
`.data/` (override with `SYNC_DATA_DIR`), which is enough to run the whole browser connection flow
end to end without provisioning a database first. The console shows a standing warning while it is
in that mode, and `/health` reports `"durable": false`. Set `DATABASE_URL` before connecting any
real client account.

Missing configuration explains itself rather than crash-looping: `/health` returns
`setup_complete`, the console lists exactly which secrets are missing, and a provider with no
credentials shows as "waiting" instead of offering a button that fails mid sign-in.

OAuth providers generally require HTTPS callback URLs outside localhost, so a temporary secure
development tunnel is usually needed to complete a real provider sign-in locally.

## Endpoints

| Route | Who calls it | Purpose |
|---|---|---|
| `GET /health` | Render, monitoring | Liveness, storage kind, whether setup is complete |
| `GET /v1/session` | Report app | Signed-in state and which providers are configured |
| `GET /v1/connections` | Report app (staff session) | Every connection with its state and assigned account |
| `POST /v1/sync` | Report app (staff session) | Refresh one client from its connected platforms |
| `GET /v1/rows` | Report app (staff session) | Latest normalized rows for one client |
| `POST /v1/reports`, `GET /v1/reports/:id` | Report app / client | Short client report links |
| `GET /v1/import/:token` | Report app | Single-use cross-device data handoff |
| `POST /v1/cron/sync` | GitHub Actions | Scheduled refresh, guarded by `SYNC_CRON_SECRET` |
| `/admin/*` | CNO staff browser | Sign-in, provider connection, account assignment, link management |

`REPORT_ORIGIN` accepts a comma-separated list, so the Render site, a custom CNO domain, and a
developer's localhost can all reach the service. Only listed origins receive CORS approval.

Every state-changing `/admin` form carries a token derived from the session secret, and cross-site
form posts are rejected. This matters because the session cookie is `SameSite=None` so the report
app can use it; without the token check that cookie would make the admin forms forgeable.

## Remaining production work

- Complete each provider's app-review process and test with CNO-owned accounts
- Validate every discovered-profile and ad-account assignment against a deliberately multi-account test authorization before using real client data
- Confirm metric availability by account type and API version
- Complete the provider approvals that determine whether refresh tokens and analytics scopes are issued
- Add Meta/Facebook Page organic metrics and richer LinkedIn per-post/sponsored analytics
- Add monitoring for revoked permissions, expired tokens, and API-version deprecations
- Move the encryption key to a managed KMS before handling a large client portfolio
