import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import { openStore } from "./store.js";
import { decrypt, deriveEncryptionKey, encrypt, hash, randomToken, safeEqual } from "./crypto.js";
import { buildAuthorizationUrl, configuredProviders, discoverAccounts, exchangeCode, normalizeToken, providerNames, refreshAccessToken, syncProvider } from "./providers.js";

const store = await openStore();
const app = express();
const port = Number(process.env.PORT || 10000);
const trim = value => String(value || "").replace(/\/$/, "");
/* REPORT_ORIGIN accepts a comma-separated list so the Render site, a custom CNO domain, and a
   developer's localhost can all talk to one service. */
const reportOrigins = String(process.env.REPORT_ORIGIN || "http://localhost:5601,http://localhost:8777")
  .split(",").map(trim).filter(Boolean);
const primaryOrigin = reportOrigins[0] || "http://localhost:5601";
const publicBase = trim(process.env.PUBLIC_BASE_URL || (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : `http://localhost:${port}`));
const production = process.env.NODE_ENV === "production";
const SESSION_DAYS = 30;

app.set("trust proxy", 1);
app.disable("x-powered-by");
/* form-action must name the providers' sign-in hosts. Starting a connection submits a form to
   this service, which answers with a redirect to the provider — and browsers apply form-action
   to every hop of a form submission, not just the first. Restricted to 'self' the redirect is
   blocked with nothing but a console entry, so the button appears to do nothing at all. */
const oauthHosts = ["https://www.facebook.com", "https://www.tiktok.com", "https://www.linkedin.com"];
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", "data:"], formAction: ["'self'", ...oauthHosts], frameAncestors: ["'none'"] } } }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use(express.json({ limit: "4mb" }));

/* Reading one saved client report is deliberately open to any origin. The client opening the link
   has no CNO account, may be on any network, and CNO may serve the report from a domain this
   service was never told about — an origin allowlist there turns into "the link works for staff
   and nobody else". The link itself is the credential: a random id, a payload encrypted at rest,
   scoped to one client, expiring, revocable, and optionally password-locked in the browser. */
const isPublicReportRead = req => req.method === "GET" && /^\/v1\/reports\/[^/]+$/.test(req.path);

app.use((req, res, next) => {
  if (!req.body) req.body = {};
  const origin = req.headers.origin;
  const allowed = !!origin && reportOrigins.includes(trim(origin));
  const publicRead = isPublicReportRead(req) || (req.method === "OPTIONS" && /^\/v1\/reports\/[^/]+$/.test(req.path));
  if (publicRead) {
    /* No credentials header here: "*" and Allow-Credentials are mutually exclusive, and this
       endpoint must never be reachable with a staff cookie attached. */
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  } else if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  /* Helmet defaults Cross-Origin-Resource-Policy to same-origin, which would block the report
     window from reading these JSON responses even with CORS approval. */
  if (req.path.startsWith("/v1/")) res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (req.method === "OPTIONS") return res.sendStatus(publicRead || allowed ? 204 : 403);
  next();
});

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const day = date => (date ? new Date(date).toISOString().slice(0, 10) : "");
const daysAgo = count => day(Date.now() - count * 86400000);
const cookies = req => Object.fromEntries(String(req.headers.cookie || "").split(";").map(x => x.trim().split(/=(.*)/s)).filter(x => x[0]).map(([k, v]) => [decodeURIComponent(k), decodeURIComponent(v || "")]));
const clientRefOf = value => String(value || "").trim().slice(0, 120);

