const envList = (name, fallback) => String(process.env[name] || fallback).split(",").map(x => x.trim()).filter(Boolean);
const publicBase = () => (process.env.PUBLIC_BASE_URL || (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : "http://localhost:10000")).replace(/\/$/, "");
const redirectUri = provider => `${publicBase()}/oauth/${provider}/callback`;
const isoDay = value => new Date(value).toISOString().slice(0, 10);
const unixMs = value => new Date(`${value}T00:00:00Z`).getTime();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
  if (!res.ok || data?.error?.code) {
    const message = data?.error?.message || data?.message || data?.error_description || `HTTP ${res.status}`;
    throw new Error(String(message).slice(0, 300));
  }
  return data;
}

async function paged(url, options = {}, maxPages = 12) {
  const out = [];
  let next = url;
  for (let i = 0; next && i < maxPages; i += 1) {
    const data = await apiJson(next, options);
    out.push(...(data.data || data.elements || []));
    next = data.paging?.next || data.links?.next || null;
  }
  return out;
}

export const providerNames = ["meta", "tiktok", "linkedin"];

export function buildAuthorizationUrl(provider, state) {
  const callback = redirectUri(provider);
  if (provider === "meta") {
    const version = process.env.META_API_VERSION || "v25.0";
    const p = new URLSearchParams({ client_id: required("META_CLIENT_ID"), redirect_uri: callback, response_type: "code", state, scope: envList("META_SCOPES", "pages_show_list,pages_read_engagement,read_insights,instagram_basic,instagram_manage_insights,ads_read").join(",") });
    return `https://www.facebook.com/${version}/dialog/oauth?${p}`;
  }
  if (provider === "tiktok") {
    const p = new URLSearchParams({ client_key: required("TIKTOK_CLIENT_KEY"), redirect_uri: callback, response_type: "code", state, scope: envList("TIKTOK_SCOPES", "user.info.basic,user.info.stats,video.list,video.insights").join(",") });
    return `https://www.tiktok.com/v2/auth/authorize/?${p}`;
  }
  if (provider === "linkedin") {
    const p = new URLSearchParams({ client_id: required("LINKEDIN_CLIENT_ID"), redirect_uri: callback, response_type: "code", state, scope: envList("LINKEDIN_SCOPES", "r_organization_social,r_organization_admin,r_ads_reporting").join(" ") });
    return `https://www.linkedin.com/oauth/v2/authorization?${p}`;
  }
  throw new Error("Unsupported provider");
}

