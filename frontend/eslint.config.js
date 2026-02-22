import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import sonarjs from "eslint-plugin-sonarjs";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig } from "eslint/config";

export default defineConfig(
  // -----------------------------
  // 1) Global ignores
  // -----------------------------
  {
    ignores: [
      "dist",
      "coverage",
      "src/shared/openapi/generated",
      "eslint.config.js",
      "vite.config.*",
      "vitest.config.*"
    ]
  },

  // -----------------------------
  // 2) Base JS recommended
  // -----------------------------
  js.configs.recommended,

  // -----------------------------
  // 3) TS recommended (type-aware)
  // -----------------------------
  ...tseslint.configs.recommendedTypeChecked,

  // -----------------------------
  // 4) App rules (src)
  // -----------------------------
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    settings: {
      react: { version: "detect" },

      // eslint-plugin-import: TS + aliases
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"]
      },
      "import/resolver": {
        typescript: {
          projectService: true
        }
      }
    },
    plugins: {
      "jsx-a11y": jsxA11y,
      sonarjs,
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      import: importPlugin,
      "unused-imports": unusedImports
    },
    rules: {
      // Accessibility
      ...jsxA11y.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,

      // React
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/prop-types": "off",

      // Fast refresh
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true }
      ],

      // TS (frontend)
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" }
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } }
      ],
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreVoid: true, ignoreIIFE: true }
      ],

      // Hygiene
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],

      // Import plugin: útiles y baratas
      "import/no-duplicates": "warn",
      "import/newline-after-import": "warn",
      "import/no-cycle": "off",

      // Orden de imports por capas + aliases
      "import/order": [
        "warn",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "type"
          ],
          pathGroups: [
            { pattern: "react", group: "external", position: "before" },

            { pattern: "@app/**", group: "internal", position: "after" },
            { pattern: "@shared/**", group: "internal", position: "after" },
            { pattern: "@features/**", group: "internal", position: "after" },
            { pattern: "@pages/**", group: "internal", position: "after" }
          ],
          pathGroupsExcludedImportTypes: ["react"]
        }
      ],

      // Arquitectura global (ligera)
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@shared/openapi/generated/**"],
              message:
                "No importes directamente openapi/generated/**. Re-exporta desde @shared/openapi (wrapper estable)."
            }
          ]
        }
      ]
    }
  },

  // -----------------------------
  // 5) Arquitectura por carpetas
  // -----------------------------

  // shared debe ser "puro": no depende de app/features/pages
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@app/**", "@features/**", "@pages/**"],
              message:
                "shared/** no puede depender de app/features/pages. Extrae contrato a shared o invierte dependencia."
            }
          ]
        }
      ]
    }
  },

  // features no debería depender de app/pages (composition layer debe depender de features, no al revés)
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@app/**", "@pages/**"],
              message:
                "features/** no debería depender de app/pages. Usa @shared o composición desde @app."
            }
          ]
        }
      ]
    }
  },

  // pages deben ser wrappers finos: solo dependen de features/shared
  {
    files: ["src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@app/**", "@pages/**"],
              message:
                "pages/** debe ser wrapper fino y no depender de app/pages."
            }
          ]
        }
      ]
    }
  },

  // -----------------------------
  // 6) Tests: relajar cosas típicas
  // -----------------------------
  {
    files: ["**/*.{test,spec}.{ts,tsx}", "src/**/__tests__/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/assertions-in-tests": "off",
      "sonarjs/no-nested-conditional": "off"
    }
  }
);