function layout(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · CNO Native Sync</title><style>
  :root{--ink:#2a1f18;--soft:#71675f;--cream:#fff8e7;--sand:#ece2cf;--terra:#db9b7f;--burnt:#996137;--sage:#888e6f}*{box-sizing:border-box}body{margin:0;background:#f8f3e8;color:var(--ink);font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;border-top:3px solid var(--ink)}main{max-width:1040px;margin:0 auto;padding:42px 24px 70px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:34px}.brand{font-family:Georgia,serif;font-size:27px}.k{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--burnt)}h1,h2,h3{font-family:Georgia,serif;font-weight:400}h1{font-size:42px;margin:.15em 0}p{color:var(--soft)}.card{background:#fff;border:1px solid var(--sand);padding:22px;margin:14px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.provider{border-top:4px solid var(--terra)}.provider.off{border-top-color:var(--sand);opacity:.72}label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--soft);margin:12px 0 4px}input,select{width:100%;padding:11px;border:1px solid var(--sand);font:inherit;background:#fff}.btn,button{display:inline-block;border:1px solid var(--terra);background:#fff;color:var(--burnt);padding:10px 15px;text-decoration:none;text-transform:uppercase;letter-spacing:.08em;font-size:11px;cursor:pointer}.solid{background:var(--burnt);color:#fff;border-color:var(--burnt)}.quietbtn{border-color:var(--sand);color:var(--soft)}.row{display:flex;gap:9px;flex-wrap:wrap;align-items:end}.row>*{flex:1}.status{font-size:11px;padding:4px 8px;background:var(--cream);color:var(--sage);display:inline-block}.status.choose{color:var(--burnt);background:#fff1e9}.error{color:#9a3e2b}.quiet{font-size:12px;color:var(--soft)}table{width:100%;border-collapse:collapse;background:#fff}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--sand);font-size:12px}th{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}code{background:var(--cream);padding:2px 5px}.linkbox{overflow-wrap:anywhere;background:var(--cream);padding:14px;border:1px solid var(--sand)}.assign{border-top:1px solid var(--sand);margin-top:14px;padding-top:12px}.choice{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid #f2eadb;text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink);margin:0}.choice input{width:auto;margin:0}.kind{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}.connection{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(320px,1.5fr);gap:22px}.connection h3{font-size:24px;margin:3px 0}.selected{color:var(--ink);font-weight:600}.banner{background:#fff1e9;border:1px solid var(--terra);padding:14px 18px;margin-bottom:18px;font-size:12.5px;color:var(--burnt)}.inline{display:inline;margin:0}@media(max-width:760px){.grid{grid-template-columns:1fr}.connection{grid-template-columns:1fr}h1{font-size:34px}}
  </style></head><body><main><header><div><div class="k">CNO Creative Co · Internal only</div><div class="brand">Native Analytics Sync</div></div><a class="btn" href="${esc(primaryOrigin)}">Open reports</a></header>${body}</main></body></html>`;
}

/* ---- staff session + CSRF ------------------------------------------------ */
/* The session cookie is SameSite=None so the report app can call this service from its own
   origin. That makes the classic HTML forms below forgeable unless every state-changing POST
   also carries a token derived from the session secret, which only this browser holds. */
const csrfFor = token => hash(`${token}|csrf`);
const csrfField = req => `<input type="hidden" name="_csrf" value="${esc(csrfFor(cookies(req).cno_sync_session || ""))}">`;

async function createSession(res) {
  const token = randomToken();
  await store.createSession(hash(token), SESSION_DAYS);
  res.cookie("cno_sync_session", token, { httpOnly: true, secure: production, sameSite: production ? "none" : "lax", maxAge: SESSION_DAYS * 24 * 3600 * 1000, path: "/" });
}

async function isAdmin(req) {
  const token = cookies(req).cno_sync_session;
  if (!token) return false;
  return store.sessionExists(hash(token));
}

const loginAttempts = new Map();
function throttleLogin(req) {
  const key = String(req.ip || "unknown");
  const record = loginAttempts.get(key) || { count: 0, until: 0 };
  if (record.until > Date.now()) return false;
  if (record.until && record.until <= Date.now()) { record.count = 0; record.until = 0; }
  record.count += 1;
  if (record.count > 10) { record.until = Date.now() + 15 * 60 * 1000; record.count = 0; loginAttempts.set(key, record); return false; }
  loginAttempts.set(key, record);
  if (loginAttempts.size > 5000) loginAttempts.clear();
  return true;
}

function signInPage() {
  return layout("Sign in", `<div class="card" style="max-width:520px;margin:50px auto"><h1>Private CNO access</h1><p>Enter the internal access token. Platform passwords and OAuth tokens are never shown here.</p><form method="post" action="/admin/login"><label>Internal access token</label><input type="password" name="token" autocomplete="current-password" required><p><button class="solid" type="submit">Sign in</button></p></form></div>`);
}

async function requireAdmin(req, res, next) {
  try { if (await isAdmin(req)) return next(); } catch { /* fall through to the sign-in page */ }
  if (req.path.startsWith("/v1/")) return res.status(401).json({ error: "Sign in to CNO's connection center first" });
  res.status(401).send(signInPage());
}

/* Applied to every state-changing HTML form post. JSON endpoints are protected by the CORS
   preflight that a JSON content type forces, plus this same site check. */
function requireSameSite(req, res, next) {
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return res.status(403).send(layout("Blocked", `<div class="card"><h1>Request blocked</h1><p>That action has to start inside CNO's connection center.</p><a class="btn" href="/admin">Return</a></div>`));
  const token = cookies(req).cno_sync_session || "";
  if (!token || !safeEqual(String(req.body._csrf || ""), csrfFor(token))) {
    return res.status(403).send(layout("Blocked", `<div class="card"><h1>This form expired</h1><p>Open the connection center again and retry. Nothing was changed.</p><a class="btn" href="/admin">Return</a></div>`));
  }
  next();
}

function requireJsonSameSite(req, res, next) {
  const site = req.headers["sec-fetch-site"];
  if (site === "cross-site") {
    const origin = trim(req.headers.origin || "");
    if (!origin || !reportOrigins.includes(origin)) return res.status(403).json({ error: "This request did not come from an approved CNO report origin" });
  }
  next();
}

/* ---- setup checks --------------------------------------------------------- */
/* A missing secret should explain itself in the browser rather than crash-looping the service
   or failing halfway through a client's sign-in. */
function setupIssues() {
  const issues = [];
  if (!process.env.CNO_ADMIN_TOKEN) issues.push("CNO_ADMIN_TOKEN is not set, so nobody can sign in to this console.");
  try { deriveEncryptionKey(process.env.TOKEN_ENCRYPTION_KEY || ""); }
  catch (error) { issues.push(`TOKEN_ENCRYPTION_KEY is not usable: ${error.message}`); }
  if (!configuredProviders().length) issues.push("No platform app credentials are configured yet, so there is nothing to connect to.");
  return issues;
}
const setupBanner = () => {
  const issues = setupIssues();
  return issues.length ? `<div class="banner"><b>Finish setup first.</b><ul style="margin:8px 0 0;padding-left:18px">${issues.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>` : "";
};

/* ---- health and service description -------------------------------------- */

app.get("/health", (_req, res) => res.json({ ok: true, service: "cno-native-sync", version: "0.7.0", storage: store.kind, durable: store.durable, setup_complete: setupIssues().length === 0 }));
app.get("/", (_req, res) => res.redirect("/admin"));

/* TikTok will not accept an OAuth redirect URI on a URL prefix it has not verified, and it
   verifies one by fetching a signature file from that prefix. This service publishes no static
   files, so the file is served from an environment variable instead: set TIKTOK_VERIFICATION to
   the downloaded file's entire contents. The file is named after the code inside it, so deriving
   the path from the contents means the two can never disagree. */
app.use((req, res, next) => {
  const body = String(process.env.TIKTOK_VERIFICATION || "").trim();
  const code = /^tiktok-developers-site-verification=([A-Za-z0-9_-]+)$/.exec(body);
  if (!code || req.method !== "GET" || req.path !== `/tiktok${code[1]}.txt`) return next();
  res.type("text/plain").send(body);
});

/* Lets the report app show honest connection state before asking staff to sign in. */
app.get("/v1/session", async (req, res) => {
  const configured = configuredProviders();
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    service: "cno-native-sync",
    version: "0.7.0",
    signed_in: await isAdmin(req).catch(() => false),
    storage: store.kind,
    durable: store.durable,
    admin_url: `${publicBase}/admin`,
    providers: providerNames.map(name => ({ name, configured: configured.includes(name) }))
  });
});

