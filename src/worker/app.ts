import { Hono } from "hono";
import type { AppEnv } from "./env";
import { deviceAuth } from "./middleware/device-auth";
import { pairRoutes } from "./routes/api-pair";
import { snapshotRoutes } from "./routes/api-snapshot";
import { createGoogleAuthRoutes } from "./routes/auth-google";

export const app = new Hono<AppEnv>();

// Never let browser, CDN or service worker cache API responses.
app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

app.route("/auth/google", createGoogleAuthRoutes());

app.route("/api/pair", pairRoutes);

// Default-deny (SEC-02): everything under /api except /api/pair/* needs a valid device cookie.
app.use("/api/*", (c, next) => (c.req.path.startsWith("/api/pair/") ? next() : deviceAuth(c, next)));

app.route("/api/snapshot", snapshotRoutes);

// Only reachable when authenticated.
app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));
