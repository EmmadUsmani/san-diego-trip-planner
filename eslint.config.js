import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

const importBan = (group, message) => ({
  patterns: [{ group, message }],
});

export default tseslint.config(
  { ignores: ["dist", ".wrangler", "node_modules", "db/migrations", "test-results", "playwright-report", "design", "worker-configuration.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  // shared/ is pure domain logic: it must not depend on the frontend or the worker.
  {
    files: ["shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        importBan(["**/src/**", "**/worker/**", "../src/*", "../worker/*", "../../src/*", "../../worker/*", "@/*"], "shared/ must not import from src/ or worker/."),
      ],
    },
  },
);
