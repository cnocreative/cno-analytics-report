# Getting data into CNO Reports

## The short answer

Use **Import data** in the report. It is now the only manual upload path: drop a whole reporting folder or select every CSV from Rella and the native platforms at once. The app:

1. detects account-level versus post-level rows;
2. maps common Instagram, Meta, TikTok, LinkedIn, YouTube, and Rella column names;
3. keeps each platform separate in the report;
4. removes only exact duplicate source rows;
5. shows a file-by-file audit with row counts and date coverage; and
6. can download one standardized **combined master CSV** that also retains the original source columns.

This is the best current workflow because it is private, free, works offline, and does not require CNO or a client to maintain API credentials.

## Recommended monthly workflow

Create one folder per client and reporting cycle:

```text
Client Name — 2026-06/
  rella-account.csv
  rella-content.csv
  instagram-account.csv
  instagram-content.csv
  tiktok-account.csv
  tiktok-content.csv
  linkedin-visitors.csv
  linkedin-followers.csv
  linkedin-content.csv
  meta-ads.csv
  business-outcomes.csv
```

Not every client needs every file. Add what exists, then choose **Import data → Choose folder**. Confirm the detected platform, row type, and coverage in the audit. Download the combined master CSV if you want one clean archive for the month. Then select the report period, make any editorial edits, and create a new private share link.

Uploading the same export twice is safe: exact duplicate rows are ignored. A complementary export with different columns or values is retained.

## Where each kind of data comes from

| Source | Best use | Typical exports |
|---|---|---|
| Rella | Fast consolidated organic reporting | account totals and content/post performance |
| Instagram / Meta Business Suite | First-party organic detail | account insights, content, audience, interactions |
| Meta Ads Manager | Boosted posts and dark/unpublished ads | campaign, ad set, ad, spend, reach, impressions, clicks, results |
| TikTok Analytics | Organic video and audience detail | overview, content, followers, watch time |
| TikTok Ads Manager | Paid TikTok performance | spend, reach, impressions, clicks, conversions |
| LinkedIn Page Analytics | Page, visitor, follower, and post detail | visitors, followers, content, competitors |
| LinkedIn Campaign Manager | Paid LinkedIn performance | spend, impressions, clicks, leads, conversions |
| Booking / CRM / sales system | Business impact | leads, bookings, memberships, retail sales, revenue |

The included synthetic file `resources/native_platform_comprehensive_test.csv` contains Instagram, TikTok, and LinkedIn account and post rows for testing without exposing client data.

## Why the browser cannot silently pull everything

Native platform data is protected account data. A direct connector is possible, but not as a key-free, static page:

- Instagram insights require a professional account, a Meta login flow, access tokens, and insights permissions. Meta's official requirements are documented in its [Instagram Insights guide](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-26e7999c-fc7e-44c8-8f71-ab2de8d35c32).
- TikTok uses OAuth, app registration/approval, scopes, access tokens, and refresh tokens; TikTok recommends keeping tokens server-side. See [TikTok OAuth token management](https://developers.tiktok.com/doc/login-kit-manage-user-access-tokens).
- LinkedIn organization analytics requires an authenticated administrator, the approved `rw_organization_admin` permission, and authorized API requests. See [LinkedIn Organizations](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations?view=li-lms-2026-07) and [Page Statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/page-statistics?view=li-lms-2026-07).

That means a true one-click live sync needs a small secure backend, OAuth consent screens, token storage, platform app approval, and ongoing maintenance as APIs change. Putting those credentials into this HTML file would expose them to every visitor and is not acceptable.

## Practical options

### 1. Import center — recommended now

Keep the report self-contained and use multi-file/folder import. This removes manual merging while avoiding authentication and maintenance. It is the only option that fully preserves the current “no required API key” promise.

### 2. Scheduled export folder — best next operational improvement

Where a platform or reporting tool can email or schedule exports, save them into the same client/month folder. CNO staff still review and import the folder, but collecting data becomes predictable and auditable.

### 3. CNO-only secure sync service — foundation now included

The repository now includes this separate internal connection service under `sync-service/`. Each client authorizes CNO once through OAuth; CNO then assigns the exact native profile (and optional matching Meta ad account) to that client before syncing can begin. The service encrypts tokens, refreshes authorization during manual or configured scheduled syncs, and writes normalized snapshots to a private database. A ten-minute, single-use import link moves the latest rows into CNO Reports without exposing platform credentials. Provider developer-app approval, a persistent Postgres database, scheduler secrets, and production testing are still required before live client use.

### 4. Automation vendors

Tools such as Make, Zapier, or a reporting warehouse may collect supported data on a schedule, but they introduce subscription cost, connector limitations, and another party handling client credentials. They can feed the same master CSV format when the time saved justifies the cost.

## Refresh ownership

For the current system, CNO owns the refresh:

1. export or collect the source files;
2. import the folder and check the audit;
3. add business outcomes or goal targets if the client tracks them;
4. review the selected date range and platform filters;
5. edit the narrative where CNO has context the data cannot know; and
6. create a fresh password-protected client link.

The client only opens the resulting link. They do not upload data, see another client, or need the app installed.
