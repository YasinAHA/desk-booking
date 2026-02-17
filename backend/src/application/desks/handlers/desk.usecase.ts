import type { DeskRepository } from "@application/ports/desk-repository.js";
import { ListDesksHandler } from "@application/desks/queries/list-desks.handler.js";
import type { ListDesksQuery } from "@application/desks/queries/list-desks.query.js";

export class DeskUseCase {
	private readonly listDesksHandler: ListDesksHandler;

	constructor(private readonly deskRepo: DeskRepository) {
		this.listDesksHandler = new ListDesksHandler({ deskRepo: this.deskRepo });
	}

	async listForDate(date: string, userId: string) {
		const query: ListDesksQuery = { date, userId };
		return this.listDesksHandler.execute(query);
	}
}
