export type Env = {
  DB: D1Database;
  SESSION_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  ADMIN_EMAILS?: string;
  DEMO_MODULES?: string;
};

export type UserContext = { userId: string; deviceId: string };

export type AppEnv = { Bindings: Env; Variables: { user: UserContext } };
