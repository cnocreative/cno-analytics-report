# Metrics Dictionary
### Every metric we track, how it's calculated, and why it matters

This is the single reference for what each number means. Consistent definitions = trustworthy trends. When in doubt, this file wins.

---

## Cross-platform core KPIs

| Metric | Formula / definition | Why it matters | "Vanity" risk |
|--------|----------------------|----------------|---------------|
| **Reach** | # of unique accounts that saw content inside the platform's stated measurement window | Real audience size touched in that window; not additive across daily/monthly windows | Low |
| **Impressions** | Total times content was shown (can repeat) | Exposure volume; pair with reach | Medium |
| **Engagement Rate (ER)** | See formulas below | The #1 health metric — resonance, not just size | Low |
| **Total Engagements** | Likes + Comments + Shares + Saves | Raw interaction volume | Medium |
| **Follower Growth** | End followers − Start followers | Net audience added | Medium |
| **Follower Growth Rate** | (End − Start) ÷ Start × 100 | Growth *pace*, comparable across account sizes | Low |
| **Profile Visits** | # of profile views | Intent signal — people checking you out | Low |
| **Website / Link Clicks** | Clicks on bio/link/CTA | Closest free proxy to conversion intent | Low |
| **Reach Rate** | Reach ÷ ending followers × 100 | Shows how far content traveled relative to current audience size | Low |
| **Posting Cadence** | # posts published in the month | Context for reach/engagement moves | — |
| **Saves** | # times content saved | High-intent signal; algorithm-weighted | Low |
| **Shares** | # times content shared | Strongest reach-amplifier signal | Low |

---

## Engagement Rate — the three formulas (and when to use each)

Engagement rate is the headline metric, but it has multiple valid formulas. **We standardize on ER by Reach as the primary**, because it reflects how the content resonated with the people who actually saw it (followers *and* non-followers), and it's the most stable for month-to-month trend comparison.

1. **ER by Reach (PRIMARY)**
   `(Total Engagements ÷ Reach) × 100`
   → Best for organic trend tracking. Use this as the client-facing headline.

2. **ER by Followers**
   `(Total Engagements ÷ Followers) × 100`
   → Used by benchmark publishers such as Rival IQ for some public competitive datasets.

3. **ER by Impressions**
   `(Total Engagements ÷ Impressions) × 100`
   → Best for paid/boosted analysis and for benchmark sources that explicitly use impressions.

4. **ER by Views**
   `(Total Engagements ÷ Views) × 100`
   → Used when a platform or benchmark source has replaced impressions with views. Instagram’s definitions changed in 2025, so the report keeps views and impressions separate.

> ⚠️ **Consistency rule:** always compare like-for-like. Client's ER-by-followers vs. an industry benchmark that's *also* by-followers. Never mix formulas within one comparison.

**Reels / short-video ER:** `(Likes + Comments + Saves + Shares) ÷ Video Views × 100`

---

## Platform-specific metrics

### Instagram
- Accounts reached, Accounts engaged
- Reel plays / views, Reel avg. watch time
- Story views, exit rate = exits ÷ Story views, and completion rate = completed views ÷ Story views. If completed views are absent, completion = 1 − exit rate.
- Saves and Shares (track separately — high intent)
- Profile visits, external link taps
- Follower net growth + growth rate

### TikTok
- Video views, Total play time, Avg. watch time
- **Completion rate** (finished ÷ started) — TikTok's key ranking signal
- Shares, Comments, Saves (Favorites)
- Follower growth, Profile views
- Traffic source (FYP % vs. following vs. sound/hashtag)

### LinkedIn
- Impressions, Unique impressions
- Engagement rate (LinkedIn shows this natively)
- Reactions, Comments, Reposts, Clicks
- Follower growth + follower demographics (industry, seniority, company size)
- Post click-through rate

### YouTube (only if a client activates it)
- Views, Watch time (hours), Avg. view duration/%
- Subscribers gained/lost
- Impressions + Impressions click-through rate
- Traffic sources

---

## Derived & strategic metrics

