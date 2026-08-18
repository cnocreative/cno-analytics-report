# Provider app review — what to submit

Ready-to-paste answers for the Meta, TikTok, and LinkedIn developer applications, plus the exact
settings each one needs. Reviewers reject vague answers, so every permission below is justified by
naming the endpoint that uses it and the thing in the client's report that would otherwise be blank.

Everything here describes what the service actually does. Do not add a permission "just in case":
an unused permission is a common rejection reason, and each one you add is one more thing a reviewer
has to be convinced of.

## Facts that apply to all three

| | |
|---|---|
| Company | CNO Creative Co |
| Product | CNO Reports — a private monthly analytics report for the clients CNO manages social media for |
| Who signs in | The client, or a CNO staff member who already administers the client's account |
| Who sees the data | CNO staff, and the client it belongs to. Nobody else, ever |
| Data written | None. Every call is read-only analytics |
| Token storage | AES-256-GCM encrypted at rest, server side only, never sent to a browser |
| Sharing | Reports go to the client as a private link scoped to that one client |
| Deletion | Disconnecting removes the stored authorization and the analytics pulled with it |

**Service base URL:** `https://sync.cnocreative.co`

This has to be a domain CNO owns. Meta refuses a shared hosting domain such as `onrender.com` in
its App Domains field, which blocks sign-in with an error naming the domain, so the Render address
cannot be used for the Meta app no matter how it is entered.

---

## Meta — Instagram and Facebook

