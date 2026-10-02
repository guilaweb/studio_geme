'use client';

import * as React from "react";
import { useState, useEffect } from "react";
import { Bell, Loader2, Check, Clock, Info, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from "firebase/firestore";
import type { Notification } from "@/types/notifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function NotificationsDropdown() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !user.uid) return;

        // Se for utilizador de demonstração, usar lista estática/vazia sem invocar o Firestore
        if (user.uid.includes('demo')) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(10)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
                setNotifications(items);
                setLoading(false);
            }, (err) => {
                console.warn('Aviso ao carregar notificações:', err);
                setNotifications([]);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (e) {
            setLoading(false);
        }
    }, [user]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            const notifRef = doc(db, 'notifications', notificationId);
            await updateDoc(notifRef, { isRead: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        const unread = notifications.filter(n => !n.isRead);
        for (const n of unread) {
            handleMarkAsRead(n.id);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                    <span>Notificações</span>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-auto p-0 text-xs text-primary hover:bg-transparent">
                            Limpar todas
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-80">
                    {loading ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin"/></div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center p-8 text-sm text-muted-foreground">
                            Nenhuma notificação nova.
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <DropdownMenuItem key={notif.id} className="p-0" onSelect={() => handleMarkAsRead(notif.id)}>
                                <Link href={notif.link || '#'} className={cn(
                                    "flex flex-col gap-1 p-3 w-full transition-colors",
                                    !notif.isRead && "bg-primary/5"
                                )}>
                                    <div className="flex justify-between items-start">
                                        <p className={cn("text-sm leading-tight", !notif.isRead && "font-semibold")}>
                                            {notif.message}
                                        </p>
                                        {!notif.isRead && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>{notif.createdAt ? format((notif.createdAt as any).toDate(), 'dd MMM, HH:mm', { locale: ptBR }) : 'N/A'}</span>
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
