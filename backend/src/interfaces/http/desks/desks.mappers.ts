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
			officeId: item.officeId,
			code: item.code,
			name: item.name,
			status: item.status,
			qrPublicId: item.qrPublicId,
		})),
	};
}

export function mapRegenerateDeskQrResponse(deskId: string, qrPublicId: string) {
	return {
		ok: true,
		deskId,
		qrPublicId,
	};
}

export function mapRegenerateAllDesksQrResponse(updated: number) {
	return {
		ok: true,
		updated,
	};
}
