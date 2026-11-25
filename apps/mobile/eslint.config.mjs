// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    settings: {
      react: {
        version: "19.3",
      },
    },
  },
  {
    ignores: ["dist/**", ".expo/**", "android/**", "ios/**"],
    rules: {
      // Reanimated shared values are intentionally mutated in event handlers;
      // these compiler diagnostics are informational for this app.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    files: ["app.config.js"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
      },
    },
  },
]);
