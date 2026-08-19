/* Storage for the native connection service.
 *
 * Two interchangeable backends behind one small set of named operations:
 *
 *   - Postgres, used whenever DATABASE_URL is set. This is the production path.
 *   - A local JSON file, used when DATABASE_URL is absent. This exists so a CNO owner can deploy
 *     and finish a real browser connection without first provisioning a database, and so a
 *     developer can run the whole flow locally. It is NOT durable on a container filesystem that
 *     resets on redeploy, and the service says so loudly at boot.
 *
 * The service never writes raw SQL outside this file, so swapping the backend cannot change
 * behaviour anywhere else.
 */
import fs from "node:fs";
import path from "node:path";

const now = () => new Date();
const later = seconds => new Date(Date.now() + seconds * 1000);
const alive = value => value && new Date(value).getTime() > Date.now();

/* Postgres refuses JSON containing half a character or a NUL byte, and rejects the whole write
   with a message naming neither the field nor the provider. Social captions carry emoji, and an
   emoji cut in half by a length limit is exactly that. Clean strings on the way in so one caption
   cannot fail a whole month's sync, and so this cannot return through another provider or a field
   added later. */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const jsonText = value => JSON.stringify(value, (_key, item) =>
  typeof item === "string" ? item.replace(LONE_SURROGATE, "").replace(/\u0000/g, "") : item);

/* ------------------------------------------------------------------ Postgres */

