# CNO Reports v1.6.0 release audit

Audit date: July 30, 2026
Status: **release candidate passed**. The current report, AI workflow, page system, section organizer, OAuth-refresh foundation, web/PWA package, Windows installer configuration, and Mac Apple Silicon installer configuration are complete. The managed accounts, private client archive, server-side AI, unattended monthly generation, approval, and email-delivery phase remains deliberately documented as future secured backend work.

## Requested experience

| Requirement | Status | Verification |
|---|---:|---|
| Concise `Dear [client]` letter | Passed | Required structured AI output, 180-word ceiling, simple good/bad/next-move prompt, editable letter, deterministic fallback |
| AI explanations throughout the report | Passed | Thirteen short section-note fields plus headline, findings, recommendation, and paid takeaway |
| Lower-cost default | Passed | `gpt-5-mini`, low reasoning, low verbosity, strict JSON schema, `store: false`, 2,000-token output ceiling |
| AI required before sharing or printing | Passed | Share, report Print/PDF, keyboard print, Electron menu print, and browser `beforeprint` gate |
| Remember API key on a trusted CNO device | Passed with pilot boundary | Local or session storage choice; key is excluded from client bundles. Production design moves it server-side |
| Four report pages | Passed | Summary, Performance, Content, Full data |
| Simple first page | Passed | Letter/story, at most four headline KPIs, paid-versus-organic summary, four goal measures, and next steps |
| Deeper analysis remains available | Passed | Full organic/paid metrics, goals, audience, trends, campaigns, pillars, timing, benchmarks, matrix, and source rows |
| Reorder, move, or hide sections | Passed | Per-client section order, page selector, visibility checkbox, and featured KPI controls |
| Separate platform reporting | Passed | One platform is required for AI and sharing; multi-platform staff comparison never adds unlike platform metrics |
| Platform checkboxes | Passed | Instagram, TikTok, LinkedIn, YouTube, Facebook/Meta, Pinterest, Threads, and recognized custom platforms |
| Multiple CSVs and folders | Passed | One import center supports one file, many files, a whole folder, and drag/drop |
| Campaign and content-pillar comparisons | Passed | Tags retained; median ER, median engagement/reach, shares, follows, post count, and small-sample language |
| Expanded audience | Passed | Age, gender, countries, cities, follower/profile intent, DMs, meaningful comments, and platform-specific display |
| Comparative funnel and content metrics | Passed | Equal-length prior-period changes and daily/weekly/monthly interactive trends |
| Caption length units | Passed | Explicitly labeled as characters |
| Paid, boosting, and dark-ad support | Passed for imports | Spend, delivery, clicks, leads, follows, conversions, revenue, efficiency rates, and Ads Manager contextual mapping |
| Wax-seal letter opening | Passed | Centered seal, working flap/open/skip controls, crisp full-size letter, and client-link setting |
| CNO/client separation | Passed for pilot | Staff masthead and tools versus one-client, one-platform, locked client report; staff-only evidence metadata removed from bundles |
| Unique/password-protected links | Passed for snapshot links | PBKDF2-SHA-256 (150,000 rounds) plus AES-GCM; wrong-password rejection verified |
| Expandable staff panels | Passed | Clear `+`/`−`, active color, `Close …` labels, one open panel, auto-scroll, close controls, Escape |
| Downloadable app | Passed in configuration | Installable PWA/offline shell, Windows NSIS target, and Mac ARM64 DMG target |

## Formula verification

All values below were recalculated by the current `index.html` engine from fictional **Example Brand** fixtures.

### Organic

| Metric | Required rule | Fixture result |
|---|---|---:|
| Impressions | Raw platform count | Preserved |
| Reach | Raw platform count | Instagram 10,000 |
| Follower growth, net | End − start | +120 |
| Follower growth | Net ÷ start | 4.0% |
| Engagement rate | (likes + comments + shares + saves) ÷ reach | 15.0% |
| Likes/comments/shares/saves | Raw counts | Preserved separately |
| Profile visits | Raw count | Preserved |
| Link/website clicks | Raw count | Preserved |
| Reach rate | Reach ÷ ending followers | Calculated when both values exist |
| Top posts | Descending post ER by reach | Passed |
| Best content type | Average post ER grouped by format | Passed; median shown beside average |
| Best posting time | Average engagement grouped by weekday/hour | Passed |
| Instagram Story views | Raw count | Preserved |
| Story completion | Completed views ÷ Story views; otherwise 1 − exits ÷ views | 90.0% |
| TikTok watch time | Raw total | 600 minutes |
| TikTok completion | Completed views ÷ views | 35.0% |
| YouTube average view duration | Watch time ÷ views or native value | 6 seconds |
| YouTube subscriber growth | End − start | +60 |
| LinkedIn post CTR | Clicks ÷ impressions | 2.5% |

Engagement uses the four requested interaction components whenever all are present. If the export supplies an incomplete component set, the report uses the platform/Rella engagement total when available and raises a CNO audit warning rather than silently understating the rate.

### Paid

