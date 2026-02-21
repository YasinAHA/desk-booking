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
	...tseslint.configs.recommendedTypeChecked,
	sonarjs.configs.recommended,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				projectService: true,
			},
		},
		rules: {
			"no-duplicate-imports": "error",
			"max-params": ["error", 7],
			"no-nested-ternary": "error",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: true,
				},
			],
			"sonarjs/cognitive-complexity": ["error", 15],
		},
	},
	{
		files: ["src/**/*.test.ts"],
		rules: {
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"sonarjs/no-hardcoded-passwords": "off",
		},
	},
	{
		files: ["src/interfaces/http/**/*.ts", "src/app.ts"],
		rules: {
			"@typescript-eslint/require-await": "off",
		},
	},
	{
		files: ["src/domain/**/*.ts"],
		ignores: ["src/**/*.test.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@application/*", "@infrastructure/*", "@interfaces/*", "@composition/*", "@config/*"],
							message:
								"Domain layer must be pure. Do not import application/infrastructure/interfaces/composition/config.",
						},
					],
				},
			],
		},
	},
	{
		files: ["src/application/**/*.ts"],
		ignores: ["src/**/*.test.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@infrastructure/*", "@interfaces/*", "@composition/*"],
							message: "Application layer must not depend on infrastructure/interfaces/composition.",
						},
					],
				},
			],
		},
	},
	{
		files: ["src/infrastructure/**/*.ts"],
		ignores: ["src/**/*.test.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@interfaces/*", "@composition/*"],
							message: "Infrastructure layer must not depend on interfaces/composition.",
						},
					],
				},
			],
		},
	},
	{
		files: ["src/interfaces/**/*.ts"],
		ignores: ["src/**/*.test.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@infrastructure/*"],
							message: "Interfaces layer must not depend directly on infrastructure.",
						},
					],
				},
			],
		},
	},
	{
		files: ["src/composition/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@interfaces/*"],
							message: "Composition layer should not depend on interfaces.",
						},
					],
				},
			],
		},
	},
);
