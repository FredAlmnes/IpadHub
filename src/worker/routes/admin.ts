import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { deleteCookie } from "hono/cookie";
import { z } from "zod";
import { getDb } from "../db/client";
import { getActiveDevice, listActiveDevices, revokeDevice } from "../lib/devices";
import { approvePairing } from "../lib/pairing";
import { ADMIN_COOKIE } from "../lib/session";
import { adminAuth } from "../middleware/admin-auth";
import type { AdminEnv } from "../middleware/admin-auth";
import { errorPage, homePage, loginPage, revokePage, setupPage } from "../views/admin-pages";
import { SETUP_STEPS } from "../views/setup-checklist";

export const adminRoutes = new Hono<AdminEnv>();

// Every admin response is private and must never be cached.
adminRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

// Origin-based CSRF check on all state-changing requests (T-01-22); runs before auth.
adminRoutes.use("*", async (c, next) => (c.req.method === "POST" ? csrf()(c, next) : next()));

adminRoutes.get("/login", (c) => c.html(loginPage(c.req.query("error"))));

adminRoutes.use("*", async (c, next) => (c.req.path === "/admin/login" ? next() : adminAuth(c, next)));

adminRoutes.get("/", async (c) => {
  const { userId } = c.get("admin");
  const devices = await listActiveDevices(getDb(c.env.DB), userId);
  return c.html(
    homePage({
      devices,
      now: Date.now(),
      flash: { paired: c.req.query("paired"), error: c.req.query("error"), revoked: c.req.query("revoked") },
    }),
  );
});

const approveForm = z.object({ code: z.string().min(1).max(32), name: z.string().trim().min(1).max(40) });

adminRoutes.post("/pair/approve", async (c) => {
  const form = await c.req.parseBody();
  const parsed = approveForm.safeParse({ code: form.code, name: form.name });
  if (!parsed.success) return c.redirect("/admin?error=code", 302);
  try {
    const result = await approvePairing(getDb(c.env.DB), {
      code: parsed.data.code,
      userId: c.get("admin").userId,
      deviceName: parsed.data.name,
      now: Date.now(),
    });
    if (result !== "approved") return c.redirect("/admin?error=code", 302);
    return c.redirect(`/admin?paired=${encodeURIComponent(parsed.data.name)}`, 302);
  } catch {
    return c.html(errorPage(), 500);
  }
});

adminRoutes.get("/devices/:id/revoke", async (c) => {
  const device = await getActiveDevice(getDb(c.env.DB), c.get("admin").userId, c.req.param("id"));
  if (!device) return c.html(errorPage(), 404);
  return c.html(revokePage(device));
});

adminRoutes.post("/devices/:id/revoke", async (c) => {
  const db = getDb(c.env.DB);
  const { userId } = c.get("admin");
  const id = c.req.param("id");
  const device = await getActiveDevice(db, userId, id);
  if (!device || !(await revokeDevice(db, userId, id, Date.now()))) return c.html(errorPage(), 404);
  return c.redirect(`/admin?revoked=${encodeURIComponent(device.name)}`, 302);
});

adminRoutes.post("/logout", (c) => {
  deleteCookie(c, ADMIN_COOKIE, { path: "/" });
  return c.redirect("/admin/login", 302);
});

adminRoutes.get("/oppsett", (c) => c.html(setupPage(SETUP_STEPS)));