async function postgresStore() {
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "") ? undefined : { rejectUnauthorized: false }
  });
  /* Passing a values array switches node-postgres to the extended protocol, which rejects the
     multi-statement schema below. Only send params when there actually are some. */
  const q = (text, params) => (params && params.length ? pool.query(text, params) : pool.query(text));
  const schema = fs.readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
  await q(schema);
  await q(`DELETE FROM oauth_states WHERE expires_at < NOW();
           DELETE FROM import_tokens WHERE expires_at < NOW();
           DELETE FROM admin_sessions WHERE expires_at < NOW();
           DELETE FROM report_shares WHERE expires_at < NOW();`);

  return {
    kind: "postgres",
    durable: true,

    async createSession(hash, days) {
      await q("INSERT INTO admin_sessions(session_hash,expires_at) VALUES($1,NOW()+($2||' days')::interval)", [hash, String(days)]);
    },
    async sessionExists(hash) {
      return (await q("SELECT 1 FROM admin_sessions WHERE session_hash=$1 AND expires_at>NOW()", [hash])).rowCount === 1;
    },
    async deleteSession(hash) {
      await q("DELETE FROM admin_sessions WHERE session_hash=$1", [hash]);
    },

    async createOauthState(hash, provider, clientRef, seconds) {
      await q("INSERT INTO oauth_states(state_hash,provider,client_ref,expires_at) VALUES($1,$2,$3,NOW()+($4||' seconds')::interval)", [hash, provider, clientRef, String(seconds)]);
    },
    async consumeOauthState(hash) {
      const found = await q("DELETE FROM oauth_states WHERE state_hash=$1 AND expires_at>NOW() RETURNING provider,client_ref", [hash]);
      return found.rowCount ? { provider: found.rows[0].provider, clientRef: found.rows[0].client_ref } : null;
    },

    async upsertConnection(row) {
      const saved = await q(`INSERT INTO connections(id,client_ref,provider,access_token_cipher,refresh_token_cipher,token_expires_at,scopes,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(client_ref,provider) DO UPDATE SET access_token_cipher=EXCLUDED.access_token_cipher,refresh_token_cipher=EXCLUDED.refresh_token_cipher,token_expires_at=EXCLUDED.token_expires_at,scopes=EXCLUDED.scopes,metadata=EXCLUDED.metadata,last_synced_at=NULL,last_error=NULL,updated_at=NOW()
        RETURNING id`,
        [row.id, row.clientRef, row.provider, row.accessToken, row.refreshToken, row.tokenExpiresAt, row.scopes, jsonText(row.metadata || {})]);
      const id = saved.rows[0].id;
      await q("DELETE FROM sync_runs WHERE connection_id=$1", [id]);
      return id;
    },
    async listConnections() {
      return (await q("SELECT * FROM connections ORDER BY client_ref,provider")).rows.map(normalizeConnection);
    },
    async connectionsForClient(clientRef) {
      return (await q("SELECT * FROM connections WHERE client_ref=$1 ORDER BY provider", [clientRef])).rows.map(normalizeConnection);
    },
    async getConnection(id) {
      const found = await q("SELECT * FROM connections WHERE id=$1", [id]);
      return found.rowCount ? normalizeConnection(found.rows[0]) : null;
    },
    async saveAccountAssignment(id, metadata) {
      await q("UPDATE connections SET metadata=$2,last_error=NULL,last_synced_at=NULL,updated_at=NOW() WHERE id=$1", [id, jsonText(metadata || {})]);
      await q("DELETE FROM sync_runs WHERE connection_id=$1", [id]);
    },
    async saveRefreshedToken(id, token) {
      await q("UPDATE connections SET access_token_cipher=$2,refresh_token_cipher=$3,token_expires_at=$4,scopes=$5,last_error=NULL,updated_at=NOW() WHERE id=$1",
        [id, token.accessToken, token.refreshToken, token.tokenExpiresAt, token.scopes]);
    },
    async markSynced(id) {
      await q("UPDATE connections SET last_synced_at=NOW(),last_error=NULL,updated_at=NOW() WHERE id=$1", [id]);
    },
    async markError(id, message) {
      await q("UPDATE connections SET last_error=$2,updated_at=NOW() WHERE id=$1", [id, message]);
    },
    async deleteConnection(id) {
      await q("DELETE FROM connections WHERE id=$1", [id]);
    },
    async clientRefs() {
      return (await q("SELECT DISTINCT client_ref FROM connections ORDER BY client_ref")).rows.map(r => r.client_ref);
    },

    async putSyncRun(run) {
      await q("DELETE FROM sync_runs WHERE connection_id=$1", [run.connectionId]);
      await q("INSERT INTO sync_runs(id,connection_id,client_ref,provider,date_from,date_to,rows) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [run.id, run.connectionId, run.clientRef, run.provider, run.from, run.to, jsonText(run.rows || [])]);
    },
    async latestRuns(clientRef) {
      return (await q("SELECT provider,date_from,date_to,rows,created_at FROM sync_runs WHERE client_ref=$1 ORDER BY created_at DESC", [clientRef])).rows
        .map(r => ({ provider: r.provider, from: r.date_from, to: r.date_to, rows: Array.isArray(r.rows) ? r.rows : [], createdAt: r.created_at }));
    },

    async createImportToken(hash, clientRef, seconds) {
      await q("INSERT INTO import_tokens(token_hash,client_ref,expires_at) VALUES($1,$2,NOW()+($3||' seconds')::interval)", [hash, clientRef, String(seconds)]);
    },
    async consumeImportToken(hash) {
      const found = await q("DELETE FROM import_tokens WHERE token_hash=$1 AND expires_at>NOW() AND consumed_at IS NULL RETURNING client_ref", [hash]);
      return found.rowCount ? found.rows[0].client_ref : null;
    },

    async createReportShare(share) {
      await q("INSERT INTO report_shares(id_hash,client_ref,payload_cipher,password_encrypted,expires_at) VALUES($1,$2,$3,$4,NOW()+($5||' days')::interval)",
        [share.idHash, share.clientRef, share.cipher, !!share.encrypted, String(share.days)]);
    },
    async getReportShare(idHash) {
      const found = await q("SELECT payload_cipher,password_encrypted FROM report_shares WHERE id_hash=$1 AND revoked_at IS NULL AND expires_at>NOW()", [idHash]);
      if (!found.rowCount) return null;
      await q("UPDATE report_shares SET last_opened_at=NOW() WHERE id_hash=$1", [idHash]);
      return { cipher: found.rows[0].payload_cipher, encrypted: !!found.rows[0].password_encrypted };
    },
    async listReportShares() {
      return (await q("SELECT id_hash,client_ref,password_encrypted,created_at,expires_at,last_opened_at,revoked_at FROM report_shares ORDER BY created_at DESC LIMIT 250")).rows
        .map(r => ({ idHash: r.id_hash, clientRef: r.client_ref, encrypted: !!r.password_encrypted, createdAt: r.created_at, expiresAt: r.expires_at, lastOpenedAt: r.last_opened_at, revokedAt: r.revoked_at }));
    },
    async revokeReportShare(idHash) {
      await q("UPDATE report_shares SET revoked_at=NOW() WHERE id_hash=$1", [idHash]);
    }
  };
}

