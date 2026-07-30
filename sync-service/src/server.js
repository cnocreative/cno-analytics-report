import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import { initDb, pool, q } from "./db.js";
import { decrypt, encrypt, hash, randomToken, safeEqual } from "./crypto.js";
import { buildAuthorizationUrl, discoverAccounts, exchangeCode, normalizeToken, providerNames, refreshAccessToken, syncProvider } from "./providers.js";

const app = express();
const port = Number(process.env.PORT || 10000);
const reportOrigin = String(process.env.REPORT_ORIGIN || "http://localhost:8777").replace(/\/$/, "");
const publicBase = String(process.env.PUBLIC_BASE_URL || (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : `http://localhost:${port}`)).replace(/\/$/, "");

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", "data:"], formAction: ["'self'"], frameAncestors: ["'none'"] } } }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === reportOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") return res.sendStatus(origin === reportOrigin ? 204 : 403);
  next();
});

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const day = date => new Date(date).toISOString().slice(0, 10);
const daysAgo = count => day(Date.now() - count * 86400000);
const cookies = req => Object.fromEntries(String(req.headers.cookie || "").split(";").map(x => x.trim().split(/=(.*)/s)).filter(x => x[0]).map(([k, v]) => [decodeURIComponent(k), decodeURIComponent(v || "")]));

