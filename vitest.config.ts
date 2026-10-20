import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";

const migrations = await readD1Migrations("./drizzle");

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: false,
        define: { __BUILD_ID__: JSON.stringify("test-build") },
        test: {
          name: "pure",
          include: ["src/shared/**/*.test.ts", "src/client/lib/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        define: { __BUILD_ID__: JSON.stringify("test-build") },
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: {
                TEST_MIGRATIONS: migrations,
                SESSION_SECRET: "test-session-secret-0123456789abcdef",
                ADMIN_EMAILS: "owner@example.com",
                GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
                GOOGLE_CLIENT_SECRET: "test-client-secret",
              },
            },
          }),
        ],
        test: {
          name: "worker",
          include: ["src/worker/**/*.test.ts"],
          setupFiles: ["./test/apply-migrations.ts"],
        },
      },
    ],
  },
});
