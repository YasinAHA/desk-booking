import type { DeskStatus } from "../../domain/entities/desk.js";
import type { DeskId } from "../../domain/valueObjects/desk-id.js";
import type { OfficeId } from "../../domain/valueObjects/office-id.js";
import type { ReservationId } from "../../domain/valueObjects/reservation-id.js";
import type { UserId } from "../../domain/valueObjects/user-id.js";

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