function layout(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · CNO Native Sync</title><style>
  :root{--ink:#2a1f18;--soft:#71675f;--cream:#fff8e7;--sand:#ece2cf;--terra:#db9b7f;--burnt:#996137;--sage:#888e6f}*{box-sizing:border-box}body{margin:0;background:#f8f3e8;color:var(--ink);font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;border-top:3px solid var(--ink)}main{max-width:1040px;margin:0 auto;padding:42px 24px 70px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:34px}.brand{font-family:Georgia,serif;font-size:27px}.k{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--burnt)}h1,h2,h3{font-family:Georgia,serif;font-weight:400}h1{font-size:42px;margin:.15em 0}p{color:var(--soft)}.card{background:#fff;border:1px solid var(--sand);padding:22px;margin:14px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.provider{border-top:4px solid var(--terra)}label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--soft);margin:12px 0 4px}input,select{width:100%;padding:11px;border:1px solid var(--sand);font:inherit;background:#fff}.btn,button{display:inline-block;border:1px solid var(--terra);background:#fff;color:var(--burnt);padding:10px 15px;text-decoration:none;text-transform:uppercase;letter-spacing:.08em;font-size:11px;cursor:pointer}.solid{background:var(--burnt);color:#fff;border-color:var(--burnt)}.row{display:flex;gap:9px;flex-wrap:wrap;align-items:end}.row>*{flex:1}.status{font-size:11px;padding:4px 8px;background:var(--cream);color:var(--sage);display:inline-block}.status.choose{color:var(--burnt);background:#fff1e9}.error{color:#9a3e2b}.quiet{font-size:12px;color:var(--soft)}table{width:100%;border-collapse:collapse;background:#fff}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--sand);font-size:12px}th{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}code{background:var(--cream);padding:2px 5px}.linkbox{overflow-wrap:anywhere;background:var(--cream);padding:14px;border:1px solid var(--sand)}.assign{border-top:1px solid var(--sand);margin-top:14px;padding-top:12px}.choice{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid #f2eadb;text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink);margin:0}.choice input{width:auto;margin:0}.kind{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}.connection{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(320px,1.5fr);gap:22px}.connection h3{font-size:24px;margin:3px 0}.selected{color:var(--ink);font-weight:600}@media(max-width:760px){.grid{grid-template-columns:1fr}.connection{grid-template-columns:1fr}h1{font-size:34px}}
  </style></head><body><main><header><div><div class="k">CNO Creative Co · Internal only</div><div class="brand">Native Analytics Sync</div></div><a class="btn" href="${esc(reportOrigin)}">Open reports</a></header>${body}</main></body></html>`;
}

async function createSession(res) {
  const token = randomToken();
  await q("INSERT INTO admin_sessions(session_hash,expires_at) VALUES($1,NOW()+INTERVAL '30 days')", [hash(token)]);
  const production = process.env.NODE_ENV === "production";
  res.cookie("cno_sync_session", token, { httpOnly: true, secure: production, sameSite: production ? "none" : "lax", maxAge: 30 * 24 * 3600 * 1000, path: "/" });
}

async function isAdmin(req) {
  const token = cookies(req).cno_sync_session;
  if (!token) return false;
  const found = await q("SELECT 1 FROM admin_sessions WHERE session_hash=$1 AND expires_at>NOW()", [hash(token)]);
  return found.rowCount === 1;
}

async function requireAdmin(req, res, next) {
  try { if (await isAdmin(req)) return next(); } catch { /* show login */ }
  res.status(401).send(layout("Sign in", `<div class="card" style="max-width:520px;margin:50px auto"><h1>Private CNO access</h1><p>Enter the internal access token. Platform passwords and OAuth tokens are never shown here.</p><form method="post" action="/admin/login"><label>Internal access token</label><input type="password" name="token" autocomplete="current-password" required><p><button class="solid" type="submit">Sign in</button></p></form></div>`));
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "cno-native-sync", version: "0.6.0" }));
app.get("/", (_req, res) => res.redirect("/admin"));

app.post("/v1/reports", requireAdmin, async (req, res) => {
  const payload = String(req.body.payload || "");
  const clientRef = String(req.body.client_ref || "Client").trim().slice(0, 120) || "Client";
  if (payload.length < 40 || payload.length > 1_500_000 || !/^[A-Za-z0-9_.-]+$/.test(payload)) {
    return res.status(400).json({ error: "The report payload is invalid or too large" });
  }
  const id = randomToken(18);
  await q("INSERT INTO report_shares(id_hash,client_ref,payload_cipher,password_encrypted,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '365 days')",
    [hash(id), clientRef, encrypt(payload), !!req.body.encrypted]);
  res.setHeader("Cache-Control", "no-store");
  res.status(201).json({ id, expires_in_days: 365 });
});

app.get("/v1/reports/:id", async (req, res) => {
  const id = String(req.params.id || "");
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) return res.status(404).json({ error: "Report not found" });
  const found = await q("SELECT payload_cipher,password_encrypted FROM report_shares WHERE id_hash=$1 AND revoked_at IS NULL AND expires_at>NOW()", [hash(id)]);
  if (!found.rowCount) return res.status(404).json({ error: "This report link expired, was revoked, or does not exist" });
  await q("UPDATE report_shares SET last_opened_at=NOW() WHERE id_hash=$1", [hash(id)]);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.json({ payload: decrypt(found.rows[0].payload_cipher), encrypted: !!found.rows[0].password_encrypted });
});

app.get("/admin/reports", requireAdmin, async (_req, res) => {
  const shares = (await q("SELECT id_hash,client_ref,password_encrypted,created_at,expires_at,last_opened_at,revoked_at FROM report_shares ORDER BY created_at DESC LIMIT 250")).rows;
  const rows = shares.map(s => `<tr><td>${esc(s.client_ref)}</td><td>${esc(day(s.created_at))}</td><td>${s.password_encrypted ? "Password protected" : "View only"}</td><td>${s.last_opened_at ? esc(day(s.last_opened_at)) : "Not opened"}</td><td>${s.revoked_at ? "Revoked" : esc(day(s.expires_at))}</td><td>${s.revoked_at ? "" : `<form method="post" action="/admin/reports/${esc(s.id_hash)}/revoke"><button type="submit">Revoke</button></form>`}</td></tr>`).join("");
  res.send(layout("Client report links", `<h1>Saved client links</h1><p>Every link is random, client-specific, revocable, and automatically expires. Revoking a link does not delete the underlying source CSVs.</p><div class="card">${shares.length ? `<table><thead><tr><th>Client</th><th>Created</th><th>Protection</th><th>Last opened</th><th>Expires</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : "<p>No saved report links yet.</p>"}</div><a class="btn" href="/admin">Back to connections</a>`));
});

app.post("/admin/reports/:hash/revoke", requireAdmin, async (req, res) => {
  if (!/^[a-f0-9]{64}$/.test(req.params.hash || "")) return res.sendStatus(404);
  await q("UPDATE report_shares SET revoked_at=NOW() WHERE id_hash=$1", [req.params.hash]);
  res.redirect("/admin/reports");
});

