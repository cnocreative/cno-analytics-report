# CNO Reports v1.8.0 release audit

Audit date: July 31, 2026

Scope: multi-format data ingestion, and completing the native browser connection flow so the report
app drives it directly instead of pointing at a console.

Status: **the report app and importer are verified in a browser. The connection service is verified
by parse, link, and logic tests only — see "Honest limits of this audit" below.** Provider app
review, deployment, and a persistent database remain CNO-owner tasks; nothing in this release
changes that.

## Multi-format ingestion

Previously the importer accepted `.csv` only and read every file as UTF-8. Meta and Instagram
export UTF-16, so those files imported as unreadable characters; LinkedIn exports `.xlsx` and could
not be imported at all.

| Change | Verification |
|---|---|
| Per-file text encoding detection | `instagram_native_utf16_test.csv` (UTF-16LE with a byte-order mark) imported 10 daily rows with correct headings. UTF-8, UTF-16 both byte orders, and Windows-1252 are handled; UTF-16 without a mark is detected from interleaved zero bytes |
| Delimiter detection | `semicolon_delimited_test.csv` imported with 11 of 11 headings mapped. Comma, semicolon, tab, and pipe are scored per file; quoted fields are respected so a separator inside a value cannot mislead it |
| Excel `sep=` hint line | Consumed rather than parsed as a data row |
| Title rows above the headings | The first ten rows are scored for known column names, filled cells, and numeric content. `instagram_native_utf16_test.csv` (three-row title block) and `linkedin_workbook_test.xlsx` (two-row title block) both start at the real heading row |
| `.xlsx` workbooks | `linkedin_workbook_test.xlsx` produced three separately audited sources — Content (6 posts), Followers (10 daily rows), Visitors (10 daily rows). Shared strings, inline strings, booleans, and style-driven date cells are all read; Excel date serials became real dates |
| `.zip` archives | `tiktok_export_test.zip` yielded its CSV and its JSON member; `readme.txt` was reported as unreadable rather than silently dropped. Central directory parsing with Zip64 support for large platform downloads |
| `.json` exports | `instagram_media_test.json` located the nested `media` record list and flattened it, 11 of 11 headings mapped |
| Excel XML and HTML "spreadsheets" | Parsed through the same table pipeline |
| Legacy `.xls` | Read directly (OLE2 container + BIFF8 records), verified field-for-field against an independent Python reference implementation on a real LinkedIn visitor export: 5 sheets, 90 daily rows |
| No new dependency | ZIP inflation uses the browser's own `DecompressionStream`; sheet XML uses `DOMParser`. The report remains one self-contained offline file with no CDN |
| Existing fixtures unchanged | `native_platform_comprehensive_test.csv` still yields 12 posts / 42 account rows with 61 of 62 headings mapped, identical to v1.7.0 |

### Client and platform resolution

Native exports frequently name neither, and the previous code defaulted a missing platform to
Instagram — silently filing TikTok or LinkedIn rows under Instagram.

| Change | Verification |
|---|---|
| Resolution order | File columns, then file/folder names, then staff-set import defaults, then `Unknown` / `Unspecified` |
| Folder name becomes the client | `Example Brand/june/LinkedIn_content.xlsx` resolved to client `Example Brand`, platform `linkedin`. Date and generic folders (`2026-06`, `exports`, `analytics`) are skipped |
| No silent platform default | A file naming no platform now lands on `Unspecified` and raises a **Data audit** warning, instead of being merged into Instagram's numbers |
| Import defaults UI | Client and platform defaults in the Import data panel, saved per device |

### Alias coverage

Added the exact wording native exports use, kept separate from the general alias map so each
platform's contribution stays traceable: `Post publish date`, `Click through rate (CTR)`,
`Custom button clicks`, `Total page views`, `Organic followers`, `Sponsored followers`,
`Video views`, `Watch time (hours)`, `Content interactions`, `Accounts reached`, and others across
Instagram/Meta, TikTok, LinkedIn, Facebook, YouTube, Pinterest, Threads, and X. Watch time now
converts from hours as well as minutes and seconds. Account rows fall back from `followers_growth`
to `follows`, and from `link_clicks` to `clicks`, which is how LinkedIn and Meta label them.

### Client and platform resolution when the export names neither (v1.8.1)