Start at [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**.

**Choose the use cases on the creation screen. This is the step that matters.** Meta attaches
permissions to an app through its use cases, and a use case is one "you added to your app during
the app creation process" — there is no way to add a business use case to an app that was created
without one. Pick:

- **Manage everything on your Page** — carries `pages_show_list` and the rest of the Page reads;
- **Manage messaging & content on Instagram** — despite the name, this is the only Instagram use
  case on offer. On its setup page, click **"switch to the API setup with Facebook login"** (the
  default is Instagram-native login, which does not carry insights). Then click **only** "Add
  required content permissions" — it brings `instagram_basic`, `pages_read_engagement`,
  `pages_show_list`, `business_management`. Do **not** click "Add required messaging permissions";
  that requests `instagram_manage_messages`, DM read/send access this project never uses and a
  reviewer will question on a reporting tool.

An app created with only **Authenticate and request data from users with Facebook Login** is a
dead end for this project. Its Permissions and Features list will only ever offer `email`,
`public_profile` and the personal `user_*` permissions, no matter how many products you look for
or whether Business Verification has completed. If that has already happened, create a second app
with the right use cases. Nothing is wasted: the privacy policy URL, data deletion URL, icon,
category and redirect URI all paste straight across.

After adding both use cases, go to **Permissions and features** and add `instagram_manage_insights`
by hand — it is not in either bundle above and it is where every Instagram number in the report
comes from. Also remove `instagram_content_publishing` if the content bundle added it; this
project never posts.

Complete **Business Verification** as well; it gates advanced access and takes the longest. It is
necessary but not sufficient — verification alone adds no permissions.

**Check before you start:** Meta's Pages API documentation states that an app needing "business
data owned by other business portfolios" must become a **Tech Provider**, which is a heavier
review than ordinary verification. Whether this applies depends on who owns each client's Page.
If client Pages sit inside CNO's own Business Portfolio, it does not. If clients keep their Pages
in their own portfolios, it does. Confirm this before investing in the submission.

**Valid OAuth Redirect URI:**

```
https://sync.cnocreative.co/oauth/meta/callback
```

**Prerequisites on the client side** — check these before submitting, they cause most "cannot
reproduce" rejections:
- the Instagram account is a **Professional** account (Business or Creator), not personal;
- it is **linked to a Facebook Page**; and
- the person authorizing is an admin of that Page.

### Permissions to request, and why

| Permission | What to tell the reviewer |
|---|---|
| `pages_show_list` | Lists the Pages this person administers so CNO can pick the one Page belonging to this client. Without it we cannot identify which account to report on, and we would risk pulling a different client's data. |
| `pages_read_engagement` | Reads the selected Page's own engagement figures and Page insights (reach, impressions, views, profile visits, link clicks, follower change) for the monthly report. Meta deprecated `read_insights` as a standalone permission — this is what covers Page insights now. Do not request `read_insights`; it is no longer a valid scope and including it in an OAuth request can fail the whole sign-in. |
| `instagram_basic` | Resolves the Instagram Business account attached to the chosen Page and reads its media list, so each post can be shown with its own performance. |
| `instagram_manage_insights` | Reads per-account and per-post Instagram insights: reach, impressions, saves, shares, total interactions, video views. These are the primary numbers in the report; without this the Instagram report is empty. |
| `business_management` | Resolves which Pages and Instagram accounts belong to a connected business portfolio. Comes bundled with the "Manage everything on your Page" use case's content permissions. |
| `ads_read` | **Only request if CNO reports on paid media.** Reads Ads Manager spend, paid reach, paid impressions, clicks and results so paid performance is reported with paid-only denominators, never mixed into organic figures. Drop this permission if CNO does not run ads for clients — an unused permission invites rejection. |

### Screencast to record

Reviewers want to watch the permission being used. Record one continuous take:

1. Open CNO Reports and select a client.
2. Click **Connect selected client**, then **Meta**.
3. Sign in as the test user and show the consent screen listing the permissions.
4. Show the account assignment step where CNO picks the exact Instagram profile for this client.
5. Click **Refresh and load into this report**.
6. Show the finished report with Instagram reach, impressions and engagement populated.

Say out loud, or caption, which permission produced which number.

### Use-case description to paste

> CNO Creative Co manages social media for a small number of client businesses. CNO Reports produces
> each client's monthly performance report.
>
> After the client authorizes access once, the service reads that client's own Page and Instagram
> insights — reach, impressions, views, profile visits, link clicks, follower change, and per-post
> engagement — and presents them in a written monthly report that CNO reviews and sends to that
> client.
>
> The integration is read-only. It never publishes, comments, messages, or modifies anything. Access
> tokens are encrypted at rest on CNO's server and are never exposed to a browser or included in the
> report links sent to clients. Each client's data is isolated: a report contains exactly one client's
> accounts, and CNO must explicitly assign which Instagram profile belongs to which client before any
> data is read. Disconnecting a client deletes the stored authorization and the analytics collected
> with it.

---

## TikTok

Start at [developers.tiktok.com](https://developers.tiktok.com) → **Manage apps** → create an app.
Add **Login Kit**. There is no Display API tile to add: TikTok now grants those reads through the
**Scopes** panel instead, so adding the three scopes below is the whole configuration. Say
"Login Kit is the only product used" in the review form — claiming a product the app does not
list is a contradiction a reviewer will see.

**Redirect URI:**

```
https://sync.cnocreative.co/oauth/tiktok/callback
```

### Scopes to request

| Scope | What to tell the reviewer |
|---|---|
| `user.info.basic` | Identifies which TikTok account was authorized, so CNO can confirm it is the right client account before reporting on it. |
| `user.info.stats` | Reads the account's follower count, total likes and video count for the audience section of the monthly report. |
| `video.list` | Reads the account's own videos with their view, like, comment and share counts, so the report can show which content performed and why. |

### Read this before you rely on TikTok

TikTok's Display API returns **basic video counters only**. It does **not** return watch time,
average time watched, or completion rate. CNO's manual TikTok export contains more than the API
does.

So for TikTok, connecting automates collection but **reduces** the depth of the data. If watch time
matters to a client's report, keep exporting TikTok by hand and let the importer read it, and treat
the connector as a convenience rather than an upgrade.

### Use-case description to paste

> CNO Creative Co is a social media agency. This integration lets a client authorize CNO once to read
> that client's own TikTok analytics, which CNO compiles into a written monthly performance report
> delivered privately to that same client.
>
> It reads the authorizing account's profile statistics and its own video list with public engagement
> counts. It is strictly read-only: it never posts, uploads, comments, or changes anything on the
> account. It does not read other users' content and does not aggregate data across accounts.
> Authorizations are encrypted at rest on CNO's server, and each client's report contains only that
> client's own data.

---

## LinkedIn

Start at [developer.linkedin.com](https://developer.linkedin.com) → **Create app**. The app must be
associated with the **CNO Creative Co LinkedIn Page**, and you must verify that association from the
Page itself.

**Redirect URL:**

```
https://sync.cnocreative.co/oauth/linkedin/callback
```

Then request the **Community Management API** product. This is a separate application form.

### Set expectations honestly

This is the hardest of the three. LinkedIn declines a large share of Community Management API
requests, and approval is not guaranteed no matter how well the form is written. Assume LinkedIn
may stay on manual `.xls` export — which the importer now reads directly, so nothing is blocked
if this is refused.

The person authorizing must be an **administrator of the LinkedIn Page** being reported on.

### Permissions to request

| Permission | What to tell the reviewer |
|---|---|
| `r_organization_social` | Reads the organization's own posts and their share statistics — impressions, unique impressions, clicks, likes, comments, shares — for the monthly report. |
| `rw_organization_admin` | Reads the organization's Page statistics and follower counts. CNO uses only the read half of this permission; the service performs no write of any kind. LinkedIn does not currently offer a read-only equivalent that returns page statistics. |

### Use-case description to paste

> CNO Creative Co manages LinkedIn Pages on behalf of client organizations. This integration reads a
> client organization's own Page analytics — page views, unique visitors, follower count, and the
> impressions, clicks and reactions on its own posts — and compiles them into a written monthly
> performance report that CNO reviews and delivers privately to that client.
>
> Only an administrator of the Page can authorize it, and the authorization covers only the
> organizations that administrator already manages. The integration is read-only: it does not post,
> schedule, comment, message, or modify the Page. It does not read member profiles, connections, or
> any data outside the authorized organization's own Page analytics. Tokens are encrypted at rest on
> CNO's server and are never exposed in a browser or in the report links sent to clients.

---

## After an approval lands

For each approved provider, in Render → `cno-native-sync` → **Environment**:

| Provider | Variables to set |
|---|---|
| Meta | `META_CLIENT_ID`, `META_CLIENT_SECRET` |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |

The scope defaults in `sync-service/.env.example` already match the permissions above. Only set
`META_SCOPES`, `TIKTOK_SCOPES` or `LINKEDIN_SCOPES` if a reviewer approves a different set — in
which case set them to exactly what was approved, or the sign-in will fail on an unapproved scope.

Drop `ads_read` from `META_SCOPES` if CNO does not report on paid media.

The service picks the change up on restart. A provider with credentials stops showing as "waiting"
in the report's **Native sync** panel, and `/health` reports `setup_complete: true` once all three
service secrets and at least one provider are configured.

## Verifying a provider before it touches client data

1. Connect a **CNO-owned** test account first, never a client's.
2. Confirm the account assignment step lists the right profile and that syncing is blocked until one
   is chosen.
3. Run a sync for a period you already have a manual export for.
4. Compare the API figures against that export. They will not always match exactly — platform totals
   can include Stories, ads, or deleted content that a post export omits — but large unexplained gaps
   mean the adapter needs attention before a client sees it.
5. Repeat for a second full reporting period before trusting the connection.