app.get("/admin", requireAdmin, async (req, res) => {
  const requestedClient = String(req.query.client_ref || "").trim().slice(0, 120);
  const connections = (await q("SELECT id,client_ref,provider,metadata,last_synced_at,last_error,token_expires_at FROM connections ORDER BY client_ref,provider")).rows;
  const connectionCards = connections.map(c => {
    const metadata = c.metadata || {};
    const accounts = Array.isArray(metadata.accounts) ? metadata.accounts : [];
    const selectedIds = new Set((Array.isArray(metadata.selected_account_ids) ? metadata.selected_account_ids : (accounts.length === 1 ? [accounts[0].id] : [])).map(String));
    const selected = accounts.filter(account => selectedIds.has(String(account.id)));
    const needsChoice = accounts.length > 0 && !selected.length;
    const status = metadata.discovery_error
      ? `<span class="status choose">Reconnect needed</span><p class="error">${esc(metadata.discovery_error)}</p>`
      : needsChoice
        ? `<span class="status choose">Choose account</span><p class="quiet">Authorization succeeded. Assign only the native account(s) that belong to this client before any data can sync.</p>`
        : `<span class="status">Ready</span><p class="quiet">${c.last_synced_at ? `Last refreshed ${esc(day(c.last_synced_at))}.` : "Connected and ready for its first refresh."}</p>`;
    const choices = accounts.map(account => `<label class="choice"><input type="${c.provider === "meta" ? "checkbox" : "radio"}" name="account_id" value="${esc(account.id)}" ${selectedIds.has(String(account.id)) ? "checked" : ""}><span>${esc(account.name || account.id)}</span><span class="kind">${esc(String(account.kind || "account").replace("_", " "))}</span></label>`).join("");
    return `<div class="card connection"><div><div class="k">${esc(c.client_ref)} · ${esc(c.provider)}</div><h3>${selected.length ? esc(selected.map(x => x.name || x.id).join(" + ")) : "Account not assigned"}</h3>${status}${c.last_error ? `<p class="error">${esc(c.last_error)}</p>` : ""}</div><div><div class="k">Exact client assignment</div>${choices ? `<form class="assign" method="post" action="/admin/connections/${esc(c.id)}/accounts">${choices}<p class="quiet">${c.provider === "meta" ? "Choose at most one Instagram profile and one matching ad account. Ads are skipped unless their exact account is selected." : "Choose exactly one native account for this client workspace."}</p><button type="submit">Save account assignment</button></form>` : `<p class="quiet">No native accounts were discovered. Reconnect this provider after confirming the app permissions.</p>`}</div></div>`;
  }).join("");
  const clients = [...new Set(connections.map(c => c.client_ref))];
  const clientOptions = clients.map(c => `<option>${esc(c)}</option>`).join("");
  res.send(layout("Connections", `<h1>Connect once. Refresh automatically.</h1><p>Choose a platform, sign in on its own website, and approve read-only analytics access. Refreshable authorization is encrypted on this server so routine reports do not require another sign-in.</p>
  ${requestedClient ? `<div class="card"><div class="k">Connecting for</div><h2>${esc(requestedClient)}</h2><p class="quiet">Select each platform this client uses. You will return here after every approval.</p></div>` : ""}
  <div class="grid">${providerNames.map(p => `<div class="card provider"><div class="k">${esc(p)}</div><h2>Connect ${esc(p[0].toUpperCase() + p.slice(1))}</h2><form method="get" action="/admin/connect/${p}">${requestedClient ? `<input type="hidden" name="client_ref" value="${esc(requestedClient)}">` : `<label>Client reference</label><input name="client_ref" placeholder="Client display name" required>`}<p><button type="submit">Continue to ${esc(p)}</button></p></form></div>`).join("")}</div>
  <div><h2>Connected accounts</h2><p class="quiet">Each client is an isolated workspace. A connection cannot refresh until its exact native profile is assigned below.</p>${connections.length ? connectionCards : `<div class="card"><p>No platforms connected yet.</p></div>`}</div>
  <div class="card"><h2>Refresh and open the report</h2><p>Use these controls for an immediate refresh or to open the latest stored data. The protected cron endpoint is ready for the secured monthly scheduler in the next cloud phase.</p><div class="row"><form method="post" action="/admin/sync"><label>Client</label><select name="client_ref" required>${clientOptions}</select><label>From</label><input type="date" name="from" value="${daysAgo(90)}"><label>To</label><input type="date" name="to" value="${day(Date.now())}"><p><button class="solid" type="submit">Sync now</button></p></form><form method="post" action="/admin/import-link"><label>Client</label><select name="client_ref" required>${clientOptions}</select><p><button type="submit">Open latest in CNO Reports</button></p></form></div></div>
  <p><a class="btn" href="/admin/reports">Manage client report links</a> <a class="btn" href="/admin/logout">Sign out</a></p>`));
});

