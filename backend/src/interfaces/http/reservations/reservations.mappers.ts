import type { ListUserReservationsHandler } from "@application/reservations/queries/list-user-reservations.handler.js";

type ListUserReservationsItems = Awaited<ReturnType<ListUserReservationsHandler["execute"]>>;

export function mapCreateReservationResponse(reservationId: string) {
	return {
		ok: true,
		reservationId,
	};
}

export function mapQrCheckInResponse(
	status: "checked_in" | "already_checked_in"
) {
	return {
		ok: true,
		status,
	};
}

export function mapListUserReservationsResponse(items: ListUserReservationsItems) {
	return {
		items: items.map(item => ({
			reservationId: item.id,
			deskId: item.deskId,
			officeId: item.officeId,
			deskName: item.deskName,
			reservationDate: item.reservationDate,
			source: item.source,
			cancelledAt: item.cancelledAt,
		})),
	};
}
