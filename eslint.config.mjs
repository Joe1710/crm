import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", ".next/**", ".vinext/**", "node_modules/**"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
    },
  }
);
