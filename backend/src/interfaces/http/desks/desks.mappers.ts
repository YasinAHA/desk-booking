import type { ListAdminDesksHandler } from "@application/desks/queries/list-admin-desks.handler.js";
import type { ListDesksHandler } from "@application/desks/queries/list-desks.handler.js";

type ListDesksItems = Awaited<ReturnType<ListDesksHandler["execute"]>>;
type ListAdminDesksItems = Awaited<ReturnType<ListAdminDesksHandler["execute"]>>;

export function mapListDesksResponse(date: string, items: ListDesksItems) {
	return {
		date,
		items,
	};
}

export function mapAdminDesksResponse(items: ListAdminDesksItems) {
	return {
		items: items.map(item => ({
			id: item.id,
			office_id: item.officeId,
			code: item.code,
			name: item.name,
			status: item.status,
			qr_public_id: item.qrPublicId,
		})),
	};
}

export function mapRegenerateDeskQrResponse(deskId: string, qrPublicId: string) {
	return {
		ok: true,
		desk_id: deskId,
		qr_public_id: qrPublicId,
	};
}
