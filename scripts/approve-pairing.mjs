#!/usr/bin/env node
// Owner-only emergency approval of a pairing code, straight against D1 (local or remote).
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

function fail(msg) {
  console.error(`Feil: ${msg}`);
  process.exit(1);
}

let values;
try {
  ({ values } = parseArgs({
    options: {
      code: { type: "string" },
      email: { type: "string" },
      name: { type: "string", default: "Stue-iPad" },
      local: { type: "boolean", default: false },
      remote: { type: "boolean", default: false },
    },
    strict: true,
  }));
} catch (err) {
  fail(err.message);
}

if (values.local && values.remote) fail("Bruk enten --local eller --remote, ikke begge.");
const target = values.remote ? "--remote" : "--local";

const code = (values.code ?? "").toUpperCase().replace(/[-\s]/g, "");
if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(code)) fail("Ugyldig kode. Bruk formatet XXXX-XXXX.");

const email = (values.email ?? "").toLowerCase();
if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) fail("Ugyldig e-postadresse (--email).");

const name = values.name;
if (!/^[\p{L}\p{N} -]{1,40}$/u.test(name)) fail("Ugyldig enhetsnavn (1-40 tegn: bokstaver, tall, mellomrom, bindestrek).");

// All values above are allow-listed and cannot contain quotes, so embedding is safe.
const hash = createHash("sha256").update(code).digest("hex");
const now = Date.now();
const sql =
  `INSERT OR IGNORE INTO users (id, email, created_at) VALUES ('${randomUUID()}', '${email}', ${now}); ` +
  `UPDATE pairing_requests SET status='approved', user_id=(SELECT id FROM users WHERE email='${email}'), device_name='${name}' ` +
  `WHERE code_hash='${hash}' AND status='pending' AND expires_at > ${now};`;

try {
  execFileSync("npx", ["wrangler", "d1", "execute", "ipadhub", target, "--command", sql], { stdio: "inherit" });
} catch {
  fail("wrangler feilet.");
}
console.log(`Godkjent: ${name}`);
