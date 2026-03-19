import assert from "node:assert/strict";
import test from "node:test";

import { RuntimeAppSettingsStore } from "./runtime-app-settings-store.js";

test("RuntimeAppSettingsStore.create ensures global app_settings defaults before loading snapshot", async () => {
	const seenQueries: string[] = [];
	const db = {
		query: async (text: string) => {
			seenQueries.push(text);
			if (text.includes("select checkin_window_minutes")) {
				return {
					rows: [{
						checkin_window_minutes: 15,
						default_reservation_duration_minutes: 480,
					}],
				};
			}
			return { rows: [], rowCount: 1 };
		},
	};

	const store = await RuntimeAppSettingsStore.create(db);

	assert.equal(seenQueries.length >= 2, true);
	assert.equal(seenQueries[0]?.includes("insert into app_settings"), true);
	assert.deepEqual(store.get(), {
		checkinWindowMinutes: 15,
		defaultReservationDurationMinutes: 480,
	});
});

