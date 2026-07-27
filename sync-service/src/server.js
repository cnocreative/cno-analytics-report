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
app.use(express.json({ limit: "64kb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === reportOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
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
  :root{--ink:#2a1f18;--soft:#71675f;--cream:#fff8e7;--sand:#ece2cf;--terra:#db9b7f;--burnt:#996137;--sage:#888e6f}*{box-sizing:border-box}body{margin:0;background:#f8f3e8;color:var(--ink);font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;border-top:3px solid var(--ink)}main{max-width:1040px;margin:0 auto;padding:42px 24px 70px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:34px}.brand{font-family:Georgia,serif;font-size:27px}.k{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--burnt)}h1,h2,h3{font-family:Georgia,serif;font-weight:400}h1{font-size:42px;margin:.15em 0}p{color:var(--soft)}.card{background:#fff;border:1px solid var(--sand);padding:22px;margin:14px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.provider{border-top:4px solid var(--terra)}label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--soft);margin:12px 0 4px}input{width:100%;padding:11px;border:1px solid var(--sand);font:inherit}.btn,button{display:inline-block;border:1px solid var(--terra);background:#fff;color:var(--burnt);padding:10px 15px;text-decoration:none;text-transform:uppercase;letter-spacing:.08em;font-size:11px;cursor:pointer}.solid{background:var(--burnt);color:#fff;border-color:var(--burnt)}.row{display:flex;gap:9px;flex-wrap:wrap;align-items:end}.row>*{flex:1}.status{font-size:11px;padding:4px 8px;background:var(--cream);color:var(--sage);display:inline-block}.error{color:#9a3e2b}.quiet{font-size:12px;color:var(--soft)}table{width:100%;border-collapse:collapse;background:#fff}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--sand);font-size:12px}th{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}code{background:var(--cream);padding:2px 5px}.linkbox{overflow-wrap:anywhere;background:var(--cream);padding:14px;border:1px solid var(--sand)}@media(max-width:760px){.grid{grid-template-columns:1fr}h1{font-size:34px}}
  </style></head><body><main><header><div><div class="k">CNO Creative Co · Internal only</div><div class="brand">Native Analytics Sync</div></div><a class="btn" href="${esc(reportOrigin)}">Open reports</a></header>${body}</main></body></html>`;
}

async function createSession(res) {
  const token = randomToken();
  await q("INSERT INTO admin_sessions(session_hash,expires_at) VALUES($1,NOW()+INTERVAL '30 days')", [hash(token)]);
  res.cookie("cno_sync_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 24 * 3600 * 1000, path: "/" });
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

app.get("/health", (_req, res) => res.json({ ok: true, service: "cno-native-sync", version: "0.4.0" }));
app.get("/", (_req, res) => res.redirect("/admin"));
app.get("/admin", requireAdmin, async (req, res) => {
  const requestedClient = String(req.query.client_ref || "").trim().slice(0, 120);
  const connections = (await q("SELECT id,client_ref,provider,metadata,last_synced_at,last_error,token_expires_at FROM connections ORDER BY client_ref,provider")).rows;
  const rows = connections.map(c => `<tr><td>${esc(c.client_ref)}</td><td>${esc(c.provider)}</td><td>${esc((c.metadata?.accounts || []).map(x => x.name).join(", ") || "Connected")}</td><td>${c.last_synced_at ? esc(day(c.last_synced_at)) : "Not yet"}</td><td class="${c.last_error ? "error" : ""}">${esc(c.last_error || "Ready")}</td></tr>`).join("");
  const clients = [...new Set(connections.map(c => c.client_ref))];
  const clientOptions = clients.map(c => `<option>${esc(c)}</option>`).join("");
  res.send(layout("Connections", `<h1>Connect once. Refresh automatically.</h1><p>Choose a platform, sign in on its own website, and approve read-only analytics access. Refreshable authorization is encrypted on this server so routine reports do not require another sign-in.</p>
  ${requestedClient ? `<div class="card"><div class="k">Connecting for</div><h2>${esc(requestedClient)}</h2><p class="quiet">Select each platform this client uses. You will return here after every approval.</p></div>` : ""}
  <div class="grid">${providerNames.map(p => `<div class="card provider"><div class="k">${esc(p)}</div><h2>Connect ${esc(p[0].toUpperCase() + p.slice(1))}</h2><form method="get" action="/admin/connect/${p}">${requestedClient ? `<input type="hidden" name="client_ref" value="${esc(requestedClient)}">` : `<label>Client reference</label><input name="client_ref" placeholder="Client display name" required>`}<p><button type="submit">Continue to ${esc(p)}</button></p></form></div>`).join("")}</div>
  <div class="card"><h2>Connected accounts</h2>${connections.length ? `<table><thead><tr><th>Client</th><th>Provider</th><th>Account</th><th>Last sync</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>` : `<p>No platforms connected yet.</p>`}</div>
  <div class="card"><h2>Refresh and open the report</h2><p>Scheduled refreshes collect data automatically. Use these controls for an immediate refresh or to open the latest stored data in the reporting dashboard.</p><div class="row"><form method="post" action="/admin/sync"><label>Client</label><select name="client_ref" required>${clientOptions}</select><label>From</label><input type="date" name="from" value="${daysAgo(90)}"><label>To</label><input type="date" name="to" value="${day(Date.now())}"><p><button class="solid" type="submit">Sync now</button></p></form><form method="post" action="/admin/import-link"><label>Client</label><select name="client_ref" required>${clientOptions}</select><p><button type="submit">Open latest in CNO Reports</button></p></form></div></div>
  <p><a class="btn" href="/admin/logout">Sign out</a></p>`));
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
    let accounts = [];
    try { accounts = await discoverAccounts(provider, token.accessToken); } catch (error) { accounts = [{ id: "pending", name: `Connected; account discovery pending (${error.message})` }]; }
    const id = crypto.randomUUID();
    await q(`INSERT INTO connections(id,client_ref,provider,access_token_cipher,refresh_token_cipher,token_expires_at,scopes,metadata)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT(client_ref,provider) DO UPDATE SET access_token_cipher=EXCLUDED.access_token_cipher,refresh_token_cipher=EXCLUDED.refresh_token_cipher,token_expires_at=EXCLUDED.token_expires_at,scopes=EXCLUDED.scopes,metadata=EXCLUDED.metadata,last_error=NULL,updated_at=NOW()`,
      [id, record.client_ref, provider, encrypt(token.accessToken), encrypt(token.refreshToken), token.expiresAt, token.scopes, JSON.stringify({ accounts })]);
    res.send(layout("Connected", `<div class="card"><div class="status">Connected securely</div><h1>${esc(provider)} is connected</h1><p>The token is encrypted in server storage and will not be returned to this browser.</p><a class="btn solid" href="/admin">Return to connections</a></div>`));
  } catch (error) {
    res.status(400).send(layout("Connection failed", `<div class="card"><h1>Connection failed</h1><p class="error">${esc(error.message)}</p><a class="btn" href="/admin">Return</a></div>`));
  }
});

async function syncClient(clientRef, from, to) {
  const connections = (await q("SELECT * FROM connections WHERE client_ref=$1 ORDER BY provider", [clientRef])).rows;
  if (!connections.length) throw new Error("No platforms are connected for this client");
  const results = [];
  for (const connection of connections) {
    try {
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
    res.send(layout("Sync complete", `<div class="card"><h1>Sync complete</h1>${results.map(x => `<p><b>${esc(x.provider)}</b>: ${x.ok ? `${x.rows} normalized rows` : `<span class="error">${esc(x.error)}</span>`}</p>`).join("")}<a class="btn solid" href="/admin">Return</a></div>`));
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
  res.json({ ok: true, clients: output });
});

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: "Internal service error" }); });

await initDb();
app.listen(port, "0.0.0.0", () => console.log(`CNO Native Sync listening on ${port}`));
