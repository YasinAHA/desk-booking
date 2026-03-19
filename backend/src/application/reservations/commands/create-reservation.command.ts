import type { ReservationSource } from "@domain/reservations/entities/reservation.js";

export type CreateReservationCommand = {
	userId: string;
	date?: string;
	startsAt?: string;
	endsAt?: string;
	deskId: string;
	source?: ReservationSource;
	officeId?: string;
};

