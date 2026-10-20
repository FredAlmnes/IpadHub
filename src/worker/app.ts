import { Hono } from "hono";
import type { AppEnv } from "./env";

export const app = new Hono<AppEnv>();
