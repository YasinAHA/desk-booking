import type { ListDesksHandler } from "@application/desks/queries/list-desks.handler.js";

type ListDesksItems = Awaited<ReturnType<ListDesksHandler["execute"]>>;

export function mapListDesksResponse(date: string, items: ListDesksItems) {
	return {
		date,
		items,
	};
}
