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
export type AdminUserRole = "user" | "admin";
export type AdminUserStatus = "active" | "suspended";
export type AdminDeskStatus = "active" | "maintenance" | "disabled";

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

export type AdminUserRecord = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	secondLastName: string | null;
	role: AdminUserRole;
	status: AdminUserStatus;
	createdAt: string;
};

export type AdminUsersFilters = {
	q?: string;
	role?: AdminUserRole;
	status?: AdminUserStatus;
	page?: number;
	pageSize?: number;
};

export type AdminUsersPage = {
	items: AdminUserRecord[];
	total: number;
	page: number;
	pageSize: number;
};

export type AdminUserPatch = {
	role?: AdminUserRole;
	status?: AdminUserStatus;
};

export type AdminDeskRecord = {
	id: string;
	officeId: string;
	zoneId: string | null;
	zoneName: string | null;
	code: string;
	name: string | null;
	status: AdminDeskStatus;
	statusReason: string | null;
	qrPublicId: string;
	layoutX: number | null;
	layoutY: number | null;
	layoutW: number | null;
	layoutH: number | null;
	rotationDeg: number;
	displayOrder: number;
	archivedAt: string | null;
};

export type AdminDesksFilters = {
	officeId?: string;
	zoneId?: string;
	status?: AdminDeskStatus;
	includeArchived?: boolean;
	q?: string;
	page?: number;
	pageSize?: number;
	sortBy?: AdminDesksSortBy;
	sortDir?: AdminDesksSortDir;
};

export type AdminDesksSortBy = "deskCode" | "zoneName" | "status" | "displayOrder";
export type AdminDesksSortDir = "asc" | "desc";

export type AdminDesksPage = {
	items: AdminDeskRecord[];
	total: number;
	page: number;
	pageSize: number;
};

export type AdminDeskLayoutPatch = {
	layoutX?: number | null;
	layoutY?: number | null;
	layoutW?: number | null;
	layoutH?: number | null;
	rotationDeg?: number;
	displayOrder?: number;
};

export type AdminDeskStatusPatch = {
	status: AdminDeskStatus;
	statusReason?: string | null;
};

export type AdminFloorplanConfig = {
	officeId: string;
	floorplanImageUrl: string | null;
	canvasWidth: number | null;
	canvasHeight: number | null;
	effectiveCanvasWidth: number;
	effectiveCanvasHeight: number;
	hasBackgroundImage: boolean;
};

export type AdminFloorplanConfigPatch = {
	floorplanImageUrl?: string | null;
	canvasWidth?: number | null;
	canvasHeight?: number | null;
};

export type AdminFloorplanOverlayKind = "room" | "area" | "facility";

export type AdminFloorplanOverlay = {
	id: string;
	officeId: string;
	label: string;
	kind: AdminFloorplanOverlayKind;
	x: number;
	y: number;
	w: number;
	h: number;
	rotationDeg: number;
	strokeColor: string | null;
	fillColor: string | null;
	displayOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type AdminFloorplanOverlayCreate = {
	label: string;
	kind?: AdminFloorplanOverlayKind;
	x: number;
	y: number;
	w: number;
	h: number;
	rotationDeg?: number;
	strokeColor?: string | null;
	fillColor?: string | null;
	displayOrder?: number;
};

export type AdminFloorplanOverlayPatch = Partial<AdminFloorplanOverlayCreate>;

export type AdminDeskQrRecord = {
	deskId: string;
	officeId: string;
	deskCode: string;
	deskName: string | null;
	zoneName: string | null;
	status: AdminDeskStatus;
	qrPublicId: string;
};

export type AdminDeskQrsSortBy = "deskCode" | "zoneName" | "status";
export type AdminDeskQrsSortDir = "asc" | "desc";

export type AdminDeskQrsFilters = {
	officeId?: string;
	zoneId?: string;
	status?: AdminDeskStatus;
	q?: string;
	page?: number;
	pageSize?: number;
	sortBy?: AdminDeskQrsSortBy;
	sortDir?: AdminDeskQrsSortDir;
};

export type AdminDeskQrsPage = {
	items: AdminDeskQrRecord[];
	total: number;
	page: number;
	pageSize: number;
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

export type CancellationsReportItem = {
	cancellationDate: string;
	actorUserId: string;
	actorEmail: string | null;
	cancellations: number;
	avgCancellationLeadMinutes: number;
};

export type CancellationsReport = {
	start: string;
	end: string;
	items: CancellationsReportItem[];
};

export type AuditLogReportItem = {
	id: string;
	eventType: string;
	actorType: "user" | "admin" | "system";
	actorUserId: string | null;
	actorEmail: string | null;
	reservationId: string | null;
	deskId: string | null;
	officeId: string | null;
	reason: string | null;
	metadata: unknown;
	createdAt: string;
};

export type AuditLogReport = {
	start: string;
	end: string;
	items: AuditLogReportItem[];
};

export type AdminReportFilters = {
	start: string;
	end: string;
	officeId?: string;
};

export type AdminAuditLogFilters = AdminReportFilters & {
	actorId?: string;
};

export interface AdminRepository {
	getGlobalSettings(): Promise<AdminSettings>;
	updateGlobalSettings(patch: AdminSettingsPatch): Promise<AdminSettings>;
	listDesks(filters: AdminDesksFilters): Promise<AdminDesksPage>;
	updateDeskLayout(deskId: string, patch: AdminDeskLayoutPatch): Promise<AdminDeskRecord | null>;
	updateDeskStatus(deskId: string, patch: AdminDeskStatusPatch): Promise<AdminDeskRecord | null>;
	getFloorplanConfig(officeId: string): Promise<AdminFloorplanConfig | null>;
	updateFloorplanConfig(
		officeId: string,
		patch: AdminFloorplanConfigPatch
	): Promise<AdminFloorplanConfig | null>;
	listFloorplanOverlays(officeId: string): Promise<AdminFloorplanOverlay[]>;
	createFloorplanOverlay(
		officeId: string,
		input: AdminFloorplanOverlayCreate
	): Promise<AdminFloorplanOverlay | null>;
	updateFloorplanOverlay(
		officeId: string,
		overlayId: string,
		patch: AdminFloorplanOverlayPatch
	): Promise<AdminFloorplanOverlay | null>;
	deleteFloorplanOverlay(officeId: string, overlayId: string): Promise<boolean>;
	listDeskQrs(filters: AdminDeskQrsFilters): Promise<AdminDeskQrsPage>;
	regenerateDeskQrsBulk(officeId?: string): Promise<number>;
	listUsers(filters: AdminUsersFilters): Promise<AdminUsersPage>;
	updateUser(userId: string, patch: AdminUserPatch): Promise<AdminUserRecord | null>;
	listReservations(filters: AdminReservationFilters): Promise<AdminReservationRecord[]>;
	createReservation(input: CreateAdminReservationInput): Promise<string>;
	updateReservationStatus(
		reservationId: string,
		status: AdminReservationStatus
	): Promise<boolean>;
	getOccupancyReport(filters: AdminReportFilters): Promise<OccupancyReport>;
	getCancellationsReport(filters: AdminReportFilters): Promise<CancellationsReport>;
	getNoShowReport(filters: AdminReportFilters): Promise<NoShowReport>;
	getAuditLogReport(filters: AdminAuditLogFilters): Promise<AuditLogReport>;
	getSummaryReport(filters: AdminReportFilters): Promise<SummaryReport>;
}
