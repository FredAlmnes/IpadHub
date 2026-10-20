import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { app } from "./app";

const BASE = "https://ipadhub.test";
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = new RegExp(`^[${ALPHA}]{4}-[${ALPHA}]{4}$`);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function start() {
  return app.request(`${BASE}/api/pair/start`, { method: "POST" }, env);
}

async function seedRow(i: number, expiresAt: number) {
  await env.DB.prepare(
    "INSERT INTO pairing_requests (id, code_hash, poll_secret_hash, status, user_id, device_name, expires_at, created_at) VALUES (?, ?, ?, 'pending', NULL, NULL, ?, ?)",
  )
    .bind(`seed-${i}`, `seed-code-${i}`, `seed-poll-${i}`, expiresAt, Date.now())
    .run();
}

describe("POST /api/pair/start", () => {
  it("A: returns a formatted code, pollSecret and expiresIn", async () => {
    const res = await start();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: string; pollSecret: string; expiresIn: number };
    expect(body.code).toMatch(CODE_RE);
    expect(body.pollSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.expiresIn).toBe(600);
  });

  it("B: stores only hashes, pending, with 10 minute expiry", async () => {
    const res = await start();
    const body = (await res.json()) as { code: string; pollSecret: string };
    const { results } = await env.DB.prepare("SELECT * FROM pairing_requests").all<{
      code_hash: string;
      poll_secret_hash: string;
      status: string;
      expires_at: number;
    }>();
    expect(results).toHaveLength(1);
    const row = results[0]!;
    expect(row.status).toBe("pending");
    expect(row.code_hash).toBe(await sha256Hex(body.code.replace("-", "")));
    expect(row.code_hash).not.toBe(body.code.replace("-", ""));
    expect(row.poll_secret_hash).toBe(await sha256Hex(body.pollSecret));
    expect(Math.abs(row.expires_at - (Date.now() + 600000))).toBeLessThan(5000);
  });

  it("C: consecutive starts differ", async () => {
    const a = (await (await start()).json()) as { code: string; pollSecret: string };
    const b = (await (await start()).json()) as { code: string; pollSecret: string };
    expect(a.code).not.toBe(b.code);
    expect(a.pollSecret).not.toBe(b.pollSecret);
  });

  it("D: responds with Cache-Control no-store", async () => {
    const res = await start();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("F: 21st pending request gets 429", async () => {
    for (let i = 0; i < 20; i++) await seedRow(i, Date.now() + 300000);
    const res = await start();
    expect(res.status).toBe(429);
  });

  it("G: rows expired more than 1 hour ago are deleted", async () => {
    await seedRow(100, Date.now() - 2 * 3600000);
    await start();
    const row = await env.DB.prepare("SELECT id FROM pairing_requests WHERE id = 'seed-100'").first();
    expect(row).toBeNull();
  });
});

describe("default-deny on /api/*", () => {
  it("E: no or garbage device cookie gives 401 unpaired", async () => {
    const snap = await app.request(`${BASE}/api/snapshot`, {}, env);
    expect(snap.status).toBe(401);
    expect(await snap.json()).toEqual({ error: "unpaired" });

    const other = await app.request(`${BASE}/api/anything-else`, {}, env);
    expect(other.status).toBe(401);

    const garbage = await app.request(
      `${BASE}/api/snapshot`,
      { headers: { Cookie: "device=garbage" } },
      env,
    );
    expect(garbage.status).toBe(401);
  });
});
