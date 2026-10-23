import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Build output (incl. NEXT_DIST_DIR dev builds) and generated/scratch files.
  { ignores: [".next/**", ".next-*/**", "out/**", "build/**", "next-env.d.ts", "moonScript.js"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