/* ---- client report links -------------------------------------------------- */

app.post("/v1/reports", requireJsonSameSite, requireAdmin, async (req, res) => {
  const payload = String(req.body.payload || "");
  const clientRef = clientRefOf(req.body.client_ref) || "Client";
  if (payload.length < 40 || payload.length > 1_500_000 || !/^[A-Za-z0-9_.-]+$/.test(payload)) {
    return res.status(400).json({ error: "The report payload is invalid or too large" });
  }
  const id = randomToken(18);
  await store.createReportShare({ idHash: hash(id), clientRef, cipher: encrypt(payload), encrypted: !!req.body.encrypted, days: 365 });
  res.setHeader("Cache-Control", "no-store");
  res.status(201).json({ id, expires_in_days: 365 });
});

app.get("/v1/reports/:id", async (req, res) => {
  const id = String(req.params.id || "");
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) return res.status(404).json({ error: "Report not found" });
  const found = await store.getReportShare(hash(id));
  if (!found) return res.status(404).json({ error: "This report link expired, was revoked, or does not exist" });
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.json({ payload: decrypt(found.cipher), encrypted: found.encrypted });
});

app.get("/admin/reports", requireAdmin, async (req, res) => {
  const shares = await store.listReportShares();
  const rows = shares.map(s => `<tr><td>${esc(s.clientRef)}</td><td>${esc(day(s.createdAt))}</td><td>${s.encrypted ? "Password protected" : "View only"}</td><td>${s.lastOpenedAt ? esc(day(s.lastOpenedAt)) : "Not opened"}</td><td>${s.revokedAt ? "Revoked" : esc(day(s.expiresAt))}</td><td>${s.revokedAt ? "" : `<form class="inline" method="post" action="/admin/reports/${esc(s.idHash)}/revoke">${csrfField(req)}<button type="submit">Revoke</button></form>`}</td></tr>`).join("");
  res.send(layout("Client report links", `<h1>Saved client links</h1><p>Every link is random, client-specific, revocable, and automatically expires. Revoking a link does not delete the underlying source data.</p><div class="card">${shares.length ? `<table><thead><tr><th>Client</th><th>Created</th><th>Protection</th><th>Last opened</th><th>Expires</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : "<p>No saved report links yet.</p>"}</div><a class="btn" href="/admin">Back to connections</a>`));
});

app.post("/admin/reports/:hash/revoke", requireAdmin, requireSameSite, async (req, res) => {
  if (!/^[a-f0-9]{64}$/.test(req.params.hash || "")) return res.sendStatus(404);
  await store.revokeReportShare(req.params.hash);
  res.redirect("/admin/reports");
});

/* ---- connection console --------------------------------------------------- */

function connectionStatus(connection) {
  const metadata = connection.metadata || {};
  const accounts = Array.isArray(metadata.accounts) ? metadata.accounts : [];
  const selectedIds = new Set((Array.isArray(metadata.selected_account_ids) ? metadata.selected_account_ids : (accounts.length === 1 ? [accounts[0].id] : [])).map(String));
  const selected = accounts.filter(account => selectedIds.has(String(account.id)));
  if (metadata.discovery_error) return { state: "reconnect", accounts, selected, selectedIds, detail: metadata.discovery_error };
  if (accounts.length && !selected.length) return { state: "choose", accounts, selected, selectedIds, detail: "Authorization succeeded. Assign the exact native account that belongs to this client." };
  if (!accounts.length) return { state: "reconnect", accounts, selected, selectedIds, detail: "No native account was discovered. Confirm the approved app permissions and reconnect." };
  return { state: "ready", accounts, selected, selectedIds, detail: connection.lastSyncedAt ? `Last refreshed ${day(connection.lastSyncedAt)}.` : "Connected and ready for its first refresh." };
}

app.get("/admin", requireAdmin, async (req, res) => {
  const requestedClient = clientRefOf(req.query.client_ref);
  const connections = await store.listConnections();
  const configured = configuredProviders();
  const connectionCards = connections.map(c => {
    const info = connectionStatus(c);
    const status = info.state === "reconnect"
      ? `<span class="status choose">Reconnect needed</span><p class="error">${esc(info.detail)}</p>`
      : info.state === "choose"
        ? `<span class="status choose">Choose account</span><p class="quiet">${esc(info.detail)}</p>`
        : `<span class="status">Ready</span><p class="quiet">${esc(info.detail)}</p>`;
    const choices = info.accounts.map(account => `<label class="choice"><input type="${c.provider === "meta" ? "checkbox" : "radio"}" name="account_id" value="${esc(account.id)}" ${info.selectedIds.has(String(account.id)) ? "checked" : ""}><span>${esc(account.name || account.id)}</span><span class="kind">${esc(String(account.kind || "account").replace("_", " "))}</span></label>`).join("");
    return `<div class="card connection"><div><div class="k">${esc(c.clientRef)} · ${esc(c.provider)}</div><h3>${info.selected.length ? esc(info.selected.map(x => x.name || x.id).join(" + ")) : "Account not assigned"}</h3>${status}${c.lastError ? `<p class="error">${esc(c.lastError)}</p>` : ""}<p><a class="btn quietbtn" href="/admin/connections/${esc(c.id)}/disconnect">Disconnect</a></p></div><div><div class="k">Exact client assignment</div>${choices ? `<form class="assign" method="post" action="/admin/connections/${esc(c.id)}/accounts">${csrfField(req)}${choices}<p class="quiet">${c.provider === "meta" ? "Choose at most one Instagram profile and one matching ad account. Ads are skipped unless their exact account is selected." : "Choose exactly one native account for this client workspace."}</p><button type="submit">Save account assignment</button></form>` : `<p class="quiet">No native accounts were discovered. Reconnect this provider after confirming the app permissions.</p>`}</div></div>`;
  }).join("");
  const clientOptions = [...new Set(connections.map(c => c.clientRef))].map(c => `<option>${esc(c)}</option>`).join("");
  const storageWarning = store.durable ? "" : `<div class="banner"><b>Local storage mode.</b> No <code>DATABASE_URL</code> is configured, so connections live in a file on this server and are lost if it is redeployed or restarted. Fine for finishing setup and testing a real sign-in; add a persistent Postgres database before connecting live client accounts.</div>`;
  const missing = providerNames.filter(p => !configured.includes(p));
  const providerWarning = missing.length ? `<div class="banner">${esc(missing.map(m => m[0].toUpperCase() + m.slice(1)).join(" and "))} ${missing.length === 1 ? "is" : "are"} not configured yet. Add the app ID and secret in this service's environment settings, then reload this page. The callback URL to register is <code>${esc(publicBase)}/oauth/PROVIDER/callback</code>.</div>` : "";
  res.send(layout("Connections", `${setupBanner()}${storageWarning}${providerWarning}<h1>Connect once. Refresh automatically.</h1><p>Choose a platform, sign in on its own website, and approve read-only analytics access. Refreshable authorization is encrypted on this server so routine reports do not require another sign-in.</p>
  ${requestedClient ? `<div class="card"><div class="k">Connecting for</div><h2>${esc(requestedClient)}</h2><p class="quiet">Select each platform this client uses. You will return here after every approval.</p></div>` : ""}
  <div class="grid">${providerNames.map(p => {
    const ready = configured.includes(p);
    return `<div class="card provider${ready ? "" : " off"}"><div class="k">${esc(p)}</div><h2>Connect ${esc(p[0].toUpperCase() + p.slice(1))}</h2>${ready ? `<form method="get" action="/admin/connect/${p}">${requestedClient ? `<input type="hidden" name="client_ref" value="${esc(requestedClient)}">` : `<label>Client reference</label><input name="client_ref" placeholder="Client display name" required>`}<p><button type="submit">Continue to ${esc(p)}</button></p></form>` : `<p class="quiet">Waiting on the CNO-owned ${esc(p)} app ID and secret.</p>`}</div>`;
  }).join("")}</div>
  <div><h2>Connected accounts</h2><p class="quiet">Each client is an isolated workspace. A connection cannot refresh until its exact native profile is assigned below.</p>${connections.length ? connectionCards : `<div class="card"><p>No platforms connected yet.</p></div>`}</div>
  <div class="card"><h2>Refresh and open the report</h2><p>Use these controls for an immediate refresh or to open the latest stored data. CNO Reports can also run both steps itself once this service is reachable from the report window.</p><div class="row"><form method="post" action="/admin/sync">${csrfField(req)}<label>Client</label><select name="client_ref" required>${clientOptions}</select><label>From</label><input type="date" name="from" value="${daysAgo(90)}"><label>To</label><input type="date" name="to" value="${day(Date.now())}"><p><button class="solid" type="submit">Sync now</button></p></form><form method="post" action="/admin/import-link">${csrfField(req)}<label>Client</label><select name="client_ref" required>${clientOptions}</select><p><button type="submit">Open latest in CNO Reports</button></p></form></div></div>
  <p><a class="btn" href="/admin/reports">Manage client report links</a> <a class="btn" href="/admin/logout">Sign out</a></p>`));
});

app.post("/admin/login", async (req, res) => {
  const configured = process.env.CNO_ADMIN_TOKEN || "";
  if (!throttleLogin(req)) return res.status(429).send(layout("Too many attempts", `<div class="card"><h1>Too many attempts</h1><p>Wait fifteen minutes before trying again.</p></div>`));
  if (!configured) return res.status(500).send(layout("Not configured", `<div class="card"><h1>No access token is configured</h1><p>Set <code>CNO_ADMIN_TOKEN</code> in this service's environment settings, then reload.</p></div>`));
  if (!safeEqual(req.body.token || "", configured)) return res.status(401).send(layout("Access denied", `<div class="card"><h1>Access denied</h1><p>The internal token did not match.</p><a class="btn" href="/admin">Try again</a></div>`));
  await createSession(res);
  res.redirect("/admin");
});

app.get("/admin/logout", async (req, res) => {
  const token = cookies(req).cno_sync_session;
  if (token) await store.deleteSession(hash(token)).catch(() => {});
  res.clearCookie("cno_sync_session", { path: "/" });
  res.redirect("/admin");
});

app.get("/admin/connect/:provider", requireAdmin, async (req, res) => {
  const provider = req.params.provider;
  const clientRef = clientRefOf(req.query.client_ref);
  if (!providerNames.includes(provider) || !clientRef) return res.status(400).send(layout("Invalid connection", `<div class="card"><h1>Missing provider or client</h1><a class="btn" href="/admin">Return</a></div>`));
  if (!configuredProviders().includes(provider)) {
    return res.status(400).send(layout("Provider not configured", `<div class="card"><h1>${esc(provider)} is not set up yet</h1><p>Add this provider's app ID and secret to the service environment, and register <code>${esc(publicBase)}/oauth/${esc(provider)}/callback</code> as its redirect URL.</p><a class="btn" href="/admin">Return</a></div>`));
  }
  const state = randomToken();
  await store.createOauthState(hash(state), provider, clientRef, 600);
  let url;
  try { url = buildAuthorizationUrl(provider, state); }
  catch (error) { return res.status(400).send(layout("Provider not configured", `<div class="card"><h1>${esc(provider)} is not set up yet</h1><p class="error">${esc(error.message)}</p><a class="btn" href="/admin">Return</a></div>`)); }
  res.redirect(url);
});

app.get("/oauth/:provider/callback", async (req, res) => {
  const provider = req.params.provider;
  const state = String(req.query.state || "");
  const code = String(req.query.code || "");
  try {
    if (!providerNames.includes(provider) || !state || !code) throw new Error(String(req.query.error_description || req.query.error || "Authorization was cancelled or incomplete"));
    const record = await store.consumeOauthState(hash(state));
    if (!record || record.provider !== provider) throw new Error("The authorization link expired or was already used");

    const token = normalizeToken(provider, await exchangeCode(provider, code));
    let accounts = [], discoveryError = null;
    try { accounts = await discoverAccounts(provider, token.accessToken); } catch (error) { discoveryError = `Account discovery failed: ${error.message}`; }
    await store.upsertConnection({
      id: crypto.randomUUID(),
      clientRef: record.clientRef,
      provider,
      accessToken: encrypt(token.accessToken),
      refreshToken: encrypt(token.refreshToken),
      tokenExpiresAt: token.expiresAt,
      scopes: token.scopes,
      metadata: { accounts, selected_account_ids: accounts.length === 1 ? [String(accounts[0].id)] : [], discovery_error: discoveryError }
    });
    const next = `/admin?client_ref=${encodeURIComponent(record.clientRef)}`;
    const assignmentNote = accounts.length > 1
      ? "Authorization is complete. One last step is required: choose the exact social and, when applicable, ad account that belongs to this client."
      : accounts.length === 1
        ? `${accounts[0].name || "The account"} was assigned automatically because it was the only account returned.`
        /* Say what actually failed. The generic wording sent people to re-check permissions that
           were never the problem, while the real reason sat unread in the stored metadata. */
        : discoveryError
          ? `No account could be read back. ${discoveryError}`
          : "The provider returned no account to assign. Check the approved permissions and reconnect.";
    res.send(layout("Connected", `<div class="card"><div class="status">Connected securely</div><h1>${esc(provider)} is connected</h1><p>The token is encrypted in server storage and will not be returned to this browser.</p><p>${esc(assignmentNote)}</p><a class="btn solid" href="${esc(next)}">Review account assignment</a></div>`));
  } catch (error) {
    res.status(400).send(layout("Connection failed", `<div class="card"><h1>Connection failed</h1><p class="error">${esc(error.message)}</p><a class="btn" href="/admin">Return</a></div>`));
  }
});

app.post("/admin/connections/:id/accounts", requireAdmin, requireSameSite, async (req, res) => {
  const connection = await store.getConnection(req.params.id);
  if (!connection) return res.status(404).send(layout("Connection not found", `<div class="card"><h1>Connection not found</h1><a class="btn" href="/admin">Return</a></div>`));
  const metadata = connection.metadata || {};
  const accounts = Array.isArray(metadata.accounts) ? metadata.accounts : [];
  const submitted = Array.isArray(req.body.account_id) ? req.body.account_id : (req.body.account_id ? [req.body.account_id] : []);
  const requested = [...new Set(submitted.map(String))];
  const byId = new Map(accounts.map(account => [String(account.id), account]));
  const selected = requested.map(id => byId.get(id)).filter(Boolean);
  try {
    if (!selected.length || selected.length !== requested.length) throw new Error("Choose a valid account before saving");
    if (connection.provider !== "meta" && selected.length !== 1) throw new Error("Choose exactly one account for this provider");
    if (connection.provider === "meta") {
      if (selected.filter(a => a.kind === "instagram").length > 1 || selected.filter(a => a.kind === "ad_account").length > 1) throw new Error("Choose at most one Meta social profile and one ad account");
    }
    await store.saveAccountAssignment(connection.id, { ...metadata, selected_account_ids: selected.map(a => String(a.id)), discovery_error: null });
    res.redirect(`/admin?client_ref=${encodeURIComponent(connection.clientRef)}`);
  } catch (error) {
    res.status(400).send(layout("Assignment not saved", `<div class="card"><h1>Assignment not saved</h1><p class="error">${esc(error.message)}</p><a class="btn" href="/admin?client_ref=${encodeURIComponent(connection.clientRef)}">Return</a></div>`));
  }
});

/* Two steps on purpose. The content security policy blocks inline scripts, so an in-page
   confirm() dialog would silently not appear and a single click would drop a live connection. */
app.get("/admin/connections/:id/disconnect", requireAdmin, async (req, res) => {
  const connection = await store.getConnection(req.params.id);
  if (!connection) return res.redirect("/admin");
  res.send(layout("Disconnect", `<div class="card" style="max-width:560px;margin:50px auto"><h1>Disconnect ${esc(connection.provider)}?</h1><p>This removes CNO's stored authorization for <b>${esc(connection.clientRef)}</b> and deletes the analytics already pulled from it. Reports already shared with the client are unaffected. Reconnecting requires the client to sign in again.</p><form method="post" action="/admin/connections/${esc(connection.id)}/disconnect">${csrfField(req)}<button class="solid" type="submit">Yes, disconnect</button> <a class="btn" href="/admin?client_ref=${encodeURIComponent(connection.clientRef)}">Keep it connected</a></form></div>`));
});

app.post("/admin/connections/:id/disconnect", requireAdmin, requireSameSite, async (req, res) => {
  const connection = await store.getConnection(req.params.id);
  if (!connection) return res.redirect("/admin");
  await store.deleteConnection(connection.id);
  res.redirect(`/admin?client_ref=${encodeURIComponent(connection.clientRef)}`);
});

/* ---- syncing -------------------------------------------------------------- */

async function syncClient(clientRef, from, to) {
  const connections = await store.connectionsForClient(clientRef);
  if (!connections.length) throw new Error("No platforms are connected for this client");
  const results = [];
  for (const connection of connections) {
    try {
      const metadata = connection.metadata || {};
      const accounts = Array.isArray(metadata.accounts) ? metadata.accounts : [];
      const selectedIds = Array.isArray(metadata.selected_account_ids) ? metadata.selected_account_ids.map(String) : [];
      if (!accounts.length) throw new Error("No native account was discovered; reconnect this provider");
      if (accounts.length > 1 && !selectedIds.length) throw new Error("Choose the exact native account assigned to this client before syncing");
      let accessToken = decrypt(connection.accessToken);
      const refreshToken = decrypt(connection.refreshToken);
      const expiresAt = connection.tokenExpiresAt ? new Date(connection.tokenExpiresAt).getTime() : null;
      if (expiresAt && expiresAt <= Date.now() + 24 * 3600 * 1000) {
        const refreshed = normalizeToken(connection.provider, await refreshAccessToken(connection.provider, refreshToken, accessToken));
        accessToken = refreshed.accessToken;
        await store.saveRefreshedToken(connection.id, {
          accessToken: encrypt(refreshed.accessToken),
          refreshToken: encrypt(refreshed.refreshToken || refreshToken),
          tokenExpiresAt: refreshed.expiresAt,
          scopes: refreshed.scopes || connection.scopes
        });
      }
      const rows = await syncProvider(connection.provider, accessToken, clientRef, from, to, metadata);
      await store.putSyncRun({ id: crypto.randomUUID(), connectionId: connection.id, clientRef, provider: connection.provider, from, to, rows });
      await store.markSynced(connection.id);
      results.push({ provider: connection.provider, rows: rows.length, ok: true });
    } catch (error) {
      await store.markError(connection.id, String(error.message).slice(0, 300));
      results.push({ provider: connection.provider, rows: 0, ok: false, error: String(error.message).slice(0, 300) });
    }
  }
  return results;
}

async function latestRows(clientRef) {
  return (await store.latestRuns(clientRef)).flatMap(run => (Array.isArray(run.rows) ? run.rows : []));
}

app.post("/admin/sync", requireAdmin, requireSameSite, async (req, res) => {
  const clientRef = clientRefOf(req.body.client_ref);
  const from = String(req.body.from || daysAgo(90)).slice(0, 10);
  const to = String(req.body.to || day(Date.now())).slice(0, 10);
  try {
    const results = await syncClient(clientRef, from, to);
    const failed = results.some(result => !result.ok);
    res.status(failed ? 502 : 200).send(layout(failed ? "Sync needs attention" : "Sync complete", `<div class="card"><h1>${failed ? "Sync needs attention" : "Sync complete"}</h1>${results.map(x => `<p><b>${esc(x.provider)}</b>: ${x.ok ? `${x.rows} normalized rows` : `<span class="error">${esc(x.error)}</span>`}</p>`).join("")}<a class="btn solid" href="/admin">Return</a></div>`));
  } catch (error) { res.status(400).send(layout("Sync failed", `<div class="card"><h1>Sync failed</h1><p class="error">${esc(error.message)}</p><a class="btn" href="/admin">Return</a></div>`)); }
});

app.post("/admin/import-link", requireAdmin, requireSameSite, async (req, res) => {
  const clientRef = clientRefOf(req.body.client_ref);
  const rows = await latestRows(clientRef);
  if (!rows.length) return res.status(400).send(layout("No synced data", `<div class="card"><h1>No synced data yet</h1><p>Run a sync for ${esc(clientRef)} first.</p><a class="btn" href="/admin">Return</a></div>`));
  const token = randomToken();
  await store.createImportToken(hash(token), clientRef, 600);
  const reportUrl = `${primaryOrigin}/#sync=${encodeURIComponent(`${publicBase}/v1/import/${token}`)}`;
  res.send(layout("Import link", `<div class="card"><div class="status">Single use · expires in 10 minutes</div><h1>Latest data is ready</h1><p>This link transfers normalized analytics into CNO Reports. It contains no platform password or OAuth token.</p><p class="linkbox">${esc(reportUrl)}</p><a class="btn solid" href="${esc(reportUrl)}">Open latest report</a></div>`));
});

app.get("/v1/import/:token", async (req, res) => {
  const clientRef = await store.consumeImportToken(hash(String(req.params.token || "")));
  if (!clientRef) return res.status(404).json({ error: "This import link expired or was already used" });
  res.setHeader("Cache-Control", "no-store");
  res.json({ client: clientRef, rows: await latestRows(clientRef) });
});

/* ---- endpoints the report app calls directly ------------------------------ */

app.get("/v1/connections", requireJsonSameSite, requireAdmin, async (_req, res) => {
  const connections = await store.listConnections();
  res.setHeader("Cache-Control", "no-store");
  res.json({
    clients: [...new Set(connections.map(c => c.clientRef))],
    connections: connections.map(c => {
      const info = connectionStatus(c);
      return {
        id: c.id,
        client_ref: c.clientRef,
        provider: c.provider,
        state: info.state,
        detail: info.detail,
        accounts: info.accounts.map(a => ({ id: String(a.id), name: a.name || String(a.id), kind: a.kind || "account" })),
        selected: info.selected.map(a => a.name || String(a.id)),
        last_synced_at: c.lastSyncedAt || null,
        last_error: c.lastError || null
      };
    })
  });
});

app.post("/v1/sync", requireJsonSameSite, requireAdmin, async (req, res) => {
  const clientRef = clientRefOf(req.body.client_ref);
  const from = String(req.body.from || daysAgo(90)).slice(0, 10);
  const to = String(req.body.to || day(Date.now())).slice(0, 10);
  if (!clientRef) return res.status(400).json({ error: "Choose a client first" });
  res.setHeader("Cache-Control", "no-store");
  try {
    const results = await syncClient(clientRef, from, to);
    res.status(results.some(r => !r.ok) ? 502 : 200).json({ client: clientRef, from, to, results });
  } catch (error) { res.status(400).json({ error: String(error.message).slice(0, 300) }); }
});

/* Same normalized rows as the one-use import link, but for the signed-in staff window itself. */
app.get("/v1/rows", requireJsonSameSite, requireAdmin, async (req, res) => {
  const clientRef = clientRefOf(req.query.client_ref);
  if (!clientRef) return res.status(400).json({ error: "Choose a client first" });
  const runs = await store.latestRuns(clientRef);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    client: clientRef,
    rows: runs.flatMap(run => (Array.isArray(run.rows) ? run.rows : [])),
    sources: runs.map(run => ({ provider: run.provider, from: day(run.from), to: day(run.to), rows: (run.rows || []).length, synced_at: run.createdAt }))
  });
});

