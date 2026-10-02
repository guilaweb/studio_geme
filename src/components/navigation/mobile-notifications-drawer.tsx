'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  Users2,
  Calendar,
  FileText,
  Check,
  ArrowRight,
  Loader2,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  type Timestamp
} from 'firebase/firestore';
import type { Notification } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MobileNotificationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
}

export function MobileNotificationsDrawer({
  open,
  onOpenChange,
  onUnreadCountChange
}: MobileNotificationsDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for user notifications
  useEffect(() => {
    if (!user || !user.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (user.uid.includes('demo')) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        limit(20)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data()
        })) as Notification[];

        // Sort descending by date in memory to prevent missing composite index errors
        items.sort((a, b) => {
          const tA = (a.createdAt as any)?.toDate?.() || new Date(a.createdAt as any || 0);
          const tB = (b.createdAt as any)?.toDate?.() || new Date(b.createdAt as any || 0);
          return tB.getTime() - tA.getTime();
        });

        setNotifications(items);
        const unread = items.filter((n) => !n.isRead).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
        setLoading(false);
      }, (err) => {
        console.warn('Aviso ao carregar notificações móveis:', err);
        setNotifications([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      setLoading(false);
    }
  }, [user, onUnreadCountChange]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleItemClick = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
      } catch (err) {
        console.error('Erro ao marcar notificação como lida:', err);
      }
    }
    onOpenChange(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    for (const n of unread) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
      } catch (e) {
        // ignore
      }
    }
  };

  const getNotificationIcon = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes('férias') || m.includes('ausência') || m.includes('rh')) {
      return <Users2 className="h-4 w-4 text-primary" />;
    }
    if (m.includes('prazo') || m.includes('atras') || m.includes('urgente')) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (m.includes('lead') || m.includes('proposta') || m.includes('cliente')) {
      return <Briefcase className="h-4 w-4 text-emerald-600" />;
    }
    if (m.includes('medição') || m.includes('diário')) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[88vw] sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold font-headline flex items-center gap-2">
                  Notificações
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs px-2 py-0">
                      {unreadCount} novas
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Alertas de obras, tarefas e aprovações
                </SheetDescription>
              </div>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs text-primary gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Ler todas
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">A carregar notificações...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500/50" />
              <p className="text-sm font-semibold text-foreground">Tudo em dia!</p>
              <p className="text-xs text-muted-foreground max-w-[220px] mx-auto">
                Não existem notificações pendentes no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => {
                const date = (notif.createdAt as any)?.toDate?.() || new Date(notif.createdAt as any || 0);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer touch-target-44 active:scale-[0.99] flex items-start gap-3 ${
                      notif.isRead
                        ? 'bg-card/50 text-muted-foreground border-border/40'
                        : 'bg-primary/5 text-foreground border-primary/20 shadow-xs'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-background border mt-0.5 shrink-0">
                      {getNotificationIcon(notif.message)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${notif.isRead ? 'font-normal' : 'font-semibold text-foreground'}`}>
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                        <span>{formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}</span>
                        {notif.createdBy?.displayName && (
                          <span>por {notif.createdBy.displayName}</span>
                        )}
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="p-3 border-t bg-muted/20 sm:justify-center">
          <p className="text-[11px] text-muted-foreground text-center w-full">
            Toque numa notificação para abrir diretamente o detalhe correspondente.
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
