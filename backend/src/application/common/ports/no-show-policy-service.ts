export interface NoShowPolicyService {
	markNoShowExpiredForDate(date: string): Promise<void>;
}