| Metric | Required rule | Raw-total fixture | Platform-reported priority fixture |
|---|---|---:|---:|
| CPM | Spend ÷ impressions × 1,000 | $25.00 | $30.00 |
| CPC | Spend ÷ paid clicks | $0.83 | $0.83 |
| CTR | Paid clicks ÷ paid impressions | 3.0% | 3.0% |
| Frequency | Paid impressions ÷ paid reach | 2.00× | 2.00× |
| Cost per lead | Spend ÷ paid leads | $16.67 | $16.67 |
| Cost per conversion | Spend ÷ paid conversions | $33.33 | $33.33 |
| ROAS | Paid revenue ÷ spend | 6.00× | 6.00× |

The client report displays a supplied platform rate. The CNO audit independently recalculates it from paid-only totals and warns when the difference exceeds 5%. The deliberate CPM mismatch fixture produced the expected warning. A generic Ads Manager fixture also passed: $50 spend, 5,000 impressions, 2,000 reach, 125 clicks, $10 CPM, $0.40 CPC, 2.5% CTR, 2.5× frequency, $10 CPL, $25 CPA, and 8× ROAS.

Cost per conversion and ROAS remain unavailable when conversion or revenue attribution is absent. Organic website clicks or total conversions are never silently substituted into paid denominators.

## Data and security checks

- JavaScript syntax passed for the report, Electron shell, OAuth providers, server, encryption, and database modules.
- JSON passed for the web manifest and both package manifests.
- All PWA shell assets exist; Apple and maskable icons are cached for offline installation.
- Imported HTML-like client names, captions, formats, campaigns, pillars, headers, and cells render as text, not executable markup.
- Client links contain only the selected client and selected platform.
- API keys are not part of `buildBundle`, customization, edits, or AI share payloads.
- CNO-only evidence keys, confidence labels, validation counts, and analyst cautions are removed from client bundles.
- Password encryption/decryption round-tripped; an incorrect password was rejected.
- Account totals remain authoritative for headline metrics; post detail drives creative analysis and reconciliation.
- Missing values remain unavailable, not zero.
- Potential overlapping account exports, daily unique-reach summation, incomplete interaction components, thin KPI coverage, missing tracking, and paid-rate discrepancies produce CNO-only warnings.
- No `NaN` or non-finite numeric result appeared across the Instagram, TikTok, LinkedIn, YouTube, paid, and comprehensive fixtures.

## Native connection foundation

The private service follows the intended simple flow:

1. CNO chooses the client.
2. The client signs in on Meta, TikTok, or LinkedIn itself.
3. The provider shows its consent screen.
4. CNO assigns the exact profile, and the exact Meta ad account when used.
5. Encrypted authorization remains server-side and supported tokens refresh automatically.
6. A ten-minute, one-use link moves normalized rows into CNO Reports.

Verified behavior:

- a single discovered account is assigned automatically;
- multiple accounts remain blocked until an exact assignment is saved;
- non-Meta providers accept exactly one assigned account;
- Meta accepts at most one Instagram account and one ad account;
- Facebook-only pages are not mistaken for Instagram profiles;
- TikTok and eligible LinkedIn refresh requests rotate returned refresh tokens;
- Meta initially exchanges for longer-lived access;
- manual and scheduled syncs return a failure status when any provider fails;
- token encryption accepts an exact base64 32-byte key or derives a 32-byte key from a high-entropy 32+ character secret, and rejects short secrets.

Provider permissions, app review, revocation, API changes, account eligibility, and refresh-token issuance can still require reconnection. Native Facebook organic detail, some TikTok watch/completion analytics, LinkedIn sponsored/per-post detail, and other provider-restricted fields continue to rely on native CSV exports until the relevant approved API product is available.

## Honest boundary before broad rollout

The static/desktop pilot is ready for controlled CNO testing, but the following are **not represented as complete**:

- individual employee accounts and role-based permissions;
- tenant-isolated client logins and a revocable report archive;
- server-side OpenAI requests and managed secret storage;
- unattended monthly AI generation, CNO approval, and email delivery;
- managed KMS/HSM protection for OAuth encryption keys;
- completed provider app approvals and two-period native-dashboard validation for every adapter.

Those steps are specified in [`CLOUD_AUTOMATION_BLUEPRINT.md`](CLOUD_AUTOMATION_BLUEPRINT.md). Browser key storage is a pilot convenience; OpenAI’s official guidance is to keep API keys out of client-side code and use a server-side secret boundary for production.

## Primary references

- [OpenAI GPT-5 mini model details and pricing](https://developers.openai.com/api/docs/models/gpt-5-mini)
- [OpenAI API key safety guidance](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)
- [TikTok user access-token management](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [LinkedIn programmatic refresh tokens](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens)
- [`FIRST_WAVE_FEEDBACK_CHECKLIST.md`](FIRST_WAVE_FEEDBACK_CHECKLIST.md)
- [`DATA_ACCURACY_AND_ACCESS.md`](DATA_ACCURACY_AND_ACCESS.md)
- [`sync-service/README.md`](sync-service/README.md)