| Metric | Formula | Use |
|--------|---------|-----|
| **MoM change** | (This month − Last month) ÷ Last month × 100 | Every KPI card |
| **3-month trend** | Direction/slope over last 3 months | "Are we trending up or down?" |
| **Benchmark index** | Client value ÷ Industry norm | >1.0 = beating industry; <1.0 = below |
| **Share of engagement** | Engagements from a platform ÷ total across platforms | Where the audience actually lives |
| **Cost-free ROI proxy** | Link clicks / leads / DMs tied to social | True ROI *only if client shares outcome data* |
| **Profile-to-click rate** | Website clicks ÷ profile visits | Whether profile interest turns into off-platform action |
| **Reach-to-lead rate** | Qualified leads ÷ reach | Directional top-of-funnel business efficiency |
| **Lead-to-booking rate** | New bookings ÷ qualified leads | Sales/booking conversion quality |
| **Event attendance rate** | Attendees ÷ registrations | Whether event interest became attendance |
| **Paid CTR** | Paid clicks ÷ paid impressions | Whether paid distribution produced click action |
| **Paid CPM** | Paid spend ÷ paid impressions × 1,000 | Cost to buy 1,000 paid impressions |
| **Paid CPC** | Paid spend ÷ paid-attributed clicks | Cost to earn one paid click |
| **Paid frequency** | Paid impressions ÷ paid reach | Average number of paid exposures per reached account |
| **Cost per paid lead** | Paid spend ÷ paid-attributed leads | Paid lead-generation efficiency |
| **Cost per paid follow** | Paid spend ÷ paid-attributed follows | Paid audience-acquisition efficiency |
| **Cost per paid conversion** | Paid spend ÷ paid-attributed conversions | Paid outcome efficiency |
| **ROAS** | Paid-attributed revenue ÷ paid spend | Paid-media return when attribution data is available |

## Client-goal and business metrics

These are not always available from a social platform. They can be added to the same upload from a CRM, scheduling system, event platform, ecommerce report, or carefully maintained attribution sheet.

| Goal | Metrics |
|------|---------|
| **Build brand authority** | Reach, impressions/views, follower growth rate, profile visits, saves |
| **Grow the right audience** | Website clicks, meaningful comments, comment replies, DMs, qualified leads |
| **Position for what’s next** | Event announcement reach, event-content engagement, registrations, attendees, post-event leads/bookings |
| **Drive business growth** | New bookings, membership sign-ups, retail orders, attributed revenue, conversions |

“Meaningful comments” is a human-tagged count of substantive questions, stories, referrals, or purchase-intent conversations. It should not be inferred automatically from comment volume.

---

## What we deliberately DON'T over-emphasize

Per research on client value, we **demote pure vanity metrics** (raw follower count in isolation, raw impression counts) to supporting context and **promote outcome/quality metrics** (engagement rate, saves, shares, profile→click, follower *growth rate*). Every metric on a KPI card must be paired with a comparison (vs. last month / goal / benchmark) — a naked number never ships.

---

## Data notes & gotchas
- **Rella vs. native mismatch:** Rella aggregates connected accounts, but native tools (Meta/TikTok/LinkedIn) are the source of truth for demographics and some post-level detail. When numbers differ, note which source we used and stay consistent month to month.
- **Reels/video "views" definitions differ by platform** — never sum views across platforms as if equal.
- **Reporting window:** define the month consistently (calendar month, 1st–last day) for every client, every platform.
- **Followers timing:** capture follower count on the same day each month (e.g., 1st) for clean growth math.
- **Reach is non-additive:** summing daily or monthly unique reach can count the same person more than once. Use a platform total for the full reporting window when exact uniqueness matters.
- **Paid attribution is strict:** never calculate CPC, cost per follow/conversion, or ROAS using total website clicks, total follower growth, total conversions, or total revenue. Use paid-specific denominators only.
- **Reported paid rates are validation/fallback values:** when spend plus paid impressions/clicks/reach/leads/conversions/revenue are present, the report recalculates CPM, CPC, CTR, frequency, CPL, CPA, and ROAS. A platform-reported rate is used only when its raw denominator is absent.
- **Conversion tracking boundary:** cost per conversion and ROAS remain unavailable when the client has no conversion/purchase event or other paid attribution source. A blank is more accurate than an invented zero.
