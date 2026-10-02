'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserRole, TeamMember } from '@/app/projects/[id]/page';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { ClientCommunicationTab } from './client-communication-tab';

const LoadingComponent = () => <div className="flex h-64 w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></div>;

const MinutesOfMeetingTab = dynamic(() => import('./minutes-of-meeting-tab'), { loading: LoadingComponent });
const TransmittalsTab = dynamic(() => import('./transmittals-tab'), { loading: LoadingComponent });
const RfiTab = dynamic(() => import('./rfi-tab'), { loading: LoadingComponent });


interface FormalCommunicationTabProps {
    projectId: string;
    teamMembers: TeamMember[];
    userRole: UserRole | null;
}

export default function FormalCommunicationTab({ projectId, teamMembers, userRole }: FormalCommunicationTabProps) {
    return (
        <div className="p-4">
            <Tabs defaultValue="minutes">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="minutes">Atas de Reunião</TabsTrigger>
                    <TabsTrigger value="transmittals">Submissões (Transmittals)</TabsTrigger>
                    <TabsTrigger value="rfi">Respostas à Obra (RFI)</TabsTrigger>
                    <TabsTrigger value="client-chat">Chat com Cliente</TabsTrigger>
                </TabsList>
                <TabsContent value="minutes">
                    <div className="pt-4">
                        <MinutesOfMeetingTab projectId={projectId} teamMembers={teamMembers} userRole={userRole} />
                    </div>
                </TabsContent>
                <TabsContent value="transmittals">
                    <div className="pt-4">
                        <TransmittalsTab projectId={projectId} teamMembers={teamMembers} userRole={userRole} />
                    </div>
                </TabsContent>
                 <TabsContent value="rfi">
                    <div className="pt-4">
                        <RfiTab projectId={projectId} />
                    </div>
                </TabsContent>
                 <TabsContent value="client-chat">
                    <div className="pt-4">
                        <ClientCommunicationTab projectId={projectId} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