app.post("/v1/cron/sync", async (req, res) => {
  const configured = process.env.SYNC_CRON_SECRET || "";
  if (!configured || !safeEqual(req.headers["x-cron-secret"] || "", configured)) return res.sendStatus(401);
  const clients = await store.clientRefs();
  const output = [];
  for (const clientRef of clients) output.push({ client: clientRef, results: await syncClient(clientRef, daysAgo(90), day(Date.now())) });
  const failed = output.some(client => client.results.some(result => !result.ok));
  res.status(failed ? 502 : 200).json({ ok: !failed, clients: output });
});

app.use((error, req, res, _next) => {
  console.error(error);
  if (req.path.startsWith("/v1/")) return res.status(500).json({ error: "Internal service error" });
  res.status(500).send(layout("Something went wrong", `<div class="card"><h1>Something went wrong</h1><p>The action did not complete. Nothing was changed.</p><a class="btn" href="/admin">Return</a></div>`));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`CNO Native Sync listening on ${port} (storage: ${store.kind})`);
  console.log(`  console:  ${publicBase}/admin`);
  console.log(`  callback: ${publicBase}/oauth/<provider>/callback`);
  console.log(`  reports:  ${reportOrigins.join(", ")}`);
  const issues = setupIssues();
  if (issues.length) console.warn("\n  Setup still needed:\n" + issues.map(i => `    - ${i}`).join("\n") + "\n");
});