app.post("/admin/login", async (req, res) => {
  const configured = process.env.CNO_ADMIN_TOKEN || "";
  if (!configured || !safeEqual(req.body.token || "", configured)) return res.status(401).send(layout("Access denied", `<div class="card"><h1>Access denied</h1><p>The internal token did not match.</p><a class="btn" href="/admin">Try again</a></div>`));
  await createSession(res);
  res.redirect("/admin");
});

app.get("/admin/logout", async (req, res) => {
  const token = cookies(req).cno_sync_session;
  if (token) await q("DELETE FROM admin_sessions WHERE session_hash=$1", [hash(token)]).catch(() => {});
  res.clearCookie("cno_sync_session", { path: "/" });
  res.redirect("/admin");
});

app.get("/admin/connect/:provider", requireAdmin, async (req, res) => {
  const provider = req.params.provider;
  const clientRef = String(req.query.client_ref || "").trim().slice(0, 120);
  if (!providerNames.includes(provider) || !clientRef) return res.status(400).send(layout("Invalid connection", "<div class=\"card\"><h1>Missing provider or client</h1></div>"));
  const state = randomToken();
  await q("INSERT INTO oauth_states(state_hash,provider,client_ref,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes')", [hash(state), provider, clientRef]);
  res.redirect(buildAuthorizationUrl(provider, state));
});

