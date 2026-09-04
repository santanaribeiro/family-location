// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions roda em Deno (Edge Functions) — runtime e globais
    // diferentes do resto do projeto (Node/React Native), fora do escopo deste lint.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
