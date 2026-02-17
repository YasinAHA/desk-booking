import type { ReservationSource } from "@domain/reservations/entities/reservation.js";
import type { DeskId } from "@domain/desks/value-objects/desk-id.js";
import type { OfficeId } from "@domain/desks/value-objects/office-id.js";
import type { ReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import type { UserId } from "@domain/auth/value-objects/user-id.js";

export type ReservationRecord = {
	id: ReservationId;
	deskId: DeskId;
	officeId: OfficeId;
	deskName: string;
	reservationDate: string;
	source: ReservationSource;
	cancelledAt: string | null;
};

export interface ReservationQueryRepository {
	findActiveByIdForUser(
		reservationId: ReservationId,
		userId: UserId
	): Promise<{ id: ReservationId; reservationDate: string } | null>;
	listForUser(userId: UserId): Promise<ReservationRecord[]>;
}


