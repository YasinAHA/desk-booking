import assert from "node:assert";
import test from "node:test";
import {
	PasswordPolicyError,
	createValidatedPassword,
	validatePasswordPolicy,
} from "./password-policy.js";

test("validatePasswordPolicy accepts strong passwords", () => {
	const validPasswords = [
		"MyPassword123!",
		"Secure@Pass2024",
		"Complex$Password1",
		"LongAndStrong_Pass123",
	];

	for (const pwd of validPasswords) {
		assert.doesNotThrow(() => validatePasswordPolicy(pwd), `Should accept: ${pwd}`);
	}
});

test("validatePasswordPolicy rejects password < 12 chars", () => {
	assert.throws(
		() => validatePasswordPolicy("Short1!a"),
		PasswordPolicyError,
		"Should reject password < 12 chars"
	);
});

test("validatePasswordPolicy rejects password without uppercase", () => {
	assert.throws(
		() => validatePasswordPolicy("nouppercase123!"),
		PasswordPolicyError,
		"Should reject missing uppercase"
	);
});

test("validatePasswordPolicy rejects password without lowercase", () => {
	assert.throws(
		() => validatePasswordPolicy("NOLOWERCASE123!"),
		PasswordPolicyError,
		"Should reject missing lowercase"
	);
});

test("validatePasswordPolicy rejects password without digit", () => {
	assert.throws(
		() => validatePasswordPolicy("NoDigitPassword!"),
		PasswordPolicyError,
		"Should reject missing digit"
	);
});

test("validatePasswordPolicy rejects password without special char", () => {
	assert.throws(
		() => validatePasswordPolicy("NoSpecialChar123"),
		PasswordPolicyError,
		"Should reject missing special char"
	);
});

test("validatePasswordPolicy rejects common patterns", () => {
	const commonPatterns = ["Password123!", "Abc123456789!", "Qwerty123456!"];

	for (const pwd of commonPatterns) {
		assert.throws(
			() => validatePasswordPolicy(pwd),
			PasswordPolicyError,
			`Should reject common pattern: ${pwd}`
		);
	}
});

test("createValidatedPassword returns branded type", () => {
	const pwd = createValidatedPassword("ValidPass123!");
	assert.equal(typeof pwd, "string", "Should return string type");
});

test("createValidatedPassword throws on invalid policy", () => {
	assert.throws(
		() => createValidatedPassword("weak"),
		PasswordPolicyError,
		"Should throw on weak password"
	);
});
