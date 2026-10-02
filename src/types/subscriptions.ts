import type { Timestamp } from 'firebase/firestore';

export type SubscriptionPlan = 'hobby' | 'pro' | 'enterprise';
export type SubscriptionRequestStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface SubscriptionRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    plan: SubscriptionPlan;
    status: SubscriptionRequestStatus;
    requestedAt: Timestamp;
    processedAt?: Timestamp;
    proofOfPaymentUrl?: string;
    proofOfPaymentFileName?: string;
}
