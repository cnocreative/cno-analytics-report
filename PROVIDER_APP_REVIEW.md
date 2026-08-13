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

**Service base URL:** `https://cno-native-sync-gp4h.onrender.com`
(change everywhere below if you move to `sync.cnocreative.co`)

---

## Meta — Instagram and Facebook

Start at [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App** →
type **Business**. Complete **Business Verification** first; it gates everything else and takes the
longest.

**Products to add:** Facebook Login for Business, Instagram Graph API.

**Valid OAuth Redirect URI:**

```
https://cno-native-sync-gp4h.onrender.com/oauth/meta/callback
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
| `pages_read_engagement` | Reads the selected Page's own engagement figures for the monthly report. |
| `read_insights` | Reads the Page and Instagram insight metrics (reach, impressions, views, profile visits, link clicks, follower change) that form the body of the report. |
| `instagram_basic` | Resolves the Instagram Business account attached to the chosen Page and reads its media list, so each post can be shown with its own performance. |
| `instagram_manage_insights` | Reads per-account and per-post Instagram insights: reach, impressions, saves, shares, total interactions, video views. These are the primary numbers in the report; without this the Instagram report is empty. |
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
https://cno-native-sync-gp4h.onrender.com/oauth/tiktok/callback
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
https://cno-native-sync-gp4h.onrender.com/oauth/linkedin/callback
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
