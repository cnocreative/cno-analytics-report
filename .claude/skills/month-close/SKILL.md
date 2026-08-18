---
name: month-close
description: Run CNO's monthly client reporting, end to end. Use when a month has ended and reports need building, when someone says "run the month close", "do this month's reports", "monthly reports", or names a client and a month. Walks refreshing the data, importing what is still manual, checking the figures, writing and reviewing the letter, creating the client link, and drafting the email for a person to send.
---

# CNO month close

Run this with the person, not at them. They may not be technical. Explain each step in plain
language, do the parts you can do, and stop where a human has to decide.

## Before anything

Check the service is up and durable:

```bash
curl -s https://sync.cnocreative.co/health
```

`"durable": true` must be present. If it says `false`, stop and tell them: links created now would
die within hours and read to a client as an expiry. That is a Render configuration problem, not
something to work around.

## The one rule that outranks everything

**Nothing reaches a client without a person reading it first.** CNO's published privacy policy
promises clients that staff review every sentence. Draft the email, never send it. Show the letter,
never assume it is fine.

Two more that matter just as much:

- **One client per report.** If a figure could belong to another client, stop and say so.
- **Never invent a number.** If data is missing, the report says less. It never estimates.

## Step 1 — refresh what is automatic

Connected platforms refresh themselves daily. To pull the closed month explicitly:

```bash
python automation/month_close.py
```

Needs `CNO_SYNC_SERVICE_URL` and `CNO_ADMIN_TOKEN` in the environment. Without them it prints a
line and exits — that is fine, it just means this machine is not set up for it, and the manual
path below still works.

It prints counts, never client names, because it also runs in public build logs.

## Step 2 — collect what is still manual

Only TikTok is connected today. Until Meta and LinkedIn approvals land, ask the person to export:

- **Instagram and Facebook** — Meta Business Suite, the month's date range
- **LinkedIn** — the Page's own export
- Anything else the client uses

Tell them where the files are going and that these files must never be committed to the repository.

## Step 3 — build the report

Open the report site, then:

1. **Import data** — drop in every file at once, a whole folder is fine
2. Pick the **client** and the **period**
3. Open **Data audit** and read it aloud with them. Flag anything that looks thin: a platform with
   no rows, a date range that stops early, a file that mapped few columns.

If something looks wrong, say so now. It is much cheaper than after a client has seen it.

## Step 4 — the letter

Run **AI analysis**. Then read the letter with them and check three things:

- Does it describe what actually happened, matching the figures on screen?
- Is it written to the client, who does not make the content? No production advice, no critique of
  work they did not do.
- Does any sentence claim something the data does not show?

Edit anything that fails. This is the step the privacy policy is about.

## Step 5 — the link

Use **Share link**. It expires in a year and can be revoked. Check it opens and shows the right
client before it goes anywhere.

## Step 6 — draft the email, do not send

Write a short covering note and give it to them to send. Keep it plain: what the month looked like
in a sentence or two, the link, and an offer to talk it through. No jargon.

Then confirm out loud which client each link belongs to, so a wrong link cannot go to the wrong
person.

## If asked to commit anything

Run the privacy scan first, always:

```bash
git ls-files | xargs grep -lIF -f client-names.txt
```

`client-names.txt` holds one client or staff name per line and is deliberately never committed —
the names are the thing being protected, so a list of them in a public repository would defeat the
check it feeds. If the file is missing, ask which names to scan for and create it locally.

Any output means a real name is about to be committed to a public repository. Stop.

Never commit client CSVs, exports, tokens, API keys, or anything from Render's environment.
