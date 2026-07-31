# Getting data into CNO Reports

## The short answer

Use **Import data** in the report. It is the only manual upload path: drop a whole reporting folder, or select every export from Rella and the native platforms at once, in whatever format each platform produced. The app:

1. reads the file format and text encoding itself;
2. detects account-level versus post-level rows;
3. maps common Instagram, Meta, TikTok, LinkedIn, YouTube, Facebook, Pinterest, Threads, X, and Rella column names;
4. keeps each platform separate in the report;
5. removes only exact duplicate source rows;
6. shows a file-by-file audit with row counts and date coverage; and
7. can download one standardized **combined master CSV** that also retains the original source columns.

This is the best current workflow because it is private, free, works offline, and does not require CNO or a client to maintain API credentials.

## Formats the importer reads

Nothing has to be converted, re-saved, or cleaned up by hand first.

| Format | Notes |
|---|---|
| `.csv` | Comma, semicolon, tab, or pipe separated. Excel's `sep=,` hint line is handled. |
| `.tsv`, `.tab`, `.txt` | Treated as delimited text with the separator detected automatically. |
| `.xlsx`, `.xlsm`, `.xltx` | **Every visible sheet is imported as its own source file**, so a LinkedIn workbook with Content, Followers, and Visitors tabs produces three audited entries. Excel date cells are converted to real dates. |
| `.zip` | Platform download bundles. Every CSV, Excel, and JSON file inside is read; anything else is skipped and listed. |
| `.json` | Data exports and API dumps. The importer finds the list of records inside the file and flattens nested fields. |
| `.xml`, `.htm`, `.html` | Excel's "XML Spreadsheet 2003" format, and export pages that are really an HTML table. |
| `.xls` (Excel 97-2003) | **Not read.** The importer says so and asks for a `.xlsx` or `.csv` re-save rather than guessing at the binary format. |

Text encoding is detected per file. Meta and Instagram exports are UTF-16 rather than UTF-8; before this was handled they imported as unreadable characters. UTF-8, UTF-16 (either byte order, with or without a byte-order mark), and Windows-1252 are all read correctly.

Export files often put a title, an account name, and a blank line above the real column headings. The importer scores the first ten rows and starts at the real heading row instead of treating the title as column names.

## When a file does not name the client or platform

Native exports frequently contain neither. The importer resolves them in this order:

1. a `client` / `platform` column in the file;
2. the file and folder names — `Example Brand/june/linkedin-content.xlsx` gives both;
3. the **Client** and **Platform** defaults you set in the Import data panel; then
4. `Unknown` client and `Unspecified` platform.

Rows are never quietly filed under a platform the export did not name. Anything that lands on `Unspecified` raises a warning in **Data audit** so it is fixed before it reaches a client report.

## Recommended monthly workflow

Create one folder per client and reporting cycle:

```text
Client Name/
  2026-06/
    rella-account.csv
    rella-content.csv
    instagram-account.csv        (Meta exports these as UTF-16 CSV — fine as-is)
    instagram-content.csv
    tiktok-export.zip            (the whole download, unopened)
    linkedin-page-analytics.xlsx (all tabs, one file)
    meta-ads.csv
    business-outcomes.csv
```

Name the outer folder after the client. The importer reads it, so exports that do not carry a client column are still filed correctly.

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

These fictional fixtures in `resources/` exercise the importer without touching client data:

| File | What it covers |
|---|---|
| `native_platform_comprehensive_test.csv` | Instagram, TikTok, and LinkedIn account and post rows |
| `native_platform_priority_metrics_test.csv` | Story, video, YouTube, and click-attention metrics |
| `native_ads_manager_generic_test.csv` | Generic Ads Manager column names |
| `paid_rate_reconciliation_test.csv` | Platform-reported versus recalculated paid rates |
| `instagram_native_utf16_test.csv` | UTF-16 encoding, `sep=` line, and a three-row title block |
| `semicolon_delimited_test.csv` | Semicolon separator with a UTF-8 byte-order mark |
| `linkedin_workbook_test.xlsx` | Three-sheet workbook, title rows, Excel date cells |
| `tiktok_export_test.zip` | Archive holding a CSV and a JSON export together |
| `instagram_media_test.json` | Nested JSON export with a media record list |

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

### 3. CNO-only secure connection service — built, awaiting provider approval

The repository includes a separate internal connection service under `sync-service/`. Each client authorizes CNO once through OAuth; CNO then assigns the exact native profile (and optional matching Meta ad account) to that client before syncing can begin. The service encrypts tokens, refreshes authorization during manual or scheduled syncs, and stores normalized snapshots privately.

From the report's **Native sync** panel, staff set the service address once, then:

- **Connect selected client** opens the secure window for the platform sign-in;
- the panel lists every platform for that client with its live state (ready, choose account, reconnect, not connected); and
- **Refresh and load into this report** pulls the latest analytics straight into the open report, replacing the previous pull instead of duplicating it.

A ten-minute, single-use import link still exists for moving data to another device.

What remains before live client use is not code: CNO-owned Meta, TikTok, and LinkedIn developer apps with their review completed, a deployed service with a persistent database, and two full reporting periods reconciled against native analytics.

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