function normalizeConnection(row) {
  return {
    id: row.id,
    clientRef: row.client_ref,
    provider: row.provider,
    accessToken: row.access_token_cipher,
    refreshToken: row.refresh_token_cipher,
    tokenExpiresAt: row.token_expires_at,
    scopes: row.scopes,
    metadata: row.metadata || {},
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error
  };
}

/* ------------------------------------------------------------------ local file */

async function fileStore() {
  const dir = process.env.SYNC_DATA_DIR || path.join(process.cwd(), ".data");
  const file = path.join(dir, "cno-native-sync.json");
  fs.mkdirSync(dir, { recursive: true });

  const empty = { sessions: {}, oauthStates: {}, connections: {}, syncRuns: {}, importTokens: {}, reportShares: {} };
  let data = empty;
  try {
    if (fs.existsSync(file)) data = { ...empty, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    /* A damaged local file must not stop the service from starting. Start clean instead. */
  }

  let writing = null, dirty = false;
  const persist = () => {
    dirty = true;
    if (writing) return;
    writing = Promise.resolve().then(async () => {
      while (dirty) {
        dirty = false;
        const temp = file + ".tmp";
        await fs.promises.writeFile(temp, JSON.stringify(data), { mode: 0o600 });
        await fs.promises.rename(temp, file);
      }
      writing = null;
    });
  };
  const purge = () => {
    for (const key of ["sessions", "oauthStates", "importTokens"]) {
      for (const id in data[key]) if (!alive(data[key][id].expiresAt)) delete data[key][id];
    }
    for (const id in data.reportShares) if (!alive(data.reportShares[id].expiresAt)) delete data.reportShares[id];
    persist();
  };
  purge();

  const connectionList = () => Object.values(data.connections)
    .sort((a, b) => (a.clientRef + a.provider).localeCompare(b.clientRef + b.provider))
    .map(c => ({ ...c, metadata: c.metadata || {} }));

  return {
    kind: "file",
    durable: false,
    location: file,

    async createSession(hash, days) { data.sessions[hash] = { expiresAt: later(days * 86400).toISOString() }; persist(); },
    async sessionExists(hash) { return !!(data.sessions[hash] && alive(data.sessions[hash].expiresAt)); },
    async deleteSession(hash) { delete data.sessions[hash]; persist(); },

    async createOauthState(hash, provider, clientRef, seconds) {
      data.oauthStates[hash] = { provider, clientRef, expiresAt: later(seconds).toISOString() };
      persist();
    },
    async consumeOauthState(hash) {
      const found = data.oauthStates[hash];
      delete data.oauthStates[hash];
      persist();
      return found && alive(found.expiresAt) ? { provider: found.provider, clientRef: found.clientRef } : null;
    },

    async upsertConnection(row) {
      const existing = connectionList().find(c => c.clientRef === row.clientRef && c.provider === row.provider);
      const id = existing ? existing.id : row.id;
      data.connections[id] = {
        id, clientRef: row.clientRef, provider: row.provider,
        accessToken: row.accessToken, refreshToken: row.refreshToken,
        tokenExpiresAt: row.tokenExpiresAt ? new Date(row.tokenExpiresAt).toISOString() : null,
        scopes: row.scopes, metadata: row.metadata || {},
        lastSyncedAt: null, lastError: null, updatedAt: now().toISOString()
      };
      delete data.syncRuns[id];
      persist();
      return id;
    },
    async listConnections() { return connectionList(); },
    async connectionsForClient(clientRef) { return connectionList().filter(c => c.clientRef === clientRef); },
    async getConnection(id) { return data.connections[id] ? { ...data.connections[id], metadata: data.connections[id].metadata || {} } : null; },
    async saveAccountAssignment(id, metadata) {
      if (!data.connections[id]) return;
      Object.assign(data.connections[id], { metadata, lastError: null, lastSyncedAt: null, updatedAt: now().toISOString() });
      delete data.syncRuns[id];
      persist();
    },
    async saveRefreshedToken(id, token) {
      if (!data.connections[id]) return;
      Object.assign(data.connections[id], {
        accessToken: token.accessToken, refreshToken: token.refreshToken,
        tokenExpiresAt: token.tokenExpiresAt ? new Date(token.tokenExpiresAt).toISOString() : null,
        scopes: token.scopes, lastError: null, updatedAt: now().toISOString()
      });
      persist();
    },
    async markSynced(id) {
      if (!data.connections[id]) return;
      Object.assign(data.connections[id], { lastSyncedAt: now().toISOString(), lastError: null, updatedAt: now().toISOString() });
      persist();
    },
    async markError(id, message) {
      if (!data.connections[id]) return;
      Object.assign(data.connections[id], { lastError: message, updatedAt: now().toISOString() });
      persist();
    },
    async deleteConnection(id) { delete data.connections[id]; delete data.syncRuns[id]; persist(); },
    async clientRefs() { return [...new Set(connectionList().map(c => c.clientRef))].sort(); },

    async putSyncRun(run) {
      data.syncRuns[run.connectionId] = { clientRef: run.clientRef, provider: run.provider, from: run.from, to: run.to, rows: run.rows, createdAt: now().toISOString() };
      persist();
    },
    async latestRuns(clientRef) {
      return Object.values(data.syncRuns).filter(r => r.clientRef === clientRef)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },

    async createImportToken(hash, clientRef, seconds) { data.importTokens[hash] = { clientRef, expiresAt: later(seconds).toISOString() }; persist(); },
    async consumeImportToken(hash) {
      const found = data.importTokens[hash];
      delete data.importTokens[hash];
      persist();
      return found && alive(found.expiresAt) ? found.clientRef : null;
    },

    async createReportShare(share) {
      data.reportShares[share.idHash] = {
        clientRef: share.clientRef, cipher: share.cipher, encrypted: !!share.encrypted,
        createdAt: now().toISOString(), expiresAt: later(share.days * 86400).toISOString(),
        lastOpenedAt: null, revokedAt: null
      };
      persist();
    },
    async getReportShare(idHash) {
      const found = data.reportShares[idHash];
      if (!found || found.revokedAt || !alive(found.expiresAt)) return null;
      found.lastOpenedAt = now().toISOString();
      persist();
      return { cipher: found.cipher, encrypted: !!found.encrypted };
    },
    async listReportShares() {
      return Object.entries(data.reportShares)
        .sort((a, b) => String(b[1].createdAt).localeCompare(String(a[1].createdAt)))
        .slice(0, 250)
        .map(([idHash, s]) => ({ idHash, clientRef: s.clientRef, encrypted: !!s.encrypted, createdAt: s.createdAt, expiresAt: s.expiresAt, lastOpenedAt: s.lastOpenedAt, revokedAt: s.revokedAt }));
    },
    async revokeReportShare(idHash) {
      if (data.reportShares[idHash]) { data.reportShares[idHash].revokedAt = now().toISOString(); persist(); }
    }
  };
}

export async function openStore() {
  if (process.env.DATABASE_URL) return postgresStore();
  const store = await fileStore();
  console.warn([
    "",
    "  DATABASE_URL is not set, so connections are being kept in a local file:",
    `    ${store.location}`,
    "  The browser connection flow works, but anything stored here is lost if the",
    "  container filesystem resets. Add a persistent Postgres DATABASE_URL before",
    "  connecting real client accounts.",
    ""
  ].join("\n"));
  return store;
}