A real CNO import surfaced three faults that made LinkedIn silently vanish from the report:

| Fault | Fix | Verification |
|---|---|---|
| Client inferred only from folders | The file's own name is used too, and the reconciler adopts the spelling used by a client named outright in the same import | `cno-creative-co_visitors_1785742483724.xls` files itself under `CNO Creative Co` instead of `Unknown` |
| A re-imported master CSV carries `client` as the literal string `Unknown` | `Unknown` / `Unspecified` are treated as this app's placeholders, not declared values, so inference can still run | The user's real 307-row master CSV resolves to one client instead of two |
| A later empty canonical column overwrote a populated alias | First non-empty wins, so a blank `profile_views` column cannot wipe the `Total page views (total)` value that mapped ahead of it | All 90 LinkedIn rows now carry page views; totals sum to 9, matching the source exactly |

Each row now keeps the `source_file` it came from, so a combined master CSV re-imports with its
original per-row provenance rather than collapsing to the name of the merged file.

Platform detection gained a content fallback for exports that name no platform anywhere: headings
only one platform emits (`Jobs page views`, `Seniority`, `Full video watched rate`,
`Watch time (hours)`) identify the source. Checked only after the file and folder names, and it
never overrides a platform the file declares.

## Multi-platform AI letters (v1.8.2)

The AI letter and client sharing previously required exactly one platform. They now accept several,
without loosening the rule that unlike platform definitions must never be blended.

| Change | Verification |
|---|---|
| Per-platform context | With three platforms selected the context contains one metric block per platform and **no** top-level `metrics` object and **no** `engagement_rate_pct` at all, so there is no blended figure available to quote. Instagram 5.9%, LinkedIn 9.4%, TikTok 12.5% were carried separately and never averaged |
| Single-platform shape unchanged | For each platform on its own, the context still has the flat `metrics` object, no per-platform blocks, and the original 180-280 word range. Verified for all three platforms |
| Combined totals restricted | `combined_business_outcomes` carries only counts that mean the same thing on every platform (spend, leads, bookings, membership signups, retail sales, revenue, conversions, event registrations and attendees, paid leads/conversions/revenue). Reach, impressions, views, engagement, follower and rate fields are excluded by construction |
| Prompt rules | The model must name the platform beside every figure, must not add, average, rank or compare rates across platforms, and must not claim one platform outperformed another. It may only speak of each against its own history |
| Letter scales with scope | Word range and number allowance scale with platform count (three platforms gives 340-460 words and six numbers) so the letter has room without becoming a list |
| Evidence validation | Findings citing `Instagram.reach`, `TikTok.er`, `LinkedIn.profile_views` validate with zero invalid references. Per-platform target keys and `combined.*` keys are accepted too |
| Letter now renders | The multi-platform page previously replaced the letter with a comparison notice. It renders the letter when an analysis exists, with a scope banner naming every platform covered, and falls back to the comparison notice when none exists |
| Paid kept per platform | Paid figures moved inside each platform block rather than being dropped, so the paid takeaway still works with several platforms |
| Guards that stay | Benchmarks still refuse to compare across platforms (different denominators), and target editing remains single-platform so one platform's goal cannot be reused for another |
| Sharing | A bundle with three platforms selected carries all three, excludes the unselected platform, and excludes a second client entirely |

The per-platform blocks are built by running the metric engine once per platform, so the letter is
grounded in exactly the same numbers the per-platform report cards display.

## Native browser connection

| Change | Verification |
|---|---|
| Service address is a real setting | Was a hidden input with no way to change it. Now visible, validated, saved per device, with a **Check** button |
| Honest reachability reporting | Against a service contract mock: unreachable, reachable-but-signed-out, and signed-in each produce a different and accurate message |
| Live connection list | Signed in, the panel listed Meta (ready, `@examplebrand`), TikTok (choose account), LinkedIn (not set up) for the selected client. A second client's connection was present in the response and correctly **not** shown |
| Setup state surfaced | "No database yet, connections are lost if it restarts" and "waiting on the CNO LinkedIn app credentials" both appeared without being asked for |
| Refresh into the open report | **Refresh and load into this report** ran the sync and loaded 17 rows directly, no console round trip. Existing demo data was preserved, not wiped |
| Re-pull replaces, never duplicates | Pulling twice left counts identical (16 posts / 18 account rows both times) |
| Partial failure is reported, not swallowed | A 502 with one platform succeeding and one failing loaded the successful platform's rows and displayed TikTok's exact reason |
| Popup completion detected | The cross-origin popup cannot message the report, so the panel polls while it is open and stops on close, timeout, or panel close |
| Background poll does not clobber results | A quiet refresh after a successful load left the "Loaded 17 rows" message intact |
| Client isolation in the UI | The panel filters connections to the selected client only |

