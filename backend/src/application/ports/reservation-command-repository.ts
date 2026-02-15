import type { ReservationSource } from "../../domain/entities/reservation.js";
import type { DeskId } from "../../domain/valueObjects/deskId.js";
import type { OfficeId } from "../../domain/valueObjects/officeId.js";
import type { ReservationId } from "../../domain/valueObjects/reservationId.js";
import type { UserId } from "../../domain/valueObjects/userId.js";

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
