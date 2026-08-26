---
name: month-close
description: Run CNO's monthly client reporting, end to end. Use when a month has ended and reports need building, when someone says "run the month close", "do this month's reports", "monthly reports", or names a client and a month. Covers where clients come from, refreshing connected platforms, importing what is still manual, checking the figures, writing and reviewing the letter, creating the client link, and drafting the email for a person to send.
---

# CNO month close

Run this with the person, not at them. They may not be technical. Explain each step in plain
language, do what you can, and stop where a human has to decide.

## The two surfaces, and which one does what

This trips people up constantly. There are two different web pages.

| Surface | Where | What it is for |
|---|---|---|
| **The report** | https://cno-analytics-report-5hi6.onrender.com | Importing files, building and reading the report, creating the client link |
| **The connection console** | https://sync.cnocreative.co/admin | Connecting platforms, assigning accounts, running a sync, pushing data into the report |

The console needs CNO's internal access token to sign in. If the person does not have it, they can
still do the whole manual path in the report; only the connected-platform refresh needs the console.

## Where clients come from

**There is no "create a client" button anywhere.** Do not go looking for one, and do not tell
someone to make one.

- In **the report**, the Client dropdown is built from the data currently loaded. No data means no
  options. That is normal on a fresh page, not a fault.
- In **the console**, a client exists because someone typed its name when connecting a platform.
  That typed name is the workspace key.

So on a freshly opened report the dropdown is empty and **"Refresh and load into this report" is
disabled**, because it needs a client selected and there is nothing to select. That is the expected
starting state.

**The way through:** in the console, go to **Refresh and open the report**, choose the client, and
press **Open latest in CNO Reports**. That pushes the stored rows into the report window and fills
the dropdown. After that the in-report refresh button works normally.

Importing a CSV also fills the dropdown, from the client column in the file.

## Client names are exact

`CNO Creative Co` and `cno.creative.co` are two separate workspaces holding different platforms.
When connecting, reuse the existing name character for character. The console now warns when a new
name reduces to an existing one, and each connection card has a highlighted **Move to another
client workspace** box to repair a split. Never merge two names without asking — near-identical
names can be real, different clients.

**Moving a connection does not update the report by itself.** The move happens on the server; the
report is a snapshot already sitting in someone's browser. After a move, the console shows a
"Moved" banner naming the exact next step: go to **Refresh and open the report** and press **Open
latest in CNO Reports** for that client, or press **Refresh and load into this report** inside an
already-open report. Skipping this is the single most common reason a move looks like it "didn't
work" — the platforms are combined server-side, the report just has not been told to look again.

## The one rule that outranks everything

**Nothing reaches a client without a person reading it first.** CNO's published privacy policy
promises clients that staff review every sentence. Draft the email, never send it.

Two more that matter as much:

- **One client per report.** If a figure could belong to another client, stop and say so.
- **Never invent a number.** Missing data means the report says less. It never estimates.

## Step 1 — check the service

```bash
curl -s https://sync.cnocreative.co/health
```

`"durable": true` must be present. If it is `false`, stop: links made now would die within hours
and read to the client as an expiry.

## Step 2 — pull everything the native connectors can reach

Native first, always. It is the source CNO controls, it refreshes itself, and for Meta it returns a
real daily series that Rella does not carry.

Sync it. Either use **Sync now** in the console for the client and date range, or run:

```bash
python automation/month_close.py
```

which needs `CNO_SYNC_SERVICE_URL` and `CNO_ADMIN_TOKEN` in the environment and prints counts only,
never client names, because it also runs in public build logs.

**What each native connector actually returns.** Do not expect more than this:

| Platform | Native gives | Verdict |
|---|---|---|
| Meta (Instagram) | Daily reach, profile visits, website clicks; period totals for views, interactions, likes, comments, shares, saves; full post detail | **Use native.** Richest source available. |
| TikTok | One snapshot row: follower count, total likes, video count. Plus basic post counters. No reach, no impressions, no profile visits, no daily series — the Display API does not have them | **Use Rella instead.** |
| LinkedIn | Nothing. No CNO app exists yet, so the console shows it waiting on credentials | **Use Rella.** |

## Step 3 — fill the gaps from Rella

Rella carries what the connectors cannot reach. Use it for **LinkedIn and TikTok**, and for any
platform where native returned nothing.

This needs the Rella connector enabled in this Cowork session. If the Rella tools are not available,
say so plainly and fall back to asking the person for a manual export — do not pretend to have data.

**Do this in order:**

1. `get_rella_social_space_context` to see the spaces, then `set_rella_social_space` with the id of
   the space matching **this client**. Confirm the space name out loud before pulling. A wrong space
   here puts one client's posts in another's report.
2. `get_rella_social_content_performance` with `from_date` and `to_date` covering the period,
   `sort_by: "date_desc"`, and `include_caption_snippets: false` — asking for snippets has caused
   the call to fail. Page with `cursor` until `pagination.hasMore` is false and keep every item.
