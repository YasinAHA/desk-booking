/**
 * EmailOutbox port - abstracts email sending with reliability
 * 
 * Instead of sending emails directly (which can fail silently),
 * we store email send requests in an outbox table.
 * A background worker processes the outbox asynchronously.
 * 
 * Benefits:
 * - Transactional consistency: email requests are part of the same DB transaction
 * - Retryability: failed sends can be retried
 * - Auditability: all email requests are logged
 */

export type EmailMessage = {
	to: string;
	subject: string;
	body: string;
	type: "email_confirmation" | "password_reset" | "notification";
};

export interface EmailOutbox {
	/**
	 * Enqueues an email to be sent asynchronously
	 * @param message - Email message to send
	 */
	enqueue(message: EmailMessage): Promise<void>;
}
