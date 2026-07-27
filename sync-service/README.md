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
- Organic Instagram account/content pulls, optional Meta Ads pulls, TikTok profile/video pulls, and LinkedIn Page statistics foundation
- Normalization into the same account/post row structure used by CNO Reports
- Stored sync snapshots and a protected daily sync endpoint
- Ten-minute, single-use import links that transfer normalized rows into CNO Reports without transferring credentials
- No provider tokens in logs, URLs returned to the report, client share links, or browser storage

Provider APIs change frequently and require app review. Each adapter deliberately returns partial useful data when an optional metric or permission is unavailable instead of failing the entire client sync.

## Security boundary

Clients authorize on Meta, TikTok, or LinkedIn itself. CNO never asks for or stores the client's platform password or 2FA code. The provider sends an authorization code to this service, the service exchanges it server-to-server, and only encrypted tokens are persisted. When a supported access token nears expiration, the service rotates it before syncing. Revoked access, provider policy changes, and Meta authorizations that can no longer be extended still require reconnection.

CNO staff can see:

- the client label;
- provider and connected account names;
- last-sync status; and
- normalized analytics.

CNO staff cannot see OAuth tokens in the console. Render environment owners remain part of the infrastructure trust boundary because they can control the running service and its encryption key. Eliminating even that access requires a managed KMS/HSM with a narrowly scoped service identity; that is a later production-hardening step and is not honestly achievable with a completely free static site.

The current admin token is a pilot control, not a complete employee account system. After metric and provider validation, replace it with individual managed staff identities, server-issued HTTP-only sessions, `owner` / `analyst` / `viewer` roles, and an audit log. Keep client identities in a separate tenant-scoped portal. See [`../CLOUD_AUTOMATION_BLUEPRINT.md`](../CLOUD_AUTOMATION_BLUEPRINT.md).

## Platform prerequisites

### Meta / Instagram

Create a Meta developer app and request only the read permissions required for reporting. Instagram insights require a professional account and appropriate insights permissions. Paid/dark-ad reporting also needs `ads_read`. Meta's current requirements are summarized in its [official Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-26e7999c-fc7e-44c8-8f71-ab2de8d35c32).

Callback URL:

```text
https://YOUR-SYNC-SERVICE/oauth/meta/callback
```

### TikTok

Create and submit a TikTok developer app, configure Login Kit, and request the analytics/video scopes CNO needs. TikTok requires direct user consent and recommends keeping tokens server-side. See [TikTok OAuth token management](https://developers.tiktok.com/doc/login-kit-manage-user-access-tokens).

Callback URL:

```text
https://YOUR-SYNC-SERVICE/oauth/tiktok/callback
```

### LinkedIn

Create a LinkedIn developer app and request Community Management/Marketing access. Organization analytics requires an authenticated member with the necessary administrator role. See [LinkedIn OAuth](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication) and [Organization Page Statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/page-statistics?view=li-lms-2026-01).

Callback URL:

```text
https://YOUR-SYNC-SERVICE/oauth/linkedin/callback
```

## Deployment

The root `render.yaml` now describes a second service named `cno-native-sync`. Resync the Render Blueprint or create a Node web service with:

- Root directory: `sync-service`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`

Set the variables shown in `.env.example`. Never commit their values.

Use persistent PostgreSQL for production. Render's free Postgres expires after 30 days, so it is suitable only for a proof of concept. `DATABASE_URL` can point to any TLS-enabled Postgres provider.

## Automatic refresh

`.github/workflows/native-sync.yml` calls the protected cron endpoint every day. Add these GitHub repository secrets:

- `CNO_SYNC_SERVICE_URL` — e.g. `https://cno-native-sync.onrender.com`
- `CNO_SYNC_CRON_SECRET` — exactly the same random value as the service's `SYNC_CRON_SECRET`

The job stores the latest 90 days for every connected client. In the internal console, click **Open latest in CNO Reports** to create a one-use import link. The report consumes the link, loads the normalized rows, and invalidates it.

## Local development

```bash
cd sync-service
npm install
cp .env.example .env
npm start
```

Use a local Postgres database and provider test apps. OAuth providers generally require HTTPS callback URLs outside localhost, so a temporary secure development tunnel may be necessary.

## Remaining production work

- Complete each provider's app-review process and test with CNO-owned accounts
- Confirm metric availability by account type and API version
- Complete the provider approvals that determine whether refresh tokens and analytics scopes are issued
- Add Meta/Facebook Page organic metrics and richer LinkedIn post/follower analytics
- Add monitoring for revoked permissions, expired tokens, and API-version deprecations
- Move the encryption key to a managed KMS before handling a large client portfolio