### Service changes

| Change | Why |
|---|---|
| Storage abstracted into `src/store.js` | Postgres for production, a local JSON file when `DATABASE_URL` is absent. The service previously refused to start without a database, so the connection flow could not be run or tested at all before provisioning one. The non-durable mode says so in the console, at boot, and in `/health` |
| `src/db.js` removed | Superseded by the store; no SQL remains outside it |
| CSRF protection on every admin form | The session cookie is `SameSite=None` so the report app can use it, which made the urlencoded admin forms forgeable from any site. Each form now carries a token derived from the session secret, plus a same-site check |
| Login throttling | Ten attempts per IP, then a fifteen-minute lockout |
| Setup validation | Missing `CNO_ADMIN_TOKEN`, an unusable `TOKEN_ENCRYPTION_KEY`, or absent provider credentials are listed in the console and at boot instead of failing part way through a client's sign-in |
| Unconfigured providers hidden | A provider with no credentials shows as "waiting" rather than offering a button that 500s |
| Disconnect | Staff can remove a connection, behind a confirmation page. An inline `confirm()` would have been silently blocked by the service's own content security policy |
| `Cross-Origin-Resource-Policy` on `/v1/*` | Helmet's `same-origin` default would have blocked the report window from reading these responses even with CORS approval |
| `REPORT_ORIGIN` accepts a list | Render, a custom CNO domain, and localhost can coexist |
| Postgres multi-statement fix | Passing an empty values array switches node-postgres to the extended protocol, which rejects the multi-statement schema. Params are now only sent when present |
| LinkedIn pagination fix | LinkedIn returns a relative Rest.li `next` link, which the old code could not follow. Now resolved against the API origin, with a loop guard |
| One sync snapshot per connection | Only the latest was ever read; keeping every run grew the table without bound |

## Verification performed

- Nine logical sources across six file formats imported in one pass: 28 post rows, 81 account rows, one client, four platforms, zero unreadable files.
- No console errors, and no `NaN`, `undefined`, or `Infinity` in rendered output — checked per platform for all five platforms.
- Engagement rate confirmed as `(likes + comments + shares + saves) / reach`, not the engagement total.
- Multi-platform selection renders separate platform figures and does not print a blended headline rate.
- Client bundle scoping re-verified after the ingest changes: with two clients and two platforms loaded, a bundle contained one client and one platform, with no other client's name or platform present.
- Share payload gzip round-trip, password encryption, and wrong-password rejection all pass.
- Combined master CSV exports and re-parses to the same row count.
- Twenty storage-layer tests pass, including single-use OAuth state, single-use import tokens, reconnect reusing one connection row, assignment changes clearing stale rows, and cross-client isolation.
- All four service modules parse and link.
- `git diff --check` clean; all JSON manifests valid.
- Privacy scan clean. It caught a real client name used as an example folder path in documentation and in a code comment during this work; all three were replaced with `Example Brand`.

## Honest limits of this audit

- **Node.js is not installed on the machine this audit was run on.** The service was verified by
  parsing and linking every module in a JavaScript engine, by driving its storage layer through a
  20-assertion behavioural test with the Node built-ins stubbed, and by exercising the report app
  against a mock that implements the same HTTP contract. It was **not** started as a process, and no
  request has traversed real Express, Helmet, or node-postgres. Run `npm run check` and `npm start`
  once on a machine with Node before deploying.
- **No provider OAuth flow has been executed against a real Meta, TikTok, or LinkedIn app**, because
  no CNO-owned app exists yet. The adapters remain unproven against live API responses.
- The local-file storage mode is a setup and testing convenience. It is not durable on a container
  filesystem and must not hold live client connections.
- The `.xlsx` and `.xls` readers cover the parts these platforms actually emit. Neither implements
  formula evaluation, pivot caches, or charts; both read cached values rather than recomputing.
