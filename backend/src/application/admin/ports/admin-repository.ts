export type AdminSettings = {
	id: string;
	allowSelfRegistration: boolean;
	guestModeEnabled: boolean;
	checkinWindowMinutes: number;
	maxAdvanceDays: number;
	maxReservationsPerUser: number;
	cancellationDeadlineMinutes: number;
	defaultReservationDurationMinutes: number;
	businessHoursStart: string;
	businessHoursEnd: string;
	allowedEmailDomains: string[];
};

export type AdminSettingsPatch = Partial<Omit<AdminSettings, "id" | "allowedEmailDomains">> & {
	allowedEmailDomains?: string[];
};

export type AdminReservationStatus = "reserved" | "checked_in" | "cancelled" | "no_show";

export type AdminReservationRecord = {
	id: string;
	reservationType: "internal" | "guest";
	userId: string | null;
	hostUserId: string | null;
	deskId: string;
	officeId: string;
	startsAt: string;
	endsAt: string;
	status: AdminReservationStatus;
	source: "user" | "admin" | "walk_in" | "system";
	guestName: string | null;
	guestEmail: string | null;
	guestCompany: string | null;
};

export type AdminReservationFilters = {
	start?: string;
	end?: string;
	status?: AdminReservationStatus;
	officeId?: string;
};

export type CreateAdminReservationInput = {
	reservationType: "internal" | "guest";
	userId?: string;
	hostUserId?: string;
	deskId: string;
	officeId?: string;
	startsAt: string;
	endsAt: string;
	source?: "admin" | "walk_in" | "system";
	guestName?: string;
	guestEmail?: string;
	guestCompany?: string;
};

export type OccupancyReportItem = {
	deskId: string;
	deskCode: string;
	zoneName: string | null;
	totalSlots: number;
	occupiedSlots: number;
	occupancyRate: number;
};

export type OccupancyReport = {
	start: string;
	end: string;
	items: OccupancyReportItem[];
};

export type NoShowReportItem = {
	actorUserId: string;
	actorEmail: string | null;
	noShows: number;
};

export type NoShowReport = {
	start: string;
	end: string;
	items: NoShowReportItem[];
};

export type SummaryReport = {
	start: string;
	end: string;
	totalReservations: number;
	checkedIn: number;
	cancelled: number;
	noShow: number;
};

export type AdminReportFilters = {
	start: string;
	end: string;
	officeId?: string;
};

export interface AdminRepository {
	getGlobalSettings(): Promise<AdminSettings>;
	updateGlobalSettings(patch: AdminSettingsPatch): Promise<AdminSettings>;
	listReservations(filters: AdminReservationFilters): Promise<AdminReservationRecord[]>;
	createReservation(input: CreateAdminReservationInput): Promise<string>;
	updateReservationStatus(
		reservationId: string,
		status: AdminReservationStatus
	): Promise<boolean>;
	getOccupancyReport(filters: AdminReportFilters): Promise<OccupancyReport>;
	getNoShowReport(filters: AdminReportFilters): Promise<NoShowReport>;
	getSummaryReport(filters: AdminReportFilters): Promise<SummaryReport>;
}
