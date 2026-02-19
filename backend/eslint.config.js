import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";
import globals from "globals";

export default defineConfig(
	{
		ignores: ["dist/**"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			globals: globals.node,
		},
		plugins: {
			sonarjs,
		},
			rules: {
				"no-duplicate-imports": "error",
				"max-params": ["error", 7],
				"no-unused-vars": "off",
				"@typescript-eslint/no-unused-vars": [
					"error",
					{
						argsIgnorePattern: "^_",
						caughtErrorsIgnorePattern: "^_",
					},
				],
				"@typescript-eslint/no-explicit-any": "error",
			},
		},
	);