3. Save the collected items to a JSON file **outside the repository**, then convert:

```bash
python automation/rella_to_csv.py <saved.json> "<Client name>" <output.csv>
```

4. Import that CSV in the report alongside the native data.

The converter keeps whole timestamps, because two posts on one day are two posts and truncating to
the date makes them collide into one. It also maps Rella's single `viewsOrImpressions` figure to
`views`, which is the column meaning the same thing on every platform now that Meta has retired
impressions for Instagram.

## Getting a real trend, not a single dot

A month total is one reading. One reading cannot draw a line, so a report built from month totals
alone shows a dot per chart and reads as broken even though every figure in it is right.

**Pull weekly figures using cumulative windows, then difference them.** For each client, call
`get_rella_social_analytics` five times, always starting on the first of the month:

```
2026-07-01 -> 2026-07-07     2026-07-01 -> 2026-07-21     2026-07-01 -> 2026-07-31
2026-07-01 -> 2026-07-14     2026-07-01 -> 2026-07-28
```

Week one is the first result; every later week is that result minus the one before it.

**Why cumulative rather than five separate week windows.** Views, engagement, profile views and
follower growth are additive and agree either way. Reach does not: it counts unique accounts, so
somebody reached in two different weeks is counted twice by separate windows. On real client data
that overstated a month by 3%, 24% and 65%. Differencing a cumulative series gives newly reached
accounts per week, which is additive and sums to the true month figure.

**Do not chase daily.** Single-day windows return zeros. Weekly is the finest grain worth the calls.

**Print a reconciliation before building anything:** each platform's five weekly values and their
sum against the month total, for reach, views, engagement, profile visits and follower growth. Every
row must sum exactly. If one does not, stop and say so rather than adjusting a number to balance it.

**Include both the weekly rows and the month total row.** The report uses the dated rows for the
charts and the exact period total for the headline figures, so one import gives a true weekly line
and an exact monthly reach. Earlier builds had to choose one or the other; that is fixed, and a
report that drops the month row will report reach as a sum of weeks and overstate it.

**Verify a chart by its values, not its point count.** Read the `cy` attributes and the axis
maximum. A series of points all sitting on zero looks like a chart and is not one. If the letter
says the trend reports zeros, that is a finding to disprove, not noise to route around.

## The rule that keeps the two sources honest

**One source per platform, per grain.** Never import native posts and Rella posts for the same
platform into the same report.

They do not deduplicate against each other. The importer only collapses rows matching on every
value, and two sources never match, so every post is counted twice and every total, rate and
ranking for that platform is overstated. This is verified behaviour, not a theory.

Mixing *grains* is fine and often right: Meta's native daily account series alongside Rella's post
detail is a legitimate combination.

The report now checks this itself. If both sources land on one platform at one grain, the data audit
raises **"came from more than one source"** as a serious issue. If you see it, remove one source and
re-import rather than explaining it away.

**When native and Rella disagree about the same platform**, that is a finding, not a nuisance. Say
so, show both numbers, and let the person decide. One real example from this project: a single
TikTok account was connected to two different Rella spaces and returned identical analytics for two
different clients. Cross-checking is what exposes that kind of misconfiguration.

## Step 4 — build the report

1. **Import data** — every file at once, or a whole folder
2. Choose the **client** and the **period**
3. Open **Data audit** and read it with them

The audit now surfaces connector notes as "A platform did not return every metric", carrying the
platform's own wording. If a metric is missing, that is where the reason is. Flag anything thin: a
platform with no rows, a date range stopping early, a file where few columns mapped.

## Step 5 — the letter

Run **AI analysis**, then read it with them and check:

- Does it match the figures on screen?
- Is it written to the client, who does not make the content? No production advice, no critique of
  work they did not do.
- Does any sentence claim something the data does not show?

Edit anything that fails. This step is what the privacy policy is about.

## Step 6 — the link

Use **Share link**. It lasts a year and can be revoked.

Leave the password blank for a normal view-only link. The field used to refill itself from the
browser's saved passwords between being cleared and submitted, producing links locked with a
password nobody knew; that is fixed, but glance at it before creating.

The link is shown in a read-only field when it is created, titled with the client's name. Copy it
from there. Never transcribe a link from a screenshot — a link read off pixels was wrong by a
character and simply did not open.

**Open every link before it goes anywhere** and confirm the client name, the period, and that the
charts show a line rather than a dot. A link nobody has opened is not a finished link.

## Step 7 — draft the email, do not send

Write a short covering note: how the month went in a sentence or two, the link, an offer to talk it
through. No jargon. Hand it to them to send, and confirm out loud which client each link belongs to.

## If asked to commit anything

```bash
git ls-files | xargs grep -lIF -f client-names.txt
```

`client-names.txt` holds one client or staff name per line and is deliberately never committed —
the names are the thing being protected. If it is missing, ask which names to scan for and create it
locally. Any output means a real name is about to reach a public repository. Stop.

Never commit client exports, tokens, API keys, or anything out of Render's environment.
