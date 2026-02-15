import { z } from "zod";
import { DATE_ONLY_REGEX } from "../../../config/constants.js";

/**
 * Reusable Zod schema for date validation
 * Ensures consistency across all HTTP routes
 * Maps to ReservationDate domain value object format (YYYY-MM-DD)
 */
export const dateSchema = z
	.string()
	.regex(DATE_ONLY_REGEX, "Invalid date format, expected YYYY-MM-DD")
	.describe("Date in YYYY-MM-DD format");

/**
 * Reusable Zod schema for ISO 8601 timestamp validation
 * For endpoints that need full timestamp (used in auth, etc.)
 */
export const isoDateTimeSchema = z
	.string()
	.datetime()
	.describe("ISO 8601 datetime string");
