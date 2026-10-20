import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import type { JWK, KeyLike } from "jose";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AppEnv } from "./env";
import { createGoogleAuthRoutes } from "./routes/auth-google";
import { isAllowedEmail } from "./lib/google-oidc";
import { createAdminSession, createOAuthState } from "./lib/session";
import { adminAuth } from "./middleware/admin-auth";

const BASE = "https://ipadhub.test";
const CLIENT_ID = "test-client-id.apps.googleusercontent.com";

let privateKey: KeyLike | CryptoKey;
let jwks: ReturnType<typeof createLocalJWKSet>;

type IdOpts = { aud?: string; nonce?: string; emailVerified?: boolean; email?: string; iss?: string };

async function idToken(o: IdOpts = {}): Promise<string> {
  return new SignJWT({
    email: o.email ?? "Owner@Example.com",
    email_verified: o.emailVerified ?? true,
    nonce: o.nonce ?? "nonce-1",
  })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(o.iss ?? "https://accounts.google.com")
    .setAudience(o.aud ?? CLIENT_ID)
    .setSubject("google-sub-1")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

function makeApp(token: Promise<string> | string) {
  const fakeFetch = (async () =>
    new Response(JSON.stringify({ id_token: await token }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
  const app = new Hono<AppEnv>();
  app.route("/auth/google", createGoogleAuthRoutes({ fetch: fakeFetch, jwks }));
  return app;
}

function callback(app: Hono<AppEnv>, opts: { state?: string; cookieState?: string; nonce?: string } = {}) {
  return (async () => {
    const cookieJwt = await createOAuthState(env.SESSION_SECRET!, {
      state: opts.cookieState ?? "state-1",
      nonce: opts.nonce ?? "nonce-1",
    });
    return app.request(
      `${BASE}/auth/google/callback?code=abc&state=${opts.state ?? "state-1"}`,
      { headers: { Cookie: `oauth_state=${cookieJwt}` } },
      env,
    );
  })();
}

beforeAll(async () => {
  const kp = await generateKeyPair("RS256");
  privateKey = kp.privateKey;
  const jwk: JWK = { ...(await exportJWK(kp.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  jwks = createLocalJWKSet({ keys: [jwk] });
});

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM pairing_requests").run();
  await env.DB.prepare("DELETE FROM devices").run();
  await env.DB.prepare("DELETE FROM user_settings").run();
  await env.DB.prepare("DELETE FROM users").run();
});

describe("GET /auth/google/start", () => {
  it("redirects to Google with state, nonce, no offline access, and sets oauth_state cookie", async () => {
    const res = await makeApp("x").request(`${BASE}/auth/google/start`, {}, env);
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("Location")!);
    expect(loc.origin + loc.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(loc.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(loc.searchParams.get("redirect_uri")).toBe("https://ipadhub.test/auth/google/callback");
    expect(loc.searchParams.get("response_type")).toBe("code");
    expect(loc.searchParams.get("scope")).toBe("openid email");
    expect(loc.searchParams.get("state")).toBeTruthy();
    expect(loc.searchParams.get("nonce")).toBeTruthy();
    expect(loc.searchParams.get("prompt")).toBe("select_account");
    expect(loc.searchParams.has("access_type")).toBe(false);
    const sc = res.headers.get("Set-Cookie") ?? "";
    expect(sc).toContain("oauth_state=");
    expect(sc).toContain("HttpOnly");
    expect(sc).toContain("SameSite=Lax");
    expect(sc).toContain("Max-Age=600");
  });
});

describe("GET /auth/google/callback", () => {
  it("valid login creates user + 30-day admin session", async () => {
    const res = await callback(makeApp(idToken()));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin");
    const cookies = res.headers.getSetCookie();
    const admin = cookies.find((c) => c.startsWith("admin_session="))!;
    expect(admin).toBeTruthy();
    expect(admin).toContain("Max-Age=2592000");
    expect(admin).toContain("HttpOnly");
    expect(admin).toContain("SameSite=Lax");
    expect(admin).toContain("Secure");
    expect(cookies.find((c) => c.startsWith("oauth_state="))).toContain("Max-Age=0");
    const row = await env.DB.prepare("SELECT email, google_sub FROM users").first<{
      email: string;
      google_sub: string;
    }>();
    expect(row?.email).toBe("owner@example.com");
    expect(row?.google_sub).toBe("google-sub-1");
  });

  async function expectDenied(res: Response, loc: string) {
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(loc);
    expect((res.headers.get("Set-Cookie") ?? "").includes("admin_session=")).toBe(false);
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith("admin_session=") && !c.includes("Max-Age=0"))).toBe(false);
  }

  it("state mismatch", async () => {
    await expectDenied(await callback(makeApp(idToken()), { state: "other" }), "/admin/login?error=failed");
  });

  it("missing state cookie", async () => {
    const res = await makeApp(idToken()).request(`${BASE}/auth/google/callback?code=abc&state=state-1`, {}, env);
    await expectDenied(res, "/admin/login?error=failed");
  });

  it("wrong nonce", async () => {
    await expectDenied(
      await callback(makeApp(idToken({ nonce: "evil" }))),
      "/admin/login?error=failed",
    );
  });

  it("wrong audience", async () => {
    await expectDenied(await callback(makeApp(idToken({ aud: "someone-else" }))), "/admin/login?error=failed");
  });

  it("email not verified", async () => {
    await expectDenied(
      await callback(makeApp(idToken({ emailVerified: false }))),
      "/admin/login?error=failed",
    );
  });

  it("email not in allowlist", async () => {
    await expectDenied(
      await callback(makeApp(idToken({ email: "stranger@example.com" }))),
      "/admin/login?error=no_access",
    );
  });
});

describe("isAllowedEmail", () => {
  it("matches trimmed, lower-cased exact entries", () => {
    expect(isAllowedEmail("a@b.no", " A@B.no , c@d.no")).toBe(true);
    expect(isAllowedEmail("a@b.no", undefined)).toBe(false);
    expect(isAllowedEmail("a@b.no.evil", "a@b.no")).toBe(false);
  });
});

describe("adminAuth", () => {
  const app = new Hono<AppEnv & { Variables: { admin: { userId: string; email: string } } }>();
  app.use("/p", adminAuth);
  app.get("/p", (c) => c.text(`hi ${c.get("admin").email}`));

  it("no cookie -> /admin/login", async () => {
    const res = await app.request(`${BASE}/p`, {}, env);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin/login");
  });

  it("tampered JWT -> /admin/login", async () => {
    const t = await createAdminSession(env.SESSION_SECRET!, { userId: "u", email: "owner@example.com" });
    const res = await app.request(`${BASE}/p`, { headers: { Cookie: `admin_session=${t}x` } }, env);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin/login");
  });

  it("valid session passes", async () => {
    const t = await createAdminSession(env.SESSION_SECRET!, { userId: "u", email: "owner@example.com" });
    const res = await app.request(`${BASE}/p`, { headers: { Cookie: `admin_session=${t}` } }, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hi owner@example.com");
  });

  it("email removed from ADMIN_EMAILS -> /admin/login", async () => {
    const t = await createAdminSession(env.SESSION_SECRET!, { userId: "u", email: "owner@example.com" });
    const res = await app.request(
      `${BASE}/p`,
      { headers: { Cookie: `admin_session=${t}` } },
      { ...env, ADMIN_EMAILS: "someone-else@example.com" },
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/admin/login");
  });
});
