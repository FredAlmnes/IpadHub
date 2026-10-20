import type { CookieOptions } from "hono/utils/cookie";
import { ADMIN_SESSION_MAX_AGE } from "./session";

export const DEVICE_COOKIE = "device";
export const DEVICE_COOKIE_MAX_AGE = 34560000; // 400 days

export function isSecureRequest(url: string): boolean {
  return new URL(url).protocol === "https:";
}

// No __Host- prefix and Secure only on https, so local http dev works.
export function deviceCookieOptions(url: string): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureRequest(url),
    sameSite: "Lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  };
}

// Admin session cookie (D-10): 30 days, separate from the device cookie.
export function adminCookieOptions(url: string): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureRequest(url),
    sameSite: "Lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  };
}
