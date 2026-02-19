import type { ReservationSource } from "@domain/reservations/entities/reservation.js";
import type { DeskId } from "@domain/desks/value-objects/desk-id.js";
import type { OfficeId } from "@domain/desks/value-objects/office-id.js";
import type { ReservationId } from "@domain/reservations/value-objects/reservation-id.js";
import type { UserId } from "@domain/auth/value-objects/user-id.js";

export interface ReservationCommandRepository {
	create(
		userId: UserId,
		date: string,
		deskId: DeskId,
		source: ReservationSource,
		officeId: OfficeId | null
	): Promise<ReservationId>;
	cancel(reservationId: ReservationId, userId: UserId): Promise<boolean>;
	checkInByQr(
		userId: UserId,
		date: string,
		qrPublicId: string
	): Promise<"checked_in" | "already_checked_in" | "not_active" | "not_found">;
}


