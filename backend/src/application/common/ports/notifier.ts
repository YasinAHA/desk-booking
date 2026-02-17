export type NotifyParams = {
	to: string;
	subject: string;
	html: string;
	text?: string;
};

export interface Notifier {
	send(params: NotifyParams): Promise<void>;
}
