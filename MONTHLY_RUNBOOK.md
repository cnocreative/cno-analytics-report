# The monthly report, start to finish

For whoever is producing CNO's client reports this month. No technical background assumed.

There are two ways to do this. They produce the same report.

- **With Claude Cowork** — open the project in Cowork and type `/month-close`. It walks you
  through, does the fiddly parts, and stops to ask when something needs a person.
- **By hand** — follow this page.

Either way, the rule that never bends: **a person reads every report before a client does.**
CNO's privacy policy promises clients exactly that.

---

## What you need before you start

| Thing | Where |
|---|---|
| The report site | https://cno-analytics-report-5hi6.onrender.com |
| Meta Business Suite login | for the Instagram/Facebook export |
| LinkedIn Page admin access | for the LinkedIn export |

TikTok needs nothing — it refreshes itself.

---

## 1. Check the service is healthy

Open https://sync.cnocreative.co/health

You want to see `"durable": true`.

If it says `false`, **stop**. Any client link made now would break within hours and look to the
client like the report expired. Ask Austin or a developer to look before going further.

---

## 2. Export what is not automatic yet

TikTok is connected and refreshes on its own. Everything else still needs exporting by hand:

- **Instagram + Facebook** — Meta Business Suite, set the date range to the month that just ended
- **LinkedIn** — the Page's own analytics export

Put them all in one folder. **Never** put these files in the project folder or send them to anyone
outside CNO — they are client data.

---

## 3. Load them in

Open the report site and click **Import data**. Select every file at once, or the whole folder.
It reads CSV, Excel, and zip files, and works out which platform each one came from.

Then choose the **client** and the **period** at the top.

---

## 4. Check the data before trusting it

Click **Data audit**. Read what it says. You are looking for anything that seems off:

- a platform showing no data when you know the client posts there
- dates that stop partway through the month
- a file where hardly any columns were recognised

Finding a problem here takes a minute. Finding it after the client has the report is much worse.

---

## 5. Write the letter

Click **AI analysis**. It writes a plain-language letter and short notes for each section.

**Now read it properly.** Three questions:

1. Does it match the numbers on the screen?
2. Is it written *to the client*? They do not make their own content — CNO does. Nothing in the
   letter should read like advice to them about posting.
3. Does any sentence claim something the data does not actually show?

Change anything that fails. Editing is expected, not a sign something went wrong.

---

## 6. Create the client's link

Click **Share link**. The link lasts a year and can be switched off at any time.

Open it yourself first. Confirm it shows the right client's name and the right month.

---

## 7. Send it

Keep the email short: how the month went in a sentence or two, the link, and an offer to talk it
through.

Before you press send, check the link belongs to the client you are emailing. Sending one client
another's report is the one mistake that cannot be undone.

---

## If something looks wrong

| What you see | What it means |
|---|---|
| `"durable": false` on the health page | Do not create links. Get a developer. |
| A platform missing from the report | Its export probably was not included in step 2 |
| The report will not open from a link | The service may be waking up — wait a minute and retry |
| A number looks impossible | Trust your instinct, check the audit, ask before sending |

## What never goes in the project folder

Client exports, spreadsheets, passwords, API keys, anything copied out of Render. The project is a
public repository — anything put there can be read by anyone.
