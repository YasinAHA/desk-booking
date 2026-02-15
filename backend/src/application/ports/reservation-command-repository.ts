import type { ReservationSource } from "../../domain/entities/reservation.js";
import type { DeskId } from "../../domain/valueObjects/desk-id.js";
import type { OfficeId } from "../../domain/valueObjects/office-id.js";
import type { ReservationId } from "../../domain/valueObjects/reservation-id.js";
import type { UserId } from "../../domain/valueObjects/user-id.js";

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
