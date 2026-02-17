import type { ListUserReservationsHandler } from "@application/reservations/queries/list-user-reservations.handler.js";

type ListUserReservationsItems = Awaited<ReturnType<ListUserReservationsHandler["execute"]>>;

export function mapCreateReservationResponse(reservationId: string) {
	return {
		ok: true,
		reservation_id: reservationId,
	};
}

export function mapListUserReservationsResponse(items: ListUserReservationsItems) {
	return {
		items: items.map(item => ({
			reservation_id: item.id,
			desk_id: item.deskId,
			office_id: item.officeId,
			desk_name: item.deskName,
			reservation_date: item.reservationDate,
			source: item.source,
			cancelled_at: item.cancelledAt,
		})),
	};
}
