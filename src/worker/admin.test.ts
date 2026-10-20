import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "./app";
import { createAdminSession } from "./lib/session";

const BASE = "https://ipadhub.test";
const USER_ID = "user-1";

let cookie = "";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function get(path: string, withSession = true) {
  return app.request(`${BASE}${path}`, { headers: withSession ? { Cookie: cookie } : {} }, env);
}

function post(path: string, form: Record<string, string>, opts: { origin?: string | null; session?: boolean } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (opts.session !== false) headers.Cookie = cookie;
  const origin = opts.origin === undefined ? BASE : opts.origin;
  if (origin) headers.Origin = origin;
  return app.request(`${BASE}${path}`, { method: "POST", headers, body: new URLSearchParams(form) }, env);
}

async function insertDevice(id: string, name: string, userId = USER_ID, lastSeenAt = Date.now() - 180000) {
  await env.DB.prepare(
    "INSERT INTO devices (id, user_id, name, token_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(id, userId, name, await sha256Hex(`token-${id}`), Date.now(), lastSeenAt)
    .run();
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM pairing_requests").run();
  await env.DB.prepare("DELETE FROM devices").run();
  await env.DB.prepare("DELETE FROM user_settings").run();
  await env.DB.prepare("DELETE FROM users").run();
  await env.DB.prepare("INSERT INTO users (id, email, created_at) VALUES (?, 'owner@example.com', ?)")
    .bind(USER_ID, Date.now())
    .run();
  const jwt = await createAdminSession(env.SESSION_SECRET!, { userId: USER_ID, email: "owner@example.com" });
  cookie = `admin_session=${jwt}`;
});

describe("GET /admin/login", () => {
  it("shows Google button and error messages", async () => {
    const html = await (await get("/admin/login", false)).text();
    expect(html).toContain("Logg inn med Google");
    expect(html).toContain("/auth/google/start");
    expect(await (await get("/admin/login?error=no_access", false)).text()).toContain(
      "Denne Google-kontoen har ikke tilgang.",
    );
    expect(await (await get("/admin/login?error=failed", false)).text()).toContain(
      "Innloggingen mislyktes. Prøv igjen.",
    );
  });
});

describe("GET /admin", () => {
  it("requires a session", async () => {
    const res = await get("/admin", false);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin/login");
  });

  it("renders approve form and empty state", async () => {
    const res = await get("/admin");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    const html = await res.text();
    expect(html).toContain("Koble til ny iPad");
    expect(html).toContain('name="code"');
    expect(html).toContain('autocapitalize="characters"');
    expect(html).toContain('name="name"');
    expect(html).toContain('value="Stue-iPad"');
    expect(html).toContain("Godkjenn iPad");
    expect(html).toContain("Enheter");
    expect(html).toContain("Ingen iPader ennå");
    expect(html).toContain("Når du har koblet til en iPad, dukker den opp her.");
  });

  it("lists only non-revoked devices of the user, escaped, with last seen and revoke link", async () => {
    await env.DB.prepare("INSERT INTO users (id, email, created_at) VALUES ('user-2', 'x@example.com', ?)")
      .bind(Date.now())
      .run();
    await insertDevice("d1", "Stue-iPad");
    await insertDevice("d2", "<script>alert(1)</script>");
    await insertDevice("d3", "Revoked");
    await env.DB.prepare("UPDATE devices SET revoked_at = ? WHERE id = 'd3'").bind(Date.now()).run();
    await insertDevice("d4", "Andres", "user-2");
    const html = await (await get("/admin")).text();
    expect(html).toContain("Stue-iPad");
    expect(html).toContain("Sist sett for 3 min siden");
    expect(html).toContain("/admin/devices/d1/revoke");
    expect(html).toContain("Trekk tilbake");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("Revoked");
    expect(html).not.toContain("Andres");
  });
});

describe("POST /admin/pair/approve", () => {
  async function pending() {
    const res = await app.request(`${BASE}/api/pair/start`, { method: "POST" }, env);
    return (await res.json()) as { code: string; pollSecret: string };
  }

  it("approves a pending code with the admin's user id", async () => {
    const { code, pollSecret } = await pending();
    const res = await post("/admin/pair/approve", { code: code.toLowerCase(), name: "Stue-iPad" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin?paired=Stue-iPad");
    const row = await env.DB.prepare("SELECT status, user_id, device_name FROM pairing_requests").first<{
      status: string;
      user_id: string;
      device_name: string;
    }>();
    expect(row).toEqual({ status: "approved", user_id: USER_ID, device_name: "Stue-iPad" });
    expect(await (await get("/admin?paired=Stue-iPad")).text()).toContain("Koblet til: Stue-iPad");
    const poll = await app.request(
      `${BASE}/api/pair/poll`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollSecret }) },
      env,
    );
    expect(await poll.json()).toEqual({ status: "approved" });
  });

  it("bad code redirects with error", async () => {
    const res = await post("/admin/pair/approve", { code: "AAAA-BBBB", name: "Stue-iPad" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin?error=code");
    expect(await (await get("/admin?error=code")).text()).toContain(
      "Koden stemmer ikke eller er utløpt. Sjekk koden på iPaden og prøv igjen.",
    );
  });

  it("CSRF: missing or foreign Origin -> 403", async () => {
    expect((await post("/admin/pair/approve", { code: "x", name: "y" }, { origin: null })).status).toBe(403);
    expect(
      (await post("/admin/pair/approve", { code: "x", name: "y" }, { origin: "https://evil.test" })).status,
    ).toBe(403);
  });

  it("requires a session", async () => {
    const res = await post("/admin/pair/approve", { code: "x", name: "y" }, { session: false });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin/login");
  });
});
