import type { Timestamp } from 'firebase/firestore';

export interface Notification {
    id: string;
    userId: string; // The ID of the user who should receive the notification
    message: string;
    link: string; // The URL to navigate to when the notification is clicked
    isRead: boolean;
    createdAt: Timestamp;
    createdBy: { // Information about who triggered the notification
        uid?: string;
        displayName: string;
    };
}
