import { jwtVerify, SignJWT } from "jose";

export const ADMIN_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 2592000; // 30 days (D-10)
export const OAUTH_STATE_COOKIE = "oauth_state";

const ISSUER = "ipadhub";
const key = (secret: string) => new TextEncoder().encode(secret);

export async function createAdminSession(
  secret: string,
  claims: { userId: string; email: string },
): Promise<string> {
  return new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience("admin")
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_MAX_AGE}s`)
    .sign(key(secret));
}

export async function verifyAdminSession(
  secret: string,
  token: string,
): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      audience: "admin",
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function createOAuthState(secret: string, v: { state: string; nonce: string }): Promise<string> {
  return new SignJWT({ state: v.state, nonce: v.nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience("oauth-state")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key(secret));
}

export async function verifyOAuthState(
  secret: string,
  token: string,
): Promise<{ state: string; nonce: string } | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      audience: "oauth-state",
      algorithms: ["HS256"],
    });
    if (typeof payload.state !== "string" || typeof payload.nonce !== "string") return null;
    return { state: payload.state, nonce: payload.nonce };
  } catch {
    return null;
  }
}
