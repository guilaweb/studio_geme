'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { format } from 'date-fns';

interface Message {
    id: string;
    text: string;
    author: {
        uid: string;
        displayName: string;
    };
    createdAt: Timestamp;
}

interface ClientCommunicationTabProps {
    projectId: string;
}

const getInitials = (name: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};


export function ClientCommunicationTab({ projectId }: ClientCommunicationTabProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'clientMessages'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user) {
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'projects', projectId, 'clientMessages'), {
                text: newMessage,
                author: {
                    uid: user.uid,
                    displayName: user.displayName || 'Utilizador',
                },
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Comunicação com o Cliente
                </CardTitle>
                <CardDescription>
                    Canal de comunicação direta para registar pedidos, dúvidas e aprovações.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg h-[500px] flex flex-col">
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {loading ? (
                             <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
                        ) : messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">Nenhuma mensagem ainda.</div>
                        ) : (
                            messages.map(msg => {
                                const isCurrentUser = msg.author.uid === user?.uid;
                                return (
                                    <div key={msg.id} className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                        {!isCurrentUser && (
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{getInitials(msg.author.displayName)}</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                            <p className="text-sm">{msg.text}</p>
                                            <p className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{msg.createdAt ? format(msg.createdAt.toDate(), 'dd/MM/yy HH:mm') : ''}</p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                    <div className="p-4 border-t bg-background flex items-center gap-2">
                        <Textarea 
                            placeholder="Escreva a sua mensagem..." 
                            className="flex-1" 
                            rows={1}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <Button onClick={handleSendMessage} disabled={isSubmitting || !newMessage.trim()}>
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4"/> : <Send className="h-4 w-4"/>}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
