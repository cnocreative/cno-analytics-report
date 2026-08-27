# Meta setup — WhatsApp message for Christa

Christa owns the verified CNO Business Portfolio. Meta requires the app to be created inside a
verified portfolio, so only she can do steps 1–3. Everything after that is CNO-side work.

Send as three WhatsApp messages so it isn't one wall of text. WhatsApp bold is *single asterisks*.

Review submission text lives in [`PROVIDER_APP_REVIEW.md`](PROVIDER_APP_REVIEW.md).

---

## Message 1

Hey Christa — I need about 15 min from you to finish the automated reporting setup.

Meta only lets you create a developer app inside a *verified* business portfolio, and ours is
under your login, so it has to be you who creates it. Once it exists and I'm an admin on it, I
can do everything else myself.

Quick check first: business.facebook.com → Settings → Business Info. It should say *Verified*.
If it says pending or needs more info, tell me before you do anything else.

---

## Message 2

*Step 1 — create the app*

1. developers.facebook.com, signed in as you
2. Top right: My Apps → Create App
3. App name: *CNO Reports* (this is the name clients see on the permission screen)
4. Contact email: [your email]
5. *Business portfolio: pick the verified CNO one.* This is the step that matters — if it's
   blank or "no business portfolio", the app doesn't inherit the verification and the rest is
   pointless
6. If it asks what you're building: Other → app type Business. Meta reshuffles this screen
   constantly, so if you see something different just pick whatever mentions business assets
   or analytics
7. Create app

*Step 2 — make me an admin*

In the app: App settings → App roles → Roles → Add people → *Administrator* → add me.

That's the bit that means I don't have to come back to you for the rest of it.

---

## Message 3

*Step 3 — access to the CNO page and IG*

Separate permission system from the app itself, so it's easy to assume it carried over when it
didn't.

business.facebook.com → Settings → Users → People → add me, and while adding, tick access to:
- the CNO Facebook Page
- the CNO Instagram account

Full control is easiest. Analyze performance is the minimum that works.

*One thing to confirm:* the CNO Instagram has to be a Professional account (Business or Creator)
and linked to the Facebook Page. Instagram app → Settings → Account type and tools. If it's
still a personal account Meta gives out zero analytics and none of this works.

That's everything I need. After that I configure it and submit to Meta for review — usually a
few days, sometimes a couple of weeks. I'm connecting CNO's own accounts first so we can prove
it works before anything touches a client account.

---

## Notes for Austin — do not send

*Don't ask her to send the App Secret over WhatsApp.* Step 2 exists so you read it yourself from
App settings → Basic → App Secret → Show. A secret pasted into a chat is a permanent credential
sitting in two message histories with no way to unsend it properly.

Once you're an admin:

1. *App settings → Basic* — set Privacy Policy URL
   `https://cno-analytics-report-5hi6.onrender.com/privacy.html` and User Data Deletion
   `https://cno-analytics-report-5hi6.onrender.com/data-deletion.html`, plus app icon (1024×1024)
   and category. Review won't accept the submission without both URLs.
2. If this app was created without choosing use cases at creation, permissions cannot be added to
   it later — Meta attaches them through use cases, and use cases are an app-creation-time choice
   only. Create a **new** app instead and pick, on the creation screen itself: *Manage everything
   on your Page*, and *Manage messaging & content on Instagram* (the only Instagram option, despite
   the name). Everything from step 1 pastes straight into the new app.
3. On the Instagram use case's setup page, click **"switch to the API setup with Facebook login"**
   (the default is Instagram-native login, which cannot read insights). Then click only **"Add
   required content permissions"** — not the messaging bundle, which requests DM access this
   project never uses.
4. *Facebook Login for Business → Settings → Valid OAuth Redirect URIs:*
   `https://cno-native-sync-gp4h.onrender.com/oauth/meta/callback` — exact match, no trailing slash.
5. Put App ID and App Secret into Render as `META_CLIENT_ID` / `META_CLIENT_SECRET`, redeploy.
6. On *Permissions and features*, add `instagram_manage_insights` by hand — it isn't in either
   bundle and it's where every Instagram number in the report comes from. Submit App Review for
   `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`,
   `business_management`. Do not request `read_insights` — Meta deprecated it, and including a
   dead scope in the sign-in request can fail the whole OAuth flow. Justification text and the
   screencast shot list are in `PROVIDER_APP_REVIEW.md`.

*Already done, no action needed:* the service now runs on Postgres (`"storage":"postgres"`,
`"durable":true`) at `cno-native-sync-gp4h.onrender.com`, so connections and saved report links
survive redeploys. `PUBLIC_BASE_URL` is unset, which is correct — leave it unset.