app.get("/oauth/:provider/callback", async (req, res) => {
  const provider = req.params.provider;
  const state = String(req.query.state || "");
  const code = String(req.query.code || "");
  try {
    if (!providerNames.includes(provider) || !state || !code) throw new Error(String(req.query.error_description || req.query.error || "Authorization was cancelled or incomplete"));
    const client = await pool.connect();
    let record;
    try {
      await client.query("BEGIN");
      const found = await client.query("SELECT provider,client_ref FROM oauth_states WHERE state_hash=$1 AND expires_at>NOW() FOR UPDATE", [hash(state)]);
      if (!found.rowCount || found.rows[0].provider !== provider) throw new Error("The authorization link expired or was already used");
      record = found.rows[0];
      await client.query("DELETE FROM oauth_states WHERE state_hash=$1", [hash(state)]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }

    const rawToken = await exchangeCode(provider, code);
    const token = normalizeToken(provider, rawToken);
    let accounts = [], discoveryError = null;
    try { accounts = await discoverAccounts(provider, token.accessToken); } catch (error) { discoveryError = `Account discovery failed: ${error.message}`; }
    const selectedAccountIds = accounts.length === 1 ? [String(accounts[0].id)] : [];
    const id = crypto.randomUUID();
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const saved = await db.query(`INSERT INTO connections(id,client_ref,provider,access_token_cipher,refresh_token_cipher,token_expires_at,scopes,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(client_ref,provider) DO UPDATE SET access_token_cipher=EXCLUDED.access_token_cipher,refresh_token_cipher=EXCLUDED.refresh_token_cipher,token_expires_at=EXCLUDED.token_expires_at,scopes=EXCLUDED.scopes,metadata=EXCLUDED.metadata,last_synced_at=NULL,last_error=NULL,updated_at=NOW()
        RETURNING id`,
        [id, record.client_ref, provider, encrypt(token.accessToken), encrypt(token.refreshToken), token.expiresAt, token.scopes, JSON.stringify({ accounts, selected_account_ids: selectedAccountIds, discovery_error: discoveryError })]);
      await db.query("DELETE FROM sync_runs WHERE connection_id=$1", [saved.rows[0].id]);
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
    const next = `/admin?client_ref=${encodeURIComponent(record.client_ref)}`;
    const assignmentNote = accounts.length > 1
      ? "Authorization is complete. One last step is required: choose the exact social and, when applicable, ad account that belongs to this client."
      : accounts.length === 1
        ? `${accounts[0].name || "The account"} was assigned automatically because it was the only account returned.`
        : "The provider did not return an account to assign. Check the approved permissions and reconnect.";
    res.send(layout("Connected", `<div class="card"><div class="status">Connected securely</div><h1>${esc(provider)} is connected</h1><p>The token is encrypted in server storage and will not be returned to this browser.</p><p>${esc(assignmentNote)}</p><a class="btn solid" href="${esc(next)}">Review account assignment</a></div>`));
  } catch (error) {
    res.status(400).send(layout("Connection failed", `<div class="card"><h1>Connection failed</h1><p class="error">${esc(error.message)}</p><a class="btn" href="/admin">Return</a></div>`));
  }
});

app.post("/admin/connections/:id/accounts", requireAdmin, async (req, res) => {
  const found = await q("SELECT id,client_ref,provider,metadata FROM connections WHERE id=$1", [req.params.id]);
  if (!found.rowCount) return res.status(404).send(layout("Connection not found", `<div class="card"><h1>Connection not found</h1><a class="btn" href="/admin">Return</a></div>`));
  const connection = found.rows[0], metadata = connection.metadata || {};
  const accounts = Array.isArray(metadata.accounts) ? metadata.accounts : [];
  const submitted = Array.isArray(req.body.account_id) ? req.body.account_id : (req.body.account_id ? [req.body.account_id] : []);
  const requested = [...new Set(submitted.map(String))];
  const byId = new Map(accounts.map(account => [String(account.id), account]));
  const selected = requested.map(id => byId.get(id)).filter(Boolean);
  try {
    if (!selected.length || selected.length !== requested.length) throw new Error("Choose a valid account before saving");
    if (connection.provider !== "meta" && selected.length !== 1) throw new Error("Choose exactly one account for this provider");
    if (connection.provider === "meta") {
      const social = selected.filter(account => account.kind === "instagram");
      const ads = selected.filter(account => account.kind === "ad_account");
      if (social.length > 1 || ads.length > 1) throw new Error("Choose at most one Meta social profile and one ad account");
    }
    const updated = { ...metadata, selected_account_ids: selected.map(account => String(account.id)), discovery_error: null };
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await db.query("UPDATE connections SET metadata=$2,last_error=NULL,last_synced_at=NULL,updated_at=NOW() WHERE id=$1", [connection.id, JSON.stringify(updated)]);
      await db.query("DELETE FROM sync_runs WHERE connection_id=$1", [connection.id]);
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
    res.redirect(`/admin?client_ref=${encodeURIComponent(connection.client_ref)}`);
  } catch (error) {
    res.status(400).send(layout("Assignment not saved", `<div class="card"><h1>Assignment not saved</h1><p class="error">${esc(error.message)}</p><a class="btn" href="/admin?client_ref=${encodeURIComponent(connection.client_ref)}">Return</a></div>`));
  }
});

async function syncClient(clientRef, from, to) {
  const connections = (await q("SELECT * FROM connections WHERE client_ref=$1 ORDER BY provider", [clientRef])).rows;
  if (!connections.length) throw new Error("No platforms are connected for this client");
  const results = [];
  for (const connection of connections) {
    try {
      const metadata = connection.metadata || {};
      const accounts = Array.isArray(metadata.accounts) ? metadata.accounts : [];
      const selectedIds = Array.isArray(metadata.selected_account_ids) ? metadata.selected_account_ids.map(String) : [];
      if (!accounts.length) throw new Error("No native account was discovered; reconnect this provider");
      if (accounts.length > 1 && !selectedIds.length) throw new Error("Choose the exact native account assigned to this client before syncing");
      let accessToken = decrypt(connection.access_token_cipher);
      const refreshToken = decrypt(connection.refresh_token_cipher);
      const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : null;
      const refreshWindow = Date.now() + 24 * 3600 * 1000;
      if (expiresAt && expiresAt <= refreshWindow) {
        const refreshed = normalizeToken(connection.provider, await refreshAccessToken(connection.provider, refreshToken, accessToken));
        accessToken = refreshed.accessToken;
        await q(`UPDATE connections SET access_token_cipher=$2,refresh_token_cipher=$3,token_expires_at=$4,scopes=$5,last_error=NULL,updated_at=NOW() WHERE id=$1`,
          [connection.id, encrypt(refreshed.accessToken), encrypt(refreshed.refreshToken || refreshToken), refreshed.expiresAt, refreshed.scopes || connection.scopes]);
      }
      const rows = await syncProvider(connection.provider, accessToken, clientRef, from, to, connection.metadata || {});
      await q("INSERT INTO sync_runs(id,connection_id,client_ref,provider,date_from,date_to,rows) VALUES($1,$2,$3,$4,$5,$6,$7)", [crypto.randomUUID(), connection.id, clientRef, connection.provider, from, to, JSON.stringify(rows)]);
      await q("UPDATE connections SET last_synced_at=NOW(),last_error=NULL,updated_at=NOW() WHERE id=$1", [connection.id]);
      results.push({ provider: connection.provider, rows: rows.length, ok: true });
    } catch (error) {
      await q("UPDATE connections SET last_error=$2,updated_at=NOW() WHERE id=$1", [connection.id, String(error.message).slice(0, 300)]);
      results.push({ provider: connection.provider, rows: 0, ok: false, error: String(error.message).slice(0, 300) });
    }
  }
  return results;
}

async function latestRows(clientRef) {
  const runs = (await q("SELECT DISTINCT ON(connection_id) rows FROM sync_runs WHERE client_ref=$1 ORDER BY connection_id,created_at DESC", [clientRef])).rows;
  return runs.flatMap(x => Array.isArray(x.rows) ? x.rows : []);
}

app.post("/admin/sync", requireAdmin, async (req, res) => {
  const clientRef = String(req.body.client_ref || "").trim();
  const from = String(req.body.from || daysAgo(90));
  const to = String(req.body.to || day(Date.now()));
  try {
    const results = await syncClient(clientRef, from, to);
    const failed = results.some(result => !result.ok);
    res.status(failed ? 502 : 200).send(layout(failed ? "Sync needs attention" : "Sync complete", `<div class="card"><h1>${failed ? "Sync needs attention" : "Sync complete"}</h1>${results.map(x => `<p><b>${esc(x.provider)}</b>: ${x.ok ? `${x.rows} normalized rows` : `<span class="error">${esc(x.error)}</span>`}</p>`).join("")}<a class="btn solid" href="/admin">Return</a></div>`));
  } catch (error) { res.status(400).send(layout("Sync failed", `<div class="card"><h1>Sync failed</h1><p class="error">${esc(error.message)}</p><a class="btn" href="/admin">Return</a></div>`)); }
});

app.post("/admin/import-link", requireAdmin, async (req, res) => {
  const clientRef = String(req.body.client_ref || "").trim();
  const rows = await latestRows(clientRef);
  if (!rows.length) return res.status(400).send(layout("No synced data", `<div class="card"><h1>No synced data yet</h1><p>Run a sync for ${esc(clientRef)} first.</p><a class="btn" href="/admin">Return</a></div>`));
  const token = randomToken();
  await q("INSERT INTO import_tokens(token_hash,client_ref,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes')", [hash(token), clientRef]);
  const endpoint = `${publicBase}/v1/import/${token}`;
  const reportUrl = `${reportOrigin}/#sync=${encodeURIComponent(endpoint)}`;
  res.send(layout("Import link", `<div class="card"><div class="status">Single use · expires in 10 minutes</div><h1>Latest data is ready</h1><p>This link transfers normalized analytics into CNO Reports. It contains no platform password or OAuth token.</p><p class="linkbox">${esc(reportUrl)}</p><a class="btn solid" href="${esc(reportUrl)}">Open latest report</a></div>`));
});

app.get("/v1/import/:token", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT client_ref FROM import_tokens WHERE token_hash=$1 AND expires_at>NOW() AND consumed_at IS NULL FOR UPDATE", [hash(req.params.token)]);
    if (!found.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ error: "This import link expired or was already used" }); }
    await client.query("UPDATE import_tokens SET consumed_at=NOW() WHERE token_hash=$1", [hash(req.params.token)]);
    await client.query("COMMIT");
    const rows = await latestRows(found.rows[0].client_ref);
    res.setHeader("Cache-Control", "no-store");
    res.json({ client: found.rows[0].client_ref, rows });
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); res.status(500).json({ error: "Import failed" }); } finally { client.release(); }
});

app.post("/v1/cron/sync", async (req, res) => {
  const configured = process.env.SYNC_CRON_SECRET || "";
  if (!configured || !safeEqual(req.headers["x-cron-secret"] || "", configured)) return res.sendStatus(401);
  const clients = (await q("SELECT DISTINCT client_ref FROM connections ORDER BY client_ref")).rows.map(x => x.client_ref);
  const output = [];
  for (const clientRef of clients) output.push({ client: clientRef, results: await syncClient(clientRef, daysAgo(90), day(Date.now())) });
  const failed = output.some(client => client.results.some(result => !result.ok));
  res.status(failed ? 502 : 200).json({ ok: !failed, clients: output });
});

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: "Internal service error" }); });

await initDb();
app.listen(port, "0.0.0.0", () => console.log(`CNO Native Sync listening on ${port}`));
