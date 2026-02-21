import type {
	ReservationSource,
	ReservationStatus,
} from "@domain/reservations/entities/reservation.js";
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

export type QrCheckInCandidate = {
	id: ReservationId;
	status: ReservationStatus;
	reservationDate: string;
	timezone: string;
	checkinAllowedFrom: string;
	checkinCutoffTime: string;
};

export interface ReservationQueryRepository {
	findByIdForUser(
		reservationId: ReservationId,
		userId: UserId
	): Promise<
		{
			id: ReservationId;
			reservationDate: string;
			status: "reserved" | "checked_in";
			isSameDayBookingClosed: boolean;
		} | null
	>;
	listForUser(userId: UserId): Promise<ReservationRecord[]>;
	hasActiveReservationForUserOnDate(userId: UserId, date: string): Promise<boolean>;
	hasActiveReservationForDeskOnDate(deskId: DeskId, date: string): Promise<boolean>;
	isSameDayBookingClosedForDesk(deskId: DeskId, date: string): Promise<boolean>;
	findQrCheckInCandidate(
		userId: UserId,
		date: string,
		qrPublicId: string
	): Promise<QrCheckInCandidate | null>;
}

