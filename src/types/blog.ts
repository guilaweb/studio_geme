import type { Timestamp } from 'firebase/firestore';

export const BlogCategories = [
    'Inteligência',
    'Cibersegurança',
    'Pentest',
    'Investigação',
    'SI',
    'Geointeligência',
    'Outros'
] as const;

export type BlogCategory = typeof BlogCategories[number];

export interface Post {
    id: string;
    title: string;
    slug: string;
    content: string; // Markdown content
    excerpt?: string; // Short summary
    featureImageUrl?: string;
    isPublished: boolean;
    isFeatured?: boolean;
    category: BlogCategory;
    tags: string[];
    author: {
        uid: string;
        displayName: string;
        role?: string;
        avatarUrl?: string;
    };
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
    views?: number;
    readTimeMinutes?: number;
}

export interface PostComment {
    id: string;
    postId: string;
    authorName: string;
    authorEmail?: string;
    authorCompany?: string;
    content: string;
    createdAt: Timestamp | Date;
    likes?: number;
    isApproved?: boolean;
    replyToId?: string;
}

export interface NewsletterSubscriber {
    id: string;
    email: string;
    subscribedAt: Timestamp | Date;
    status: 'active' | 'unsubscribed';
    source?: string;
}
