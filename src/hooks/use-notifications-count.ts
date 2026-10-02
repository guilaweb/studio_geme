'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';

export function useNotificationsCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user || !user.uid || typeof user.uid !== 'string' || !user.uid.trim() || user.uid.includes('demo')) {
      setUnreadCount(0);
      return;
    }

    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        limit(25)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const unread = snapshot.docs.filter((d) => !d.data().isRead).length;
          setUnreadCount(unread);
        },
        (err) => {
          console.warn('Aviso no listener de contagem de notificações:', err);
          setUnreadCount(0);
        }
      );

      return () => unsubscribe();
    } catch {
      setUnreadCount(0);
    }
  }, [user]);

  return { unreadCount };
}
