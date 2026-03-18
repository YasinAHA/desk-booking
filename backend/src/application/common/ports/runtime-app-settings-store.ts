export type RuntimeAppSettingsSnapshot = {
	checkinWindowMinutes: number;
	defaultReservationDurationMinutes: number;
};

export interface RuntimeAppSettingsStore {
	get(): RuntimeAppSettingsSnapshot;
	apply(snapshot: Partial<RuntimeAppSettingsSnapshot>): void;
	refresh(): Promise<RuntimeAppSettingsSnapshot>;
}
