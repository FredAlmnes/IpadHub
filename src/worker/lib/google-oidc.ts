import { jwtVerify } from "jose";
import type { JWTVerifyGetKey } from "jose";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

export type GoogleDeps = { fetch: typeof fetch; jwks: JWTVerifyGetKey };

// Identity only (openid email). No offline access in phase 1.
export function buildAuthUrl(p: { clientId: string; redirectUri: string; state: string; nonce: string }): string {
  const u = new URL(GOOGLE_AUTH_URL);
  u.searchParams.set("client_id", p.clientId);
  u.searchParams.set("redirect_uri", p.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email");
  u.searchParams.set("state", p.state);
  u.searchParams.set("nonce", p.nonce);
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

export async function exchangeCode(
  deps: GoogleDeps,
  p: { code: string; clientId: string; clientSecret: string; redirectUri: string },
): Promise<{ id_token: string }> {
  const res = await deps.fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: p.clientId,
      client_secret: p.clientSecret,
      redirect_uri: p.redirectUri,
      code: p.code,
    }),
  });
  if (!res.ok) throw new Error(`token endpoint ${res.status}`);
  const body = (await res.json()) as { id_token?: unknown };
  if (typeof body.id_token !== "string") throw new Error("no id_token");
  return { id_token: body.id_token };
}

export async function verifyGoogleIdToken(
  deps: GoogleDeps,
  idToken: string,
  p: { clientId: string; nonce: string },
): Promise<{ sub: string; email: string }> {
  const { payload } = await jwtVerify(idToken, deps.jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: p.clientId,
  });
  if (payload.nonce !== p.nonce) throw new Error("nonce mismatch");
  if (payload.email_verified !== true) throw new Error("email not verified");
  if (typeof payload.email !== "string" || typeof payload.sub !== "string") throw new Error("missing claims");
  return { sub: payload.sub, email: payload.email.toLowerCase() };
}

export function isAllowedEmail(email: string, allowlist: string | undefined): boolean {
  if (!allowlist) return false;
  const e = email.trim().toLowerCase();
  if (!e) return false;
  return allowlist
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(e);
}
