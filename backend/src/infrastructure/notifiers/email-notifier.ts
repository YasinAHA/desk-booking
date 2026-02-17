import type { Notifier, NotifyParams } from "@application/common/ports/notifier.js";
import { sendEmail } from "@infrastructure/email/mailer.js";

export class EmailNotifier implements Notifier {
	async send(params: NotifyParams): Promise<void> {
		await sendEmail(params);
	}
}

