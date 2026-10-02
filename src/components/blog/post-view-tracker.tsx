'use client';

import { useEffect } from 'react';

export function PostViewTracker({ postId }: { postId: string }) {
    useEffect(() => {
        if (!postId) return;

        const sessionKey = `viewed_post_${postId}`;
        if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, 'true');
            fetch(`/api/blog/posts/${postId}/view`, { method: 'POST' }).catch(() => {});
        }
    }, [postId]);

    return null;
}
