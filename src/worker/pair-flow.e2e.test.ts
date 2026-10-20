import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "./app";
import { getDb } from "./db/client";
import { approvePairing } from "./lib/pairing";
import { Snapshot } from "../shared/contract";

const BASE = "https://ipadhub.test";
const USER_ID = "user-1";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function start() {
  const res = await app.request(`${BASE}/api/pair/start`, { method: "POST" }, env);
  return (await res.json()) as { code: string; pollSecret: string };
}

function poll(pollSecret: string) {
  return app.request(
    `${BASE}/api/pair/poll`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollSecret }) },
    env,
  );
}

function approve(code: string, name = "Stue-iPad") {
  return approvePairing(getDb(env.DB), { code, userId: USER_ID, deviceName: name, now: Date.now() });
}

function cookieValue(res: Response): string {
  const sc = res.headers.get("Set-Cookie") ?? "";
  return /device=([^;]+)/.exec(sc)?.[1] ?? "";
}

async function pairDevice(): Promise<string> {
  const { code, pollSecret } = await start();
  await approve(code);
  const res = await poll(pollSecret);
  return cookieValue(res);
}

function snapshot(token: string) {
  return app.request(`${BASE}/api/snapshot`, { headers: { Cookie: `device=${token}` } }, env);
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM pairing_requests").run();
  await env.DB.prepare("DELETE FROM devices").run();
  await env.DB.prepare("DELETE FROM user_settings").run();
  await env.DB.prepare("DELETE FROM users").run();
  await env.DB.prepare("INSERT INTO users (id, email, created_at) VALUES (?, 'owner@example.com', ?)")
    .bind(USER_ID, Date.now())
    .run();
});

describe("pair poll", () => {
  it("1: pending without cookie", async () => {
    const { pollSecret } = await start();
    const res = await poll(pollSecret);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "pending" });
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });

  it("2: approved sets HttpOnly device cookie, token only hashed in D1", async () => {
    const { code, pollSecret } = await start();
    expect(await approve(code)).toBe("approved");
    const res = await poll(pollSecret);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ status: "approved" });
    const sc = res.headers.get("Set-Cookie") ?? "";
    const token = cookieValue(res);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sc).toContain("HttpOnly");
    expect(sc).toContain("Secure");
    expect(sc).toContain("SameSite=Lax");
    expect(sc).toContain("Path=/");
    expect(sc).toContain("Max-Age=34560000");
    expect(text).not.toContain(token);
    const dev = await env.DB.prepare("SELECT * FROM devices").first<{
      name: string;
      user_id: string;
      token_hash: string;
    }>();
    expect(dev?.name).toBe("Stue-iPad");
    expect(dev?.user_id).toBe(USER_ID);
    expect(dev?.token_hash).toBe(await sha256Hex(token));
  });

  it("3: second poll is consumed without cookie", async () => {
    const { code, pollSecret } = await start();
    await approve(code);
    await poll(pollSecret);
    const res = await poll(pollSecret);
    expect(await res.json()).toEqual({ status: "consumed" });
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });

  it("4: approvePairing rejects expired, consumed and malformed codes", async () => {
    expect(await approve("nonsense")).toBe("invalid");
    expect(await approve("AAAA-0000")).toBe("invalid");

    const a = await start();
    await env.DB.prepare("UPDATE pairing_requests SET expires_at = ?").bind(Date.now() - 1000).run();
    expect(await approve(a.code)).toBe("invalid");

    await env.DB.prepare("DELETE FROM pairing_requests").run();
    const b = await start();
    expect(await approve(b.code.toLowerCase())).toBe("approved");
    await poll(b.pollSecret);
    expect(await approve(b.code)).toBe("invalid");
  });

  it("5: expired, unknown and malformed secrets give expired; bad body gives 400", async () => {
    const { pollSecret } = await start();
    await env.DB.prepare("UPDATE pairing_requests SET expires_at = ?").bind(Date.now() - 1000).run();
    expect(await (await poll(pollSecret)).json()).toEqual({ status: "expired" });
    expect(await (await poll("x".repeat(43))).json()).toEqual({ status: "expired" });
    expect(await (await poll("short")).json()).toEqual({ status: "expired" });
    const bad = await app.request(
      `${BASE}/api/pair/poll`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json" },
      env,
    );
    expect(bad.status).toBe(400);
  });
});

describe("GET /api/snapshot", () => {
  it("6: valid device gets contract-conforming snapshot", async () => {
    const token = await pairDevice();
    const res = await snapshot(token);
    expect(res.status).toBe(200);
    const body = Snapshot.parse(await res.json());
    expect(body.version).toBe("test-build");
    expect(body.config).toEqual({ nightStart: "23:00", nightEnd: "06:00", timezone: "Europe/Oslo" });
    for (const k of ["bus", "weather", "calendar", "mail"]) {
      const m = body.modules[k]!;
      expect(m.status).toBe("not_configured");
      expect(m.data).toBeNull();
      expect(m.fetchedAt).toBeNull();
    }
  });

  it("7: config reflects user_settings", async () => {
    const token = await pairDevice();
    await env.DB.prepare("INSERT INTO user_settings (user_id, night_start, night_end) VALUES (?, '22:30', '06:15')")
      .bind(USER_ID)
      .run();
    const body = Snapshot.parse(await (await snapshot(token)).json());
    expect(body.config.nightStart).toBe("22:30");
    expect(body.config.nightEnd).toBe("06:15");
  });

  it("8: revoked device gets 401 unpaired", async () => {
    const token = await pairDevice();
    await env.DB.prepare("UPDATE devices SET revoked_at = ?").bind(Date.now()).run();
    const res = await snapshot(token);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unpaired" });
  });

  it("9: last_seen_at write and cookie renewal throttled to 5 minutes", async () => {
    const token = await pairDevice();
    const old = Date.now() - 10 * 60 * 1000;
    await env.DB.prepare("UPDATE devices SET last_seen_at = ?").bind(old).run();

    const first = await snapshot(token);
    expect(first.status).toBe(200);
    expect(first.headers.get("Set-Cookie")).toContain("Max-Age=34560000");
    const row = await env.DB.prepare("SELECT last_seen_at FROM devices").first<{ last_seen_at: number }>();
    expect(row!.last_seen_at).toBeGreaterThan(old);

    const second = await snapshot(token);
    expect(second.status).toBe(200);
    expect(second.headers.get("Set-Cookie")).toBeNull();
    const row2 = await env.DB.prepare("SELECT last_seen_at FROM devices").first<{ last_seen_at: number }>();
    expect(row2!.last_seen_at).toBe(row!.last_seen_at);
  });
});
