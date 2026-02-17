import type { ReservationSource } from "@domain/entities/reservation.js";

export type CreateReservationCommand = {
	userId: string;
	date: string;
	deskId: string;
	source?: ReservationSource;
	officeId?: string;
};
