import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ["node_modules", "build", "dist", "scripts"],
  },
  {
    rules: {
      "@typescript-eslint/no-namespace": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
);
