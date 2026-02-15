import { createUserId } from "../../domain/valueObjects/user-id.js";
import type { DeskRepository } from "../ports/desk-repository.ts";

export class DeskUseCase {
	constructor(private readonly deskRepo: DeskRepository) {}

	async listForDate(date: string, userId: string) {
		const userIdVO = createUserId(userId);
		return this.deskRepo.listForDate(date, userIdVO);
	}
}
