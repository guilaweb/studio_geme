import type { Timestamp } from 'firebase/firestore';

export interface TopoPoint {
    id: string;
    code: string; // Point identifier, e.g., "P1", "STK-A1"
    north: number; // Y-coordinate
    east: number;  // X-coordinate
    elevation: number; // Z-coordinate
    description?: string;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}
