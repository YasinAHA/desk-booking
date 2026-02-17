import type { ReservationSource } from "@domain/entities/reservation.js";
import type { DeskId } from "@domain/value-objects/desk-id.js";
import type { OfficeId } from "@domain/value-objects/office-id.js";
import type { ReservationId } from "@domain/value-objects/reservation-id.js";
import type { UserId } from "@domain/value-objects/user-id.js";

export interface ReservationCommandRepository {
	create(
		userId: UserId,
		date: string,
		deskId: DeskId,
		source: ReservationSource,
		officeId: OfficeId | null
	): Promise<ReservationId>;
	cancel(reservationId: ReservationId, userId: UserId): Promise<boolean>;
}

