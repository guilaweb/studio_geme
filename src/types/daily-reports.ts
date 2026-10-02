import type { Timestamp } from 'firebase/firestore';

export interface DailyReport {
    id: string;
    date: Date;
    weather: string;
    ownManpower: number;
    subcontractorManpower: number;
    activities: string;
    occurrences?: string;
    photoUrls?: { url: string; name: string }[];
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}
