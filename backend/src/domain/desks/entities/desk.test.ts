import assert from "node:assert/strict";
import test from "node:test";

import { Desk, InvalidDeskStatusTransitionError } from "@domain/desks/entities/desk.js";
import { createDeskId } from "@domain/desks/value-objects/desk-id.js";

test("Desk.isAvailableForBooking is true only when status is active", () => {
	const activeDesk = new Desk(createDeskId("desk-1"), "D-01", "Desk 1", "active");
	const maintenanceDesk = new Desk(
		createDeskId("desk-2"),
		"D-02",
		"Desk 2",
		"maintenance"
	);

	assert.equal(activeDesk.isAvailableForBooking(), true);
	assert.equal(maintenanceDesk.isAvailableForBooking(), false);
});

test("Desk.changeStatus allows valid transitions", () => {
	const activeDesk = new Desk(createDeskId("desk-1"), "D-01", "Desk 1", "active");
	const maintenanceDesk = activeDesk.changeStatus("maintenance");

	assert.equal(maintenanceDesk.status, "maintenance");
});

test("Desk.changeStatus rejects invalid transitions", () => {
	const disabledDesk = new Desk(createDeskId("desk-1"), "D-01", "Desk 1", "disabled");

	assert.throws(
		() => disabledDesk.changeStatus("maintenance"),
		InvalidDeskStatusTransitionError
	);
});
