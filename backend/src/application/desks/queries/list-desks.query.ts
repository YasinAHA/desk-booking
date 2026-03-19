export type ListDesksQuery = {
	date: string;
	userId: string;
	officeId?: string;
	zoneId?: string;
	status?: "active" | "maintenance" | "disabled";
};
