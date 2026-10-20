import { createRemoteJWKSet } from "jose";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../env";
import { getDb } from "../db/client";
import { adminCookieOptions, isSecureRequest } from "../lib/cookies";
import {
  buildAuthUrl,
  exchangeCode,
  GOOGLE_JWKS_URL,
  isAllowedEmail,
  verifyGoogleIdToken,
} from "../lib/google-oidc";
import type { GoogleDeps } from "../lib/google-oidc";
import {
  ADMIN_COOKIE,
  createAdminSession,
  createOAuthState,
  OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "../lib/session";
import { randomBase64Url } from "../lib/tokens";
import { upsertUserByEmail } from "../lib/users";

let defaultJwks: GoogleDeps["jwks"] | undefined;
function defaultDeps(): GoogleDeps {
  defaultJwks ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return { fetch: globalThis.fetch.bind(globalThis), jwks: defaultJwks };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function createGoogleAuthRoutes(overrides?: Partial<GoogleDeps>): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  const deps = (): GoogleDeps => ({ ...defaultDeps(), ...overrides });
  const redirectUri = (url: string) => new URL(url).origin + "/auth/google/callback";

  routes.get("/start", async (c) => {
    const { SESSION_SECRET, GOOGLE_CLIENT_ID } = c.env;
    if (!SESSION_SECRET || !GOOGLE_CLIENT_ID) return c.text("Noe gikk galt. Prøv igjen om litt.", 500);

    const state = randomBase64Url(32);
    const nonce = randomBase64Url(32);
    setCookie(c, OAUTH_STATE_COOKIE, await createOAuthState(SESSION_SECRET, { state, nonce }), {
      httpOnly: true,
      secure: isSecureRequest(c.req.url),
      sameSite: "Lax",
      path: "/auth",
      maxAge: 600,
    });
    c.header("Cache-Control", "no-store");
    return c.redirect(
      buildAuthUrl({ clientId: GOOGLE_CLIENT_ID, redirectUri: redirectUri(c.req.url), state, nonce }),
      302,
    );
  });

  routes.get("/callback", async (c) => {
    c.header("Cache-Control", "no-store");
    const { SESSION_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env;
    const clear = () => deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/auth" });
    const fail = (error: string) => {
      clear();
      return c.redirect(`/admin/login?error=${error}`, 302);
    };
    try {
      if (!SESSION_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return fail("failed");

      const code = c.req.query("code");
      const state = c.req.query("state");
      const cookie = getCookie(c, OAUTH_STATE_COOKIE);
      if (!code || !state || !cookie) return fail("failed");

      const saved = await verifyOAuthState(SESSION_SECRET, cookie);
      if (!saved || !safeEqual(saved.state, state)) return fail("failed");

      const d = deps();
      const { id_token } = await exchangeCode(d, {
        code,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        redirectUri: redirectUri(c.req.url),
      });
      const { sub, email } = await verifyGoogleIdToken(d, id_token, {
        clientId: GOOGLE_CLIENT_ID,
        nonce: saved.nonce,
      });
      if (!isAllowedEmail(email, c.env.ADMIN_EMAILS)) return fail("no_access");

      const user = await upsertUserByEmail(getDb(c.env.DB), { email, sub, now: Date.now() });
      const session = await createAdminSession(SESSION_SECRET, { userId: user.id, email });
      setCookie(c, ADMIN_COOKIE, session, adminCookieOptions(c.req.url));
      clear();
      return c.redirect("/admin", 302);
    } catch {
      return fail("failed");
    }
  });

  return routes;
}
