import type { DeskId } from "@domain/desks/value-objects/desk-id.js";

export type DeskStatus = "active" | "maintenance" | "disabled";

export class InvalidDeskStatusTransitionError extends Error {
	constructor(from: DeskStatus, to: DeskStatus) {
		super(`Invalid desk status transition: ${from} -> ${to}`);
		this.name = "InvalidDeskStatusTransitionError";
	}
}

export class Desk {
	constructor(
		readonly id: DeskId,
		readonly code: string,
		readonly name: string | null,
		readonly status: DeskStatus
	) {}

	isAvailableForBooking(): boolean {
		return this.status === "active";
	}

	changeStatus(nextStatus: DeskStatus): Desk {
		if (nextStatus === this.status) {
			return this;
		}

		const allowedTransitions: Record<DeskStatus, DeskStatus[]> = {
			active: ["maintenance", "disabled"],
			maintenance: ["active", "disabled"],
			disabled: ["active"],
		};

		if (!allowedTransitions[this.status].includes(nextStatus)) {
			throw new InvalidDeskStatusTransitionError(this.status, nextStatus);
		}

		return new Desk(this.id, this.code, this.name, nextStatus);
	}
}
