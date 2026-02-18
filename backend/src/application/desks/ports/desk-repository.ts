import type { DeskStatus } from "@domain/desks/entities/desk.js";
import type { DeskId } from "@domain/desks/value-objects/desk-id.js";
import type { OfficeId } from "@domain/desks/value-objects/office-id.js";
import type { ReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import type { UserId } from "@domain/auth/value-objects/user-id.js";

export type DeskAvailability = {
	id: DeskId;
	officeId: OfficeId;
	code: string;
	name: string | null;
	status: DeskStatus;
	isReserved: boolean;
	isMine: boolean;
	reservationId: ReservationId | null;
	occupantName: string | null;
};

export interface DeskRepository {
	listForDate(date: string, userId: UserId): Promise<DeskAvailability[]>;
}


