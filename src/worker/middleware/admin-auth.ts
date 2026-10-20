import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { isAllowedEmail } from "../lib/google-oidc";
import { ADMIN_COOKIE, verifyAdminSession } from "../lib/session";

export type AdminEnv = AppEnv & { Variables: { admin: { userId: string; email: string } } };

export const adminAuth: MiddlewareHandler<AdminEnv> = async (c, next) => {
  const secret = c.env.SESSION_SECRET;
  // Fail closed.
  if (!secret) return c.text("Noe gikk galt. Prøv igjen om litt.", 500);

  const token = getCookie(c, ADMIN_COOKIE);
  const claims = token ? await verifyAdminSession(secret, token) : null;
  // Allowlist re-checked on every request: removing an e-mail revokes the session.
  if (!claims || !isAllowedEmail(claims.email, c.env.ADMIN_EMAILS)) return c.redirect("/admin/login", 302);

  c.set("admin", claims);
  c.header("Cache-Control", "no-store");
  await next();
};
