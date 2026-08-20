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

## Step 2 — refresh the connected platforms

Connected platforms refresh daily on their own. To pull the closed month explicitly, either use
**Sync now** in the console, or run:

```bash
python automation/month_close.py
```

It needs `CNO_SYNC_SERVICE_URL` and `CNO_ADMIN_TOKEN` in the environment; without them it prints one
line and exits, which is fine. It reports counts only, never client names, because it also runs in
public build logs.

Currently connected: **TikTok** and **Meta** (Instagram). **LinkedIn is not configured** — the
console will say it is waiting on the CNO app credentials. That is a known state, not a fault.

## Step 3 — collect what is still manual

Ask the person to export whatever is not connected for this client:

- **LinkedIn** — the Page's own export
- **Facebook or Instagram**, if the Meta connection does not cover this client — Meta Business Suite
- Anything else the client uses

These files are client data. They must never be committed or shared outside CNO.

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

Use **Share link**. It lasts a year and can be revoked. Open it and confirm it shows the right
client and month before it goes anywhere.

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
