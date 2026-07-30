# Move CNO Reports to CNO-owned GitHub and Render accounts

This migration should preserve the existing repository history while moving control, billing, secrets, deployments, and future client data under CNO Creative Co.

## 1. Transfer the GitHub repository

Preferred option: transfer the existing repository so issues, tags, releases, Actions history, and installer downloads stay together.

1. Create or confirm the CNO-owned GitHub organization or account.
2. In the current repository, open **Settings → General → Danger Zone → Transfer ownership**.
3. Enter the CNO GitHub owner and confirm the repository name.
4. Give CNO staff individual access. Do not share one personal login.
5. Confirm that Actions are enabled and that the `Build desktop installers` workflow can write release assets.
6. Have the project maintainer update the saved repository destination after the transfer. CNO staff do not need to run a command.
7. In `index.html`, change the three `cno-*` meta values near the top:

   - `cno-report-base`
   - `cno-sync-base`
   - `cno-repository`

## 2. Create the CNO Render environment

This entire setup is completed in the Render and provider websites. CNO staff do not install developer tools or run terminal commands.

1. Sign into the CNO-owned Render team.
2. Connect the transferred GitHub repository.
3. Create a new Blueprint from the repository's `render.yaml`.
4. The Blueprint creates:

   - the static CNO Reports website;
   - the private Node native-sync/share-link service.

5. Create a persistent PostgreSQL database and set its internal connection string as `DATABASE_URL`.
6. Set the provider credentials from `sync-service/.env.example`.
7. Open the service's `/health` address in the browser and confirm it returns `{"ok":true}` before staff use **Connect selected client**.

Do not copy old Render environment secrets into GitHub. Enter them directly in the new Render team's environment settings.

## 3. Recommended CNO domains

Use CNO-controlled subdomains so a future infrastructure move does not break client bookmarks:

- `reports.cnocreative.co` → static reporting website
- `sync.cnocreative.co` → private OAuth, refresh, and report-share service

Then set:

- `cno-report-base` to `https://reports.cnocreative.co/`
- `cno-sync-base` to `https://sync.cnocreative.co`
- Render `REPORT_ORIGIN` to `https://reports.cnocreative.co`
- Render `PUBLIC_BASE_URL` to `https://sync.cnocreative.co`

Provider callback URLs must use the new sync domain:

- `https://sync.cnocreative.co/oauth/meta/callback`
- `https://sync.cnocreative.co/oauth/tiktok/callback`
- `https://sync.cnocreative.co/oauth/linkedin/callback`

Enter those callback addresses in the Meta, TikTok, and LinkedIn developer websites. After provider approval, the normal staff workflow is entirely inside the browser: select the client in CNO Reports, click **Connect selected client**, choose a platform, complete the platform's own sign-in/consent screen, and confirm the exact account. Refresh authorization is retained until the provider revokes it, it expires without refresh access, or permissions change.

## 4. Recreate scheduled refresh secrets

In the transferred GitHub repository, create:

- `CNO_SYNC_SERVICE_URL`
- `CNO_SYNC_CRON_SECRET`

The cron secret must exactly match Render's `SYNC_CRON_SECRET`. Generate new secrets in the CNO accounts instead of reusing personal-account values.

## 5. Final handoff checks

- CNO employee can sign into the private connection center.
- `/health` reports service version `0.6.0` or newer.
- A test social account can authorize and return to the new callback domain.
- One short client report link opens on a second device.
- Password-protected links reject an incorrect password.
- Revoked links stop opening.
- Windows and Mac installers appear in the newest GitHub release.
- No API key, OAuth token, client CSV, or Render secret is present in GitHub.

The actual account transfer requires an authorized CNO GitHub owner and CNO Render team member. No password should be sent through this repository or placed in a CSV.
