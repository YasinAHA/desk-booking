import type { CancelReservationCommand } from "@application/reservations/commands/cancel-reservation.command.js";
import { CancelReservationHandler } from "@application/reservations/commands/cancel-reservation.handler.js";
import type { CreateReservationCommand } from "@application/reservations/commands/create-reservation.command.js";
import { CreateReservationHandler } from "@application/reservations/commands/create-reservation.handler.js";
import type {
	ReservationDependencies,
} from "@application/reservations/handlers/reservation.types.js";
import type { ListUserReservationsQuery } from "@application/reservations/queries/list-user-reservations.query.js";
import { ListUserReservationsHandler } from "@application/reservations/queries/list-user-reservations.handler.js";
import type { ReservationSource } from "@domain/reservations/entities/reservation.js";

export class ReservationUseCase {
	private readonly createHandler: CreateReservationHandler;
	private readonly cancelHandler: CancelReservationHandler;
	private readonly listHandler: ListUserReservationsHandler;

	constructor(
		commandRepo: ReservationDependencies["commandRepo"],
		queryRepo: ReservationDependencies["queryRepo"]
	) {
		const deps: ReservationDependencies = { commandRepo, queryRepo };
		this.createHandler = new CreateReservationHandler(deps);
		this.cancelHandler = new CancelReservationHandler(deps);
		this.listHandler = new ListUserReservationsHandler(deps);
	}

	async create(
		userId: string,
		date: string,
		deskId: string,
		source?: ReservationSource,
		officeId?: string
	): Promise<string> {
		const baseCommand: Omit<CreateReservationCommand, "source" | "officeId"> = {
			userId,
			date,
			deskId,
		};
		const command: CreateReservationCommand = {
			...baseCommand,
			...(source ? { source } : {}),
			...(officeId ? { officeId } : {}),
		};
		return this.createHandler.execute(command);
	}

	async cancel(userId: string, reservationId: string): Promise<boolean> {
		const command: CancelReservationCommand = { userId, reservationId };
		return this.cancelHandler.execute(command);
	}

	async listForUser(userId: string) {
		const query: ListUserReservationsQuery = { userId };
		return this.listHandler.execute(query);
	}
}

