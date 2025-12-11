import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["node_modules/", "main.js", "*.config.js", "*.config.mjs"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      obsidianmd: obsidianmd,
    },
    rules: {
      ...obsidianmd.configs.recommended,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "obsidianmd/ui/sentence-case": ["error", {
        brands: ["AWS", "Bedrock", "Claude", "Google", "Gemini", "Groq", "GroqCloud", "Llama", "Mixtral", "Mermaid", "Studio"],
        acronyms: ["AI", "API", "ID", "SSE", "LLM"],
      }],
    },
  },
];
