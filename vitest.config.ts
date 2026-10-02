import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "mfe_student/App": fileURLToPath(
        new URL(
          "./modules/frontend/packages/host/src/__mocks__/RemoteAppMock.tsx",
          import.meta.url,
        ),
      ),
      "mfe_activity/App": fileURLToPath(
        new URL(
          "./modules/frontend/packages/host/src/__mocks__/RemoteAppMock.tsx",
          import.meta.url,
        ),
      ),
      "mfe_institution/App": fileURLToPath(
        new URL(
          "./modules/frontend/packages/host/src/__mocks__/RemoteAppMock.tsx",
          import.meta.url,
        ),
      ),
      "mfe_dashboard/App": fileURLToPath(
        new URL(
          "./modules/frontend/packages/host/src/__mocks__/RemoteAppMock.tsx",
          import.meta.url,
        ),
      ),
      "mfe_admin/App": fileURLToPath(
        new URL(
          "./modules/frontend/packages/host/src/__mocks__/RemoteAppMock.tsx",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
