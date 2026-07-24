# CSV input — how the report reads your data
### v2 · one upload, any platform

The generator takes **one upload that accepts multiple files at once**. You no longer need two separate inputs — drop in whatever exports you have and the tool figures out what each file is.

## What the tool detects automatically

Every file is classified row-by-row into one of two **grains**:

| Grain | What it is | Powers | Detected when a row has… |
|-------|-----------|--------|--------------------------|
| **Account-level** | One row per account per month **or day** | Profile insights, daily/weekly trends, paid metrics, audience, and business outcomes | a `followers`/`profile visits` column and a month/date with no populated post fields |
| **Post-level** | One row per individual post | Content insights — engagement, views, shares, format analysis, top content | a `post type` or `caption`, plus per-post metrics and a `date` |

You can upload **either, both, or many files** (e.g. one account export + one post export per platform). They merge into one dataset, and the client/period selectors let you slice it.

## Column names are normalized (multi-platform)

You do **not** need to rename columns. The tool maps common header names from Rella, Instagram/Meta, TikTok, LinkedIn, and YouTube to a shared vocabulary. Examples it understands:

- **reach** ← `reach`, `accounts reached`, `unique reach`
- **impressions** ← `impressions`, `impression count` (times displayed)
- **views** ← `views`, `plays`, `video views` (content/video consumption; never silently merged with impressions)
- **engagement** ← `engagement`, `interactions`, `total engagement`
- **followers** ← `followers`, `subscribers`, `audience`, `fans`
- **follower growth** ← `net followers`, `new followers`, `followers gained`
- **starting / ending followers** ← `followers_start`, `start followers`, `followers_end`, `end followers`
- **profile visits** ← `profile visits`, `profile views`
- **link clicks** ← `link clicks`, `website clicks`, `link taps`, `profile links taps`
- **shares / saves / comments / likes / replies / reposts** ← their obvious variants
- **date** ← `date`, `published`, `timestamp`, `post time`
- **post type** ← `post type`, `media type`, `format`
- plus `client`, `platform`, `caption`, `hashtags`, demographics (`gender`, `top countries`, `top cities`), etc.
- **retention / timing** ← `published_hour`, Story views/exits/completions, video completions, total watch time, average view duration

The goal scorecard also recognizes `meaningful comments`, `comment replies`, `DMs`, `leads`, `bookings`, `membership signups`, `retail sales`, `revenue`, `event reach`, `event engagement`, `event registrations`, `event attendees`, and `conversions`.

Paid reporting recognizes `spend`, `paid_reach`, `paid_impressions`, `paid_clicks`, `paid_leads`, `paid_follows`, `paid_conversions`, `paid_revenue`, `organic_reach`, and `organic_impressions`. Optional platform-reported validation/fallback fields are `paid_cpm_reported`, `paid_cpc_reported`, `paid_ctr_reported`, `paid_frequency_reported`, `cost_per_paid_lead_reported`, `cost_per_paid_conversion_reported`, and `roas_reported`. Paid-efficiency formulas require paid-specific columns; generic `clicks`, total follower growth, total conversions, and total revenue are never assumed to be caused by ads.

For lineage and grain control, add `data_source` (for example `rella`, `meta_native`, or `meta_ads_export`), `aggregation` (`daily`, `monthly`, `period`, `snapshot`, `post`, or `ad_daily`), and optional `period_start` / `period_end`. An exact period-total row takes priority over daily rows for the matching date window.

Use an optional `record_type` column (`account_daily`, `account_monthly`, or `post`) when account and post rows live in the same CSV. This removes any ambiguity.

Unrecognized columns are ignored, not fatal. Missing metrics just hide their card — nothing breaks.

## Non-additive metrics

Reach is a unique-account count within the platform's measurement window. Daily reach and separate monthly reach totals must not be treated as exact unique reach for a longer period because the same person can appear in more than one row. The report labels those sums directional and the CNO-only Data audit flags them. Supply a period-total row with `period_start` and `period_end` whenever exact unique reach for a custom window matters.

## Minimum to get a report
- **Account-level file:** `client, platform, month` + at least one of `reach / followers / engagement`.
- **Post-level file:** `client, platform, date, post_type` + any per-post metrics.

## Optional: monthly goals (targets)
The **Client goals & success metrics** scorecard can show a progress bar for any metric once you give it a monthly target. Add a column named `<metric>_target` to the **account-level** file — e.g. `reach_target`, `profile_views_target`, `link_clicks_target`, `followers_growth_target`, `event_registrations_target`, `bookings_target`, `revenue_target`. Each row's target applies to that account/period; across a multi-month window, flow targets (reach, leads, revenue…) sum and rate targets average. Leave a cell blank for no target — the row simply shows the value and its change instead of a bar.

## A note on Rella's follower count
Rella returns the **current** follower total regardless of the date range, so follower *trends* are computed from monthly **growth**, not by differencing the total. The tool handles this for you.

## Templates
Blank schemas: `resources/template_accounts.csv` and `resources/template_content.csv`. Use `resources/native_platform_comprehensive_test.csv` to exercise a combined Instagram + TikTok + LinkedIn file with daily totals, post detail, campaign/pillar tags, paid data, audience fields, and business outcomes. Use `resources/native_platform_priority_metrics_test.csv` for a compact formula-validation set covering Instagram, TikTok, LinkedIn, and YouTube, including Story retention, watch time, posting hour, subscriber growth, LinkedIn CTR, and strict paid efficiency.

## Export
The **Export data** button downloads your loaded data back out as normalized `accounts_normalized.csv` and `content_normalized.csv`.
