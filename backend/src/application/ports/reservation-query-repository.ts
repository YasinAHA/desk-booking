import type { ReservationSource } from "@domain/entities/reservation.js";
import type { DeskId } from "@domain/value-objects/desk-id.js";
import type { OfficeId } from "@domain/value-objects/office-id.js";
import type { ReservationId } from "@domain/value-objects/reservation-id.js";
import type { UserId } from "@domain/value-objects/user-id.js";

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

