import type { DeskId } from "../valueObjects/desk-id.js";

/**
 * Domain entity for Desk
 * Currently a type as queries return enriched DeskAvailability DTOs.
 *
 * FUTURE REFACTOR (v0.7.0+):
 * Will become a class when command repository returns full Desk entities (not just availability queries)
 * and admin domain logic like status transitions (active → maintenance → disabled) is added.
 * See DATABASE-MODEL.md for desk status semantics and SCOPE.md for v1.0.0+ features.
 */
export type Desk = {
	id: DeskId;
	code: string;
	name: string | null;
	status: DeskStatus;
};

export type DeskStatus = "active" | "maintenance" | "disabled";
