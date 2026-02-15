import type { DeskStatus } from "../../domain/entities/desk.js";
import type { DeskId } from "../../domain/valueObjects/deskId.js";
import type { OfficeId } from "../../domain/valueObjects/officeId.js";
import type { ReservationId } from "../../domain/valueObjects/reservationId.js";
import type { UserId } from "../../domain/valueObjects/userId.js";

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
