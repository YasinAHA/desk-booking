import type { Notifier, NotifyParams } from "../../application/ports/notifier.ts";
import { sendEmail } from "../email/mailer.ts";

export class EmailNotifier implements Notifier {
	async send(params: NotifyParams): Promise<void> {
		await sendEmail(params);
	}
}
