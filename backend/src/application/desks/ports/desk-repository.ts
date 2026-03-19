import type { DeskStatus } from "@domain/desks/entities/desk.js";
import type { DeskId } from "@domain/desks/value-objects/desk-id.js";
import type { OfficeId } from "@domain/desks/value-objects/office-id.js";
import type { ReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import type { UserId } from "@domain/auth/value-objects/user-id.js";

export type DeskAvailability = {
	id: DeskId;
	officeId: OfficeId;
	zoneId: string | null;
	code: string;
	name: string | null;
	zone: string | null;
	status: DeskStatus;
	layoutX: number | null;
	layoutY: number | null;
	layoutW: number | null;
	layoutH: number | null;
	rotationDeg: number;
	displayOrder: number;
	isReserved: boolean;
	isMine: boolean;
	reservationId: ReservationId | null;
	occupantName: string | null;
};

export type ListDesksFilters = {
	officeId?: string;
	zoneId?: string;
	status?: DeskStatus;
};

export type AdminDeskRecord = {
	id: DeskId;
	officeId: OfficeId;
	code: string;
	name: string | null;
	zone: string | null;
	status: DeskStatus;
	qrPublicId: string;
};

export interface DeskRepository {
	listForDate(date: string, userId: UserId, filters: ListDesksFilters): Promise<DeskAvailability[]>;
	listForAdmin(): Promise<AdminDeskRecord[]>;
	regenerateQrPublicId(deskId: DeskId): Promise<string | null>;
	regenerateAllQrPublicIds(): Promise<number>;
}


