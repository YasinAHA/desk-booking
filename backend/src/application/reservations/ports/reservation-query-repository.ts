import type {
	Reservation,
	ReservationSource,
} from "@domain/reservations/entities/reservation.js";
import type { DeskId } from "@domain/desks/value-objects/desk-id.js";
import type { OfficeId } from "@domain/desks/value-objects/office-id.js";
import type { UserId } from "@domain/auth/value-objects/user-id.js";
import type { ReservationId } from "@domain/reservations/value-objects/reservation-id.js";

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
	reservation: Reservation;
	timezone: string;
	checkinAllowedFrom: string;
	checkinCutoffTime: string;
};

export type ReservationBookingPolicyContext = {
	timezone: string;
	checkinAllowedFrom: string;
};

export interface ReservationQueryRepository {
	findByIdForUser(
		reservationId: ReservationId,
		userId: UserId
	): Promise<
		{
			reservation: Reservation;
			timezone: string;
			checkinAllowedFrom: string;
		} | null
	>;
	listForUser(userId: UserId): Promise<ReservationRecord[]>;
	hasActiveReservationForUserOnDate(userId: UserId, date: string): Promise<boolean>;
	hasActiveReservationForDeskOnDate(deskId: DeskId, date: string): Promise<boolean>;
	getDeskBookingPolicyContext(
		deskId: DeskId
	): Promise<ReservationBookingPolicyContext | null>;
	findQrCheckInCandidate(
		userId: UserId,
		date: string,
		qrPublicId: string
	): Promise<QrCheckInCandidate | null>;
}