export async function exchangeCode(provider, code) {
  const callback = redirectUri(provider);
  if (provider === "meta") {
    const version = process.env.META_API_VERSION || "v25.0";
    const p = new URLSearchParams({ client_id: required("META_CLIENT_ID"), client_secret: required("META_CLIENT_SECRET"), redirect_uri: callback, code });
    return apiJson(`https://graph.facebook.com/${version}/oauth/access_token?${p}`);
  }
  if (provider === "tiktok") {
    const body = new URLSearchParams({ client_key: required("TIKTOK_CLIENT_KEY"), client_secret: required("TIKTOK_CLIENT_SECRET"), code, grant_type: "authorization_code", redirect_uri: callback });
    return apiJson("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  }
  if (provider === "linkedin") {
    const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callback, client_id: required("LINKEDIN_CLIENT_ID"), client_secret: required("LINKEDIN_CLIENT_SECRET") });
    return apiJson("https://www.linkedin.com/oauth/v2/accessToken", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  }
  throw new Error("Unsupported provider");
}

export function normalizeToken(provider, payload) {
  const body = payload.data && payload.data.access_token ? payload.data : payload;
  const accessToken = body.access_token;
  if (!accessToken) throw new Error(`${provider} did not return an access token`);
  const expiresIn = Number(body.expires_in || body.expires || 0);
  return {
    accessToken,
    refreshToken: body.refresh_token || null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
    scopes: Array.isArray(body.scope) ? body.scope.join(",") : String(body.scope || "")
  };
}

export async function discoverAccounts(provider, accessToken) {
  if (provider === "meta") {
    const version = process.env.META_API_VERSION || "v25.0";
    const p = new URLSearchParams({ fields: "id,name,instagram_business_account{id,username}", access_token: accessToken });
    const pages = await paged(`https://graph.facebook.com/${version}/me/accounts?${p}`);
    return pages.map(page => ({ id: page.instagram_business_account?.id || page.id, name: page.instagram_business_account?.username || page.name, pageId: page.id, kind: page.instagram_business_account ? "instagram" : "facebook" }));
  }
  if (provider === "tiktok") {
    const fields = "open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count";
    const data = await apiJson(`https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const user = data.data?.user || {};
    return [{ id: user.open_id || "tiktok", name: user.display_name || "TikTok account", kind: "tiktok" }];
  }
  if (provider === "linkedin") {
    const version = process.env.LINKEDIN_VERSION || "202601";
    const headers = { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": version, "X-Restli-Protocol-Version": "2.0.0" };
    const data = await apiJson("https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED", { headers });
    return (data.elements || []).map(x => ({ id: String(x.organization || "").split(":").pop(), urn: x.organization, name: x.organization, kind: "linkedin" })).filter(x => x.id);
  }
  return [];
}

function metricValue(item) {
  if (typeof item?.total_value?.value === "number") return item.total_value.value;
  if (typeof item?.values?.[0]?.value === "number") return item.values[0].value;
  return null;
}

function actionMetric(items, keys) {
  const values = Object.fromEntries((items || []).map(x => [x.action_type, Number(x.value || 0)]));
  for (const key of keys) if (values[key] != null) return values[key];
  return null;
}

async function syncMeta(accessToken, clientRef, from, to) {
  const version = process.env.META_API_VERSION || "v25.0";
  const pageParams = new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username,followers_count,media_count}", access_token: accessToken });
  const pages = await paged(`https://graph.facebook.com/${version}/me/accounts?${pageParams}`);
  const rows = [];
  for (const page of pages) {
    const ig = page.instagram_business_account;
    if (!ig) continue;
    const accountByDate = new Map();
    const metricMap = { reach: "reach", impressions: "impressions", views: "views", profile_views: "profile_views", total_interactions: "engagement", website_clicks: "link_clicks" };
    const metricErrors = [];
    for (const metricName of Object.keys(metricMap)) {
      try {
        const metricParams = new URLSearchParams({ metric: metricName, period: "day", since: from, until: to, access_token: page.access_token });
        const insight = await apiJson(`https://graph.facebook.com/${version}/${ig.id}/insights?${metricParams}`);
        for (const metric of insight.data || []) {
        for (const point of metric.values || []) {
          const date = isoDay(point.end_time || to);
          const row = accountByDate.get(date) || { record_type: "account_daily", data_source: "meta_api", aggregation: "daily", client: clientRef, platform: "instagram", date };
          const value = typeof point.value === "object" ? null : point.value;
          if (metricMap[metric.name] && value != null) row[metricMap[metric.name]] = value;
          accountByDate.set(date, row);
        }
      }
      } catch (error) { metricErrors.push(`${metricName}: ${error.message}`); }
    }
    if (!accountByDate.size) accountByDate.set(to, { record_type: "account_daily", data_source: "meta_api", aggregation: "daily", client: clientRef, platform: "instagram", date: to });
    if (metricErrors.length) accountByDate.get([...accountByDate.keys()][0]).sync_note = `Unavailable metrics: ${metricErrors.join("; ").slice(0, 500)}`;
    for (const row of accountByDate.values()) rows.push({ followers_total: ig.followers_count, ...row });

    const mediaParams = new URLSearchParams({ fields: "id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count", since: new Date(`${from}T00:00:00Z`).toISOString(), until: new Date(`${to}T23:59:59Z`).toISOString(), limit: "100", access_token: page.access_token });
    const media = await paged(`https://graph.facebook.com/${version}/${ig.id}/media?${mediaParams}`);
    for (const item of media) {
      const post = { record_type: "post", data_source: "meta_api", aggregation: "post", client: clientRef, platform: "instagram", date: isoDay(item.timestamp), published_hour: new Date(item.timestamp).getUTCHours(), post_id: item.id, post_type: item.media_product_type || item.media_type, caption_snippet: String(item.caption || "").slice(0, 500), caption_length: String(item.caption || "").length, likes: item.like_count, comments: item.comments_count, permalink: item.permalink };
      try {
        const ip = new URLSearchParams({ metric: "reach,impressions,plays,saved,shares,total_interactions,video_views", access_token: page.access_token });
        const details = await apiJson(`https://graph.facebook.com/${version}/${item.id}/insights?${ip}`);
        const vals = Object.fromEntries((details.data || []).map(m => [m.name, metricValue(m)]));
        Object.assign(post, { reach: vals.reach, impressions: vals.impressions, views: vals.plays ?? vals.video_views, saves: vals.saved, shares: vals.shares, engagement: vals.total_interactions });
      } catch { /* Metrics vary by media type; base post data is still useful. */ }
      rows.push(post);
    }
  }

  try {
    const adAccounts = await paged(`https://graph.facebook.com/${version}/me/adaccounts?fields=id,name&access_token=${encodeURIComponent(accessToken)}`);
    for (const account of adAccounts) {
      const summaryFields = "date_start,date_stop,spend,reach,impressions,clicks,cpm,cpc,ctr,frequency,actions,action_values";
      const summaryParams = new URLSearchParams({ level: "account", time_range: JSON.stringify({ since: from, until: to }), time_increment: "1", fields: summaryFields, limit: "100", access_token: accessToken });
      const daily = await paged(`https://graph.facebook.com/${version}/${account.id}/insights?${summaryParams}`);
      for (const item of daily) {
        const paidLeads = actionMetric(item.actions, ["lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead"]);
        const paidConversions = actionMetric(item.actions, ["purchase", "omni_purchase", "offsite_conversion"]);
        const paidRevenue = actionMetric(item.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
        rows.push({ record_type: "account_daily", data_source: "meta_ads_api", aggregation: "daily", client: clientRef, platform: "instagram", date: item.date_start, spend: item.spend, paid_reach: item.reach, paid_impressions: item.impressions, paid_clicks: item.clicks, paid_leads: paidLeads, paid_conversions: paidConversions, paid_revenue: paidRevenue, paid_cpm_reported: item.cpm, paid_cpc_reported: item.cpc, paid_ctr_reported: item.ctr, paid_frequency_reported: item.frequency });
      }
      const fields = "date_start,date_stop,campaign_id,campaign_name,ad_id,ad_name,spend,reach,impressions,clicks,cpm,cpc,ctr,frequency,actions,action_values";
      const p = new URLSearchParams({ level: "ad", time_range: JSON.stringify({ since: from, until: to }), time_increment: "1", fields, limit: "100", access_token: accessToken });
      const ads = await paged(`https://graph.facebook.com/${version}/${account.id}/insights?${p}`);
      for (const ad of ads) {
        const paidLeads = actionMetric(ad.actions, ["lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead"]);
        const paidConversions = actionMetric(ad.actions, ["purchase", "omni_purchase", "offsite_conversion"]);
        const paidRevenue = actionMetric(ad.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
        rows.push({ record_type: "post", data_source: "meta_ads_api", aggregation: "ad_daily", client: clientRef, platform: "instagram", date: ad.date_start, post_id: ad.ad_id, post_type: "PAID_AD", campaign: ad.campaign_name || "Paid campaign", campaign_id: ad.campaign_id, caption_snippet: ad.ad_name || "Paid / dark ad", spend: ad.spend, reach: ad.reach, impressions: ad.impressions, paid_clicks: ad.clicks, paid_leads: paidLeads, paid_conversions: paidConversions, paid_revenue: paidRevenue });
      }
    }
  } catch { /* ads_read is optional; organic sync should still complete. */ }
  return rows;
}

async function syncTikTok(accessToken, clientRef, from, to) {
  const headers = { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  const fields = "open_id,display_name,follower_count,following_count,likes_count,video_count";
  const profile = await apiJson(`https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`, { headers });
  const user = profile.data?.user || {};
  const rows = [{ record_type: "account_daily", data_source: "tiktok_api", aggregation: "snapshot", client: clientRef, platform: "tiktok", date: to, followers_total: user.follower_count, likes: user.likes_count, posts: user.video_count }];
  let cursor = 0;
  for (let page = 0; page < 10; page += 1) {
    const vf = "id,title,video_description,duration,create_time,share_url,view_count,like_count,comment_count,share_count";
    const data = await apiJson(`https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(vf)}`, { method: "POST", headers, body: JSON.stringify({ max_count: 20, cursor }) });
    for (const video of data.data?.videos || []) {
      const date = isoDay(Number(video.create_time) * 1000);
      if (date >= from && date <= to) rows.push({ record_type: "post", data_source: "tiktok_api", aggregation: "post", client: clientRef, platform: "tiktok", date, post_id: video.id, post_type: "VIDEO", caption_snippet: video.video_description || video.title || "", caption_length: String(video.video_description || video.title || "").length, views: video.view_count, likes: video.like_count, comments: video.comment_count, shares: video.share_count, engagement: Number(video.like_count || 0) + Number(video.comment_count || 0) + Number(video.share_count || 0), permalink: video.share_url });
    }
    if (!data.data?.has_more) break;
    cursor = data.data.cursor;
  }
  return rows;
}

async function syncLinkedIn(accessToken, clientRef, from, to, metadata) {
  const version = process.env.LINKEDIN_VERSION || "202601";
  const headers = { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": version, "X-Restli-Protocol-Version": "2.0.0" };
  let accounts = metadata.accounts || [];
  if (!accounts.length) accounts = await discoverAccounts("linkedin", accessToken);
  const rows = [];
  for (const account of accounts) {
    const urn = account.urn || `urn:li:organization:${account.id}`;
    const interval = `(timeRange:(start:${unixMs(from)},end:${unixMs(to) + 86399999}),timeGranularityType:DAY)`;
    const url = `https://api.linkedin.com/rest/organizationPageStatistics?q=organization&organization=${encodeURIComponent(urn)}&timeIntervals=${encodeURIComponent(interval)}`;
    const data = await apiJson(url, { headers });
    for (const item of data.elements || []) {
      const stats = item.totalPageStatistics || {};
      const views = stats.views?.allPageViews?.pageViews || stats.views?.allPageViews?.uniquePageViews;
      const clicks = Object.values(stats.clicks || {}).flatMap(x => Array.isArray(x) ? x : []).reduce((n, x) => n + Number(x.clicks || 0), 0);
      rows.push({ record_type: "account_daily", data_source: "linkedin_api", aggregation: "daily", client: clientRef, platform: "linkedin", date: isoDay(item.timeRange?.start || unixMs(to)), profile_views: views, link_clicks: clicks || null });
    }
  }
  return rows;
}

export async function syncProvider(provider, accessToken, clientRef, from, to, metadata = {}) {
  if (provider === "meta") return syncMeta(accessToken, clientRef, from, to);
  if (provider === "tiktok") return syncTikTok(accessToken, clientRef, from, to);
  if (provider === "linkedin") return syncLinkedIn(accessToken, clientRef, from, to, metadata);
  throw new Error("Unsupported provider");
}
