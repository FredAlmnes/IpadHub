import type { MODULE_KEYS, ModuleSnapshot } from "../../shared/contract";
import type { Env, UserContext } from "../env";

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type Provider = {
  key: ModuleKey;
  staleAfterSec: number;
  get(ctx: { env: Env; user: UserContext; now: Date }): Promise<ModuleSnapshot>;
};
