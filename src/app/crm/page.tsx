'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRequireAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
    collection,
    collectionGroup,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc,
    addDoc,
    writeBatch,
    serverTimestamp,
    getDocs,
    increment,
    type Timestamp,
} from 'firebase/firestore';
import { Header } from '@/components/Header';
import { CrmFunnel } from '@/components/crm-funnel';
import {
    Loader2,
    Briefcase,
    DollarSign,
    Target,
    Percent,
    TrendingUp,
    CalendarClock,
    AreaChart,
    HelpCircle,
    Plus,
    Download,
    FileSpreadsheet,
    Building2,
    Users,
    Search,
    Check,
    CheckCircle2,
    Clock,
    Calendar,
    Phone,
    Mail,
    HardHat,
    ArrowRight,
    X,
    UserCheck,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Opportunity, Lead, Activity, CustomerQuote, Stage, STAGES, Account } from '@/types/crm';
import { OpportunityDetails } from '@/components/opportunity-details';
import { LeadDetails } from '@/components/lead-details';
import { AccountsTab } from '@/components/crm/accounts-tab';
import { AccountDetails } from '@/components/crm/account-details';
import { LeadsTab } from '@/components/leads-tab';
import { CrmQuotesTab } from '@/components/crm/crm-quotes-tab';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { differenceInDays, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return '0,00 Kz';
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
    }).format(value);
};

function CrmPageContent() {
    const { user, loading: authLoading } = useRequireAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Active tab management with URL sync
    const tabParam = searchParams.get('tab');
    const validTabs = ['dashboard', 'funnel', 'leads', 'accounts', 'quotes'];
    const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'dashboard';
    const [currentTab, setCurrentTab] = useState<string>(initialTab);

    useEffect(() => {
        if (tabParam && validTabs.includes(tabParam)) {
            setCurrentTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (tab: string) => {
        setCurrentTab(tab);
        router.replace(`/crm?tab=${tab}`, { scroll: false });
    };

    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
    const [opportunityActivities, setOpportunityActivities] = useState<Activity[]>([]);

    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [leadActivities, setLeadActivities] = useState<Activity[]>([]);

    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [accountActivities, setAccountActivities] = useState<Activity[]>([]);

    // New Opportunity Dialog state
    const [isCreateOppOpen, setIsCreateOppOpen] = useState(false);
    const [newOppName, setNewOppName] = useState('');
    const [newOppAccount, setNewOppAccount] = useState('');
    const [newOppValue, setNewOppValue] = useState('');
    const [isSubmittingOpp, setIsSubmittingOpp] = useState(false);

    // Fetch opportunities
    useEffect(() => {
        if (!user) return;
        setLoadingData(true);
        const q = query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (!snapshot.empty) {
                const oppsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();
                    const opportunity = {
                        id: docSnap.id,
                        ...data,
                        createdAt: (data.createdAt as Timestamp)?.toDate?.() || data.createdAt,
                        closedAt: (data.closedAt as Timestamp)?.toDate?.() || data.closedAt,
                    } as Opportunity;

                    // Fetch activities for each opportunity
                    try {
                        const activitiesQuery = query(collection(db, 'opportunities', opportunity.id, 'activities'));
                        const activitiesSnapshot = await getDocs(activitiesQuery);
                        opportunity.activities = activitiesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Activity);
                    } catch {
                        opportunity.activities = [];
                    }

                    return opportunity;
                }));
                setOpportunities(oppsData);
            } else {
                setOpportunities([]);
            }
            setLoadingData(false);
        }, (error) => {
            console.error("Error fetching opportunities:", error);
            setLoadingData(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Fetch leads, accounts, quotes & users
    useEffect(() => {
        if (!user) return;
        const leadsQuery = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
        const accountsQuery = query(collection(db, 'accounts'), orderBy('createdAt', 'desc'));
        const usersQuery = query(collection(db, 'users'));

        const unsubLeads = onSnapshot(leadsQuery, (snapshot) => {
            if (!snapshot.empty) {
                setLeads(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Lead)));
            } else {
                setLeads([]);
            }
        }, () => {});

        const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
            if (!snapshot.empty) {
                setAccounts(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Account)));
            } else {
                setAccounts([]);
            }
        }, () => {});

        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            setUsers(snapshot.docs.map(docSnap => ({ uid: docSnap.id, ...docSnap.data() })));
        }, () => {});

        // Fetch quotes from both root collection and subcollections
        let unsubRootQuotes = () => {};
        let unsubGroupQuotes = () => {};
        const groupQuotesMap = new Map<string, any>();
        const rootQuotesMap = new Map<string, any>();

        const syncQuotes = () => {
            const merged = new Map([...groupQuotesMap, ...rootQuotesMap]);
            setQuotes(Array.from(merged.values()));
        };

        try {
            const rootQ = query(collection(db, 'customerQuotes'), orderBy('createdAt', 'desc'));
            unsubRootQuotes = onSnapshot(rootQ, (snapshot) => {
                rootQuotesMap.clear();
                snapshot.docs.forEach(docSnap => {
                    rootQuotesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
                });
                syncQuotes();
            }, () => {});
        } catch {}

        try {
            const groupQ = query(collectionGroup(db, 'customerQuotes'), orderBy('createdAt', 'desc'));
            unsubGroupQuotes = onSnapshot(groupQ, (snapshot) => {
                groupQuotesMap.clear();
                snapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    groupQuotesMap.set(docSnap.id, {
                        id: docSnap.id,
                        ...data,
                        opportunityId: data.opportunityId || docSnap.ref.parent.parent?.id,
                    });
                });
                syncQuotes();
            }, () => {});
        } catch {}

        return () => {
            unsubLeads();
            unsubAccounts();
            unsubUsers();
            unsubRootQuotes();
            unsubGroupQuotes();
        };
    }, [user]);

    // Real Firestore Data directly
    const effectiveOpportunities = opportunities;
    const effectiveLeads = leads;
    const effectiveAccounts = accounts;

    const effectiveQuotes = useMemo(() => {
        return quotes.map(q => {
            const opp = opportunities.find(o => o.id === q.opportunityId);
            return {
                ...q,
                opportunityName: opp?.name || q.opportunityName,
                clientName: opp?.accountName || q.clientName,
            };
        });
    }, [quotes, opportunities]);

    // Universal Search State
    const [universalSearch, setUniversalSearch] = useState('');

    const searchResults = useMemo(() => {
        if (!universalSearch.trim()) return null;
        const term = universalSearch.toLowerCase().trim();

        const matchedOpps = effectiveOpportunities.filter(o => 
            o.name.toLowerCase().includes(term) || (o.accountName && o.accountName.toLowerCase().includes(term))
        ).slice(0, 5);

        const matchedLeads = effectiveLeads.filter(l => 
            l.name.toLowerCase().includes(term) || (l.company && l.company.toLowerCase().includes(term)) || (l.email && l.email.toLowerCase().includes(term))
        ).slice(0, 5);

        const matchedAccounts = effectiveAccounts.filter(a => 
            a.name.toLowerCase().includes(term) || (a.nif && a.nif.toLowerCase().includes(term)) || (a.city && a.city.toLowerCase().includes(term))
        ).slice(0, 5);

        const matchedQuotes = effectiveQuotes.filter(q => 
            q.title.toLowerCase().includes(term) || (q.quoteNumber && q.quoteNumber.toLowerCase().includes(term)) || (q.clientName && q.clientName.toLowerCase().includes(term))
        ).slice(0, 5);

        const totalCount = matchedOpps.length + matchedLeads.length + matchedAccounts.length + matchedQuotes.length;

        return {
            totalCount,
            opps: matchedOpps,
            leads: matchedLeads,
            accounts: matchedAccounts,
            quotes: matchedQuotes,
        };
    }, [universalSearch, effectiveOpportunities, effectiveLeads, effectiveAccounts, effectiveQuotes]);

    // All Pending Activities for Dashboard "Próximas Ações"
    const allPendingActivities = useMemo(() => {
        const list: Array<Activity & { contextName: string; contextId: string; contextType: 'opportunity' | 'account' }> = [];
        
        effectiveOpportunities.forEach(opp => {
            (opp.activities || []).forEach(act => {
                if (act.status === 'Pendente') {
                    list.push({
                        ...act,
                        contextName: opp.name,
                        contextId: opp.id,
                        contextType: 'opportunity',
                    });
                }
            });
        });

        return list.sort((a, b) => {
            const timeA = (a.dueDate as any)?.toDate?.()?.getTime() || (a.dueDate ? new Date(a.dueDate as any).getTime() : 9999999999999);
            const timeB = (b.dueDate as any)?.toDate?.()?.getTime() || (b.dueDate ? new Date(b.dueDate as any).getTime() : 9999999999999);
            return timeA - timeB;
        });
    }, [effectiveOpportunities]);

    const handleCompleteActivity = async (oppId: string, activityId: string) => {
        try {
            const actRef = doc(db, 'opportunities', oppId, 'activities', activityId);
            await updateDoc(actRef, {
                status: 'Concluída',
                completedAt: serverTimestamp(),
            });
            setOpportunities(prev => prev.map(opp => {
                if (opp.id !== oppId) return opp;
                return {
                    ...opp,
                    activities: (opp.activities || []).map(act => act.id === activityId ? { ...act, status: 'Concluída' } : act)
                };
            }));
            toast({ title: 'Atividade concluída com sucesso!' });
        } catch (err) {
            console.error('Error completing activity:', err);
            toast({ title: 'Erro ao concluir atividade', variant: 'destructive' });
        }
    };

    // Fetch activities for selected opportunity
    useEffect(() => {
        if (!selectedOpportunity) {
            setOpportunityActivities([]);
            return;
        }

        const q = query(collection(db, 'opportunities', selectedOpportunity.id, 'activities'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activityItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
            setOpportunityActivities(activityItems);
        }, () => {
            setOpportunityActivities(selectedOpportunity.activities || []);
        });

        return () => unsubscribe();
    }, [selectedOpportunity]);

    // Fetch activities for selected lead
    useEffect(() => {
        if (!selectedLead) {
            setLeadActivities([]);
            return;
        }

        const q = query(collection(db, 'leads', selectedLead.id, 'activities'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activityItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
            setLeadActivities(activityItems);
        }, () => {
            setLeadActivities(selectedLead.activities || []);
        });

        return () => unsubscribe();
    }, [selectedLead]);

    // Fetch activities for selected account
    useEffect(() => {
        if (!selectedAccount) {
            setAccountActivities([]);
            return;
        }

        const q = query(collection(db, 'accounts', selectedAccount.id, 'activities'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activityItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
            setAccountActivities(activityItems);
        }, () => {
            setAccountActivities([]);
        });

        return () => unsubscribe();
    }, [selectedAccount]);

    const handleOpportunityClick = (opportunity: Opportunity) => {
        setSelectedAccount(null);
        setSelectedLead(null);
        setSelectedOpportunity(opportunity);
    };

    const handleLeadClick = (lead: Lead) => {
        setSelectedAccount(null);
        setSelectedOpportunity(null);
        setSelectedLead(lead);
    };

    const handleAccountClick = (account: Account) => {
        setSelectedLead(null);
        setSelectedOpportunity(null);
        setSelectedAccount(account);
    };

    const handleSheetClose = () => {
        setSelectedOpportunity(null);
        setSelectedLead(null);
        setSelectedAccount(null);
    };

    const handleCreateOpportunity = async () => {
        if (!user) return;
        if (!newOppName.trim() || !newOppAccount.trim() || !newOppValue.trim()) {
            toast({
                title: 'Campos obrigatórios',
                description: 'Preencha o nome do projeto, cliente e valor estimado.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmittingOpp(true);
        try {
            const parsedValue = parseFloat(newOppValue.replace(/[^0-9.]/g, '')) || 0;
            const oppData = {
                name: newOppName.trim(),
                accountId: 'manual-acc',
                accountName: newOppAccount.trim(),
                value: parsedValue,
                stage: 'Qualificação' as Stage,
                createdAt: serverTimestamp(),
                author: {
                    uid: user.uid,
                    displayName: user.displayName || user.email || 'Utilizador Comercial',
                },
            };

            await addDoc(collection(db, 'opportunities'), oppData);

            toast({
                title: 'Oportunidade Criada!',
                description: `"${newOppName}" foi adicionada à fase de Qualificação.`,
            });

            setNewOppName('');
            setNewOppAccount('');
            setNewOppValue('');
            setIsCreateOppOpen(false);
            handleTabChange('funnel');
        } catch (error) {
            console.error("Error creating opportunity:", error);
            toast({
                title: 'Erro ao criar oportunidade',
                description: 'Não foi possível gravar os dados. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmittingOpp(false);
        }
    };

    const handleExportPipelineCsv = () => {
        const headers = ['Oportunidade', 'Cliente / Conta', 'Fase', 'Valor Estimado (Kz)', 'Data de Criação'];
        const rows = effectiveOpportunities.map(opp => {
            const d = opp.createdAt ? (opp.createdAt as any)?.toDate?.() || new Date(opp.createdAt as any) : new Date();
            const dateStr = format(d, 'dd/MM/yyyy');
            return [
                `"${opp.name.replace(/"/g, '""')}"`,
                `"${opp.accountName.replace(/"/g, '""')}"`,
                `"${opp.stage}"`,
                opp.value,
                `"${dateStr}"`
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `pipeline_comercial_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: 'Exportação Concluída',
            description: 'O relatório do pipeline em CSV foi descarregado com sucesso.',
        });
    };

    const handleApproveQuote = async (quote: CustomerQuote, opportunity: Opportunity) => {
        if (!user) return;

        toast({ title: 'A aprovar proposta e a criar projeto...', description: `A oportunidade "${opportunity.name}" está a ser convertida.` });

        try {
            const batch = writeBatch(db);

            // 0. Ensure Client Account in Empresa Hub
            let targetAccountId = opportunity.accountId;
            if (!targetAccountId && opportunity.accountName) {
                const existing = effectiveAccounts.find(a => a.name.toLowerCase().trim() === opportunity.accountName.toLowerCase().trim());
                if (existing) {
                    targetAccountId = existing.id;
                    const existingAccRef = doc(db, 'accounts', existing.id);
                    batch.update(existingAccRef, {
                        totalProjects: increment(1),
                        totalContracted: increment(quote.salePrice || 0),
                        lastInteraction: serverTimestamp(),
                    });
                } else {
                    const newAccRef = doc(collection(db, 'accounts'));
                    targetAccountId = newAccRef.id;
                    batch.set(newAccRef, {
                        name: opportunity.accountName.trim(),
                        type: 'Cliente',
                        status: 'Ativo',
                        totalProjects: 1,
                        totalContracted: quote.salePrice || 0,
                        origin: opportunity.origin || 'CRM - Proposta Aprovada',
                        createdAt: serverTimestamp(),
                        lastInteraction: serverTimestamp(),
                        author: { uid: user.uid, displayName: user.displayName || user.email },
                    });
                }
            }

            // 1. Create the project document
            const projectRef = doc(collection(db, 'projects'));
            const newProjectId = projectRef.id;
            batch.set(projectRef, {
                name: opportunity.name,
                ownerId: user.uid,
                createdAt: serverTimestamp(),
                status: 'active',
                progress: 0,
                clientName: opportunity.accountName,
                accountId: targetAccountId || null,
            });

            // 2. Update Opportunity Stage to "Ganha" and link project
            const oppRef = doc(db, 'opportunities', opportunity.id);
            batch.update(oppRef, { 
                stage: 'Ganha', 
                projectId: newProjectId, 
                accountId: targetAccountId || opportunity.accountId || null,
                closedAt: serverTimestamp() 
            });

            // 3. Create the main contract document from the quote
            const contractRef = doc(db, 'projects', newProjectId, 'contracts', 'main');
            batch.set(contractRef, {
                projectId: newProjectId,
                fileName: `Contrato de Proposta - ${quote.title}`,
                fileUrl: '',
                contractValue: quote.salePrice,
                createdAt: serverTimestamp(),
            });

            // 4. Create the initial WBS root item from the quote's sale price
            const wbsRef = doc(collection(db, 'projects', newProjectId, 'wbs'));
            batch.set(wbsRef, {
                name: `Orçamento Contratual - ${opportunity.name}`,
                parentId: null,
                budget: quote.salePrice,
                progress: 0,
            });

            // 5. Create the initial financial transaction (Receita)
            const transactionRef = doc(collection(db, 'projects', newProjectId, 'transactions'));
            batch.set(transactionRef, {
                description: `Contrato inicial - ${opportunity.name}`,
                amount: quote.salePrice,
                date: serverTimestamp(),
                type: 'Receita',
                status: 'Pendente',
                accountId: 'initial_contract',
                accountName: 'Contrato Inicial',
                sourceOpportunityId: opportunity.id,
            });

            // 6. Update quote status to "Aprovada"
            const quoteRef = doc(db, 'opportunities', opportunity.id, 'customerQuotes', quote.id);
            batch.update(quoteRef, { status: 'Aprovada' });

            await batch.commit();

            toast({
                title: 'Projeto Criado com Sucesso!',
                description: `${opportunity.name} está agora no seu dashboard.`,
                action: (
                    <Button onClick={() => router.push(`/projects/${newProjectId}`)} variant="outline">
                        Ver Projeto
                    </Button>
                ),
            });
            handleSheetClose();

        } catch (error) {
            console.error("Error creating project from approved quote: ", error);
            toast({ title: 'Erro ao criar projeto', description: 'Ocorreu um erro ao converter a oportunidade.', variant: 'destructive' });
        }
    };

    const handleConvertOpportunity = async (opportunity: Opportunity) => {
        if (!user) return;
        if (opportunity.stage === 'Ganha' || opportunity.stage === 'Perdida') {
            toast({ title: 'Ação não permitida', description: 'Esta oportunidade já foi fechada.', variant: 'destructive' });
            return;
        }

        toast({ title: 'A converter oportunidade...', description: `A oportunidade "${opportunity.name}" está a ser convertida num projeto.` });

        try {
            const batch = writeBatch(db);

            // 0. Ensure Client Account in Empresa Hub
            let targetAccountId = opportunity.accountId;
            if (!targetAccountId && opportunity.accountName) {
                const existing = effectiveAccounts.find(a => a.name.toLowerCase().trim() === opportunity.accountName.toLowerCase().trim());
                if (existing) {
                    targetAccountId = existing.id;
                    const existingAccRef = doc(db, 'accounts', existing.id);
                    batch.update(existingAccRef, {
                        totalProjects: increment(1),
                        totalContracted: increment(opportunity.value || 0),
                        lastInteraction: serverTimestamp(),
                    });
                } else {
                    const newAccRef = doc(collection(db, 'accounts'));
                    targetAccountId = newAccRef.id;
                    batch.set(newAccRef, {
                        name: opportunity.accountName.trim(),
                        type: 'Cliente',
                        status: 'Ativo',
                        totalProjects: 1,
                        totalContracted: opportunity.value || 0,
                        origin: opportunity.origin || 'CRM - Oportunidade Ganha',
                        createdAt: serverTimestamp(),
                        lastInteraction: serverTimestamp(),
                        author: { uid: user.uid, displayName: user.displayName || user.email },
                    });
                }
            }

            // 1. Create the project document
            const projectRef = doc(collection(db, 'projects'));
            const newProjectId = projectRef.id;
            batch.set(projectRef, {
                name: opportunity.name,
                ownerId: user.uid,
                createdAt: serverTimestamp(),
                status: 'active',
                progress: 0,
                clientName: opportunity.accountName,
                accountId: targetAccountId || null,
            });

            // 2. Update Opportunity Stage to "Ganha" and link project
            const oppRef = doc(db, 'opportunities', opportunity.id);
            batch.update(oppRef, { 
                stage: 'Ganha', 
                closedAt: serverTimestamp(), 
                projectId: newProjectId,
                accountId: targetAccountId || opportunity.accountId || null,
            });

            // 3. Create the main contract document from the opportunity value
            const contractRef = doc(db, 'projects', newProjectId, 'contracts', 'main');
            batch.set(contractRef, {
                projectId: newProjectId,
                fileName: `Contrato de Oportunidade - ${opportunity.name}`,
                fileUrl: '',
                contractValue: opportunity.value,
                createdAt: serverTimestamp(),
            });

            // 4. Create the initial WBS root item from the opportunity value
            const wbsRef = doc(collection(db, 'projects', newProjectId, 'wbs'));
            batch.set(wbsRef, {
                name: `Orçamento Contratual - ${opportunity.name}`,
                parentId: null,
                budget: opportunity.value,
                progress: 0,
            });

            // 5. Create the initial financial transaction (Receita)
            const transactionRef = doc(collection(db, 'projects', newProjectId, 'transactions'));
            batch.set(transactionRef, {
                description: `Contrato inicial da oportunidade - ${opportunity.name}`,
                amount: opportunity.value,
                date: serverTimestamp(),
                type: 'Receita',
                status: 'Pendente',
                accountId: 'initial_contract',
                accountName: 'Contrato Inicial',
                sourceOpportunityId: opportunity.id,
            });

            await batch.commit();

            toast({
                title: 'Projeto Criado com Sucesso!',
                description: `${opportunity.name} está agora no seu dashboard.`,
                action: (
                    <Button onClick={() => router.push(`/projects/${newProjectId}`)} variant="outline">
                        Ver Projeto
                    </Button>
                ),
            });
            handleSheetClose();

        } catch (error) {
            console.error("Error converting opportunity to project: ", error);
            toast({ title: 'Erro ao criar projeto', description: 'Ocorreu um erro ao converter a oportunidade.', variant: 'destructive' });
        }
    };

    const kpiData = useMemo(() => {
        const opps = effectiveOpportunities;
        const openOpportunities = opps.filter(opp => opp.stage !== 'Ganha' && opp.stage !== 'Perdida');
        const wonOpportunities = opps.filter(opp => opp.stage === 'Ganha');
        const lostOpportunities = opps.filter(opp => opp.stage === 'Perdida');

        const pipelineValue = openOpportunities.reduce((sum, opp) => sum + opp.value, 0);
        const wonValue = wonOpportunities.reduce((sum, opp) => sum + opp.value, 0);

        const totalClosed = wonOpportunities.length + lostOpportunities.length;
        const conversionRate = totalClosed > 0 ? (wonOpportunities.length / totalClosed) * 100 : 0;

        const salesCycleDurations = wonOpportunities
            .map(opp => {
                if (opp.createdAt && opp.closedAt) {
                    const c = (opp.createdAt as any)?.toDate?.() || new Date(opp.createdAt as any);
                    const cl = (opp.closedAt as any)?.toDate?.() || new Date(opp.closedAt as any);
                    return differenceInDays(cl, c);
                }
                return null;
            })
            .filter((duration): duration is number => duration !== null && duration >= 0);

        const avgSalesCycle = salesCycleDurations.length > 0
            ? salesCycleDurations.reduce((a, b) => a + b, 0) / salesCycleDurations.length
            : 35; // Default realistic 35 days in civil engineering

        const stageProbabilities: { [K in Stage]?: number } = {
            'Qualificação': 0.1,
            'Contato Realizado': 0.2,
            'Visita Agendada': 0.3,
            'Proposta Enviada': 0.5,
            'Negociação': 0.75,
        };

        const salesForecast = openOpportunities.reduce((sum, opp) => {
            const probability = stageProbabilities[opp.stage] || 0;
            return sum + (opp.value * probability);
        }, 0);

        return {
            pipelineValue,
            openCount: openOpportunities.length,
            conversionRate,
            wonValue,
            avgSalesCycle,
            salesForecast,
        };
    }, [effectiveOpportunities]);

    const pipelineByStageData = useMemo(() => {
        const data = STAGES.filter(s => s !== 'Ganha' && s !== 'Perdida').map(stage => {
            const stageValue = effectiveOpportunities
                .filter(opp => opp.stage === stage)
                .reduce((sum, opp) => sum + opp.value, 0);
            return { name: stage, value: stageValue };
        });
        return data;
    }, [effectiveOpportunities]);

    const leadSourceData = useMemo(() => {
        const sourceCounts: { [key: string]: number } = {};
        effectiveLeads.forEach(lead => {
            const source = lead.source || 'Outra';
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        return Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
    }, [effectiveLeads]);

    const monthlySalesData = useMemo(() => {
        const wonOpps = effectiveOpportunities.filter(opp => opp.stage === 'Ganha' && opp.closedAt);
        const salesByMonth: Record<string, number> = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const month = subMonths(new Date(), i);
            const monthKey = format(month, 'MMM/yy', { locale: ptBR });
            salesByMonth[monthKey] = 0;
        }

        wonOpps.forEach(opp => {
            const date = (opp.closedAt as any)?.toDate ? (opp.closedAt as any).toDate() : new Date(opp.closedAt as any);
            if (!date) return;
            const monthKey = format(date, 'MMM/yy', { locale: ptBR });
            if (monthKey in salesByMonth) {
                salesByMonth[monthKey] += opp.value;
            } else {
                // If closed before the 6 month window, attribute to first visible slot
                const keys = Object.keys(salesByMonth);
                if (keys.length > 0) salesByMonth[keys[0]] += opp.value;
            }
        });

        return Object.entries(salesByMonth).map(([name, Vendas]) => ({ name, Vendas }));
    }, [effectiveOpportunities]);

    const chartConfig = {
        value: { label: "Valor", color: "hsl(var(--chart-1))" },
    };

    const salesChartConfig = {
        Vendas: { label: "Vendas", color: "hsl(var(--chart-1))" },
    };

    if (authLoading || (loadingData && opportunities.length === 0 && leads.length === 0) || !user) {
        return (
            <div className="flex flex-col h-screen bg-secondary/50">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <div className="flex items-center text-lg text-muted-foreground">
                        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                        <p>A carregar o CRM...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-secondary/50">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-4 md:py-8 pb-28 md:pb-12">
                <TooltipProvider>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                                <Briefcase className="h-8 w-8 text-primary" />
                                Comercial & Vendas (CRM)
                            </h1>
                            <p className="text-muted-foreground">
                                Gestão integral de pipeline, orçamentos, propostas comerciais e clientes em Angola.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* Universal CRM Search */}
                            <div className="relative min-w-[280px]">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Pesquisa rápida (Lead, Conta, Opp, Proposta)..."
                                    className="pl-8 text-xs bg-background h-9"
                                    value={universalSearch}
                                    onChange={(e) => setUniversalSearch(e.target.value)}
                                />
                                {universalSearch && (
                                    <button
                                        onClick={() => setUniversalSearch('')}
                                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}

                                {/* Universal Search Results Dropdown */}
                                {searchResults && (
                                    <div className="absolute left-0 right-0 top-10 bg-popover text-popover-foreground border shadow-lg rounded-md p-2 z-50 max-h-80 overflow-y-auto space-y-2 text-xs">
                                        {searchResults.totalCount === 0 ? (
                                            <p className="text-center py-3 text-muted-foreground">Nenhum resultado encontrado.</p>
                                        ) : (
                                            <>
                                                {searchResults.opps.length > 0 && (
                                                    <div>
                                                        <div className="font-semibold text-muted-foreground uppercase text-[10px] px-2 py-1">Oportunidades</div>
                                                        {searchResults.opps.map(opp => (
                                                            <div
                                                                key={opp.id}
                                                                onClick={() => { handleOpportunityClick(opp); setUniversalSearch(''); }}
                                                                className="px-2 py-1.5 hover:bg-muted rounded cursor-pointer flex justify-between items-center"
                                                            >
                                                                <span className="font-medium truncate">{opp.name}</span>
                                                                <Badge variant="outline" className="text-[10px] ml-2 shrink-0">{opp.stage}</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {searchResults.leads.length > 0 && (
                                                    <div>
                                                        <div className="font-semibold text-muted-foreground uppercase text-[10px] px-2 py-1 border-t mt-1">Leads Potenciais</div>
                                                        {searchResults.leads.map(lead => (
                                                            <div
                                                                key={lead.id}
                                                                onClick={() => { handleLeadClick(lead); setUniversalSearch(''); }}
                                                                className="px-2 py-1.5 hover:bg-muted rounded cursor-pointer flex justify-between items-center"
                                                            >
                                                                <span className="font-medium truncate">{lead.name} {lead.company ? `(${lead.company})` : ''}</span>
                                                                <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">{lead.status}</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {searchResults.accounts.length > 0 && (
                                                    <div>
                                                        <div className="font-semibold text-muted-foreground uppercase text-[10px] px-2 py-1 border-t mt-1">Contas & Empresas</div>
                                                        {searchResults.accounts.map(acc => (
                                                            <div
                                                                key={acc.id}
                                                                onClick={() => { handleAccountClick(acc); setUniversalSearch(''); }}
                                                                className="px-2 py-1.5 hover:bg-muted rounded cursor-pointer flex justify-between items-center"
                                                            >
                                                                <span className="font-medium truncate">{acc.name}</span>
                                                                <span className="text-[10px] text-muted-foreground shrink-0">{acc.city || 'Luanda'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {searchResults.quotes.length > 0 && (
                                                    <div>
                                                        <div className="font-semibold text-muted-foreground uppercase text-[10px] px-2 py-1 border-t mt-1">Propostas Comerciais</div>
                                                        {searchResults.quotes.map(quote => (
                                                            <div
                                                                key={quote.id}
                                                                onClick={() => { handleTabChange('quotes'); setUniversalSearch(''); }}
                                                                className="px-2 py-1.5 hover:bg-muted rounded cursor-pointer flex justify-between items-center"
                                                            >
                                                                <span className="font-medium truncate">{quote.title}</span>
                                                                <Badge variant="outline" className="text-[10px] ml-2 shrink-0">{quote.status}</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Button variant="outline" onClick={handleExportPipelineCsv} className="gap-1.5 text-xs h-9">
                                <Download className="h-4 w-4" /> Exportar Pipeline
                            </Button>
                            <Button onClick={() => setIsCreateOppOpen(true)} className="gap-1.5 text-xs h-9">
                                <Plus className="h-4 w-4" /> Nova Oportunidade
                            </Button>
                        </div>
                    </div>

                    <Tabs value={currentTab} onValueChange={handleTabChange}>
                        <ScrollArea className="w-full whitespace-nowrap mb-6">
                            <TabsList className="bg-background/80 border p-1">
                                <TabsTrigger value="dashboard" className="gap-1.5">
                                    <AreaChart className="h-4 w-4" /> Dashboard
                                </TabsTrigger>
                                <TabsTrigger value="funnel" className="gap-1.5">
                                    <TrendingUp className="h-4 w-4" /> Funil de Vendas ({effectiveOpportunities.length})
                                </TabsTrigger>
                                <TabsTrigger value="quotes" className="gap-1.5">
                                    <FileSpreadsheet className="h-4 w-4" /> Propostas & Orçamentos ({effectiveQuotes.length})
                                </TabsTrigger>
                                <TabsTrigger value="leads" className="gap-1.5">
                                    <Users className="h-4 w-4" /> Clientes Potenciais ({effectiveLeads.length})
                                </TabsTrigger>
                                <TabsTrigger value="accounts" className="gap-1.5">
                                    <Building2 className="h-4 w-4" /> Contas & Empresas ({effectiveAccounts.length})
                                </TabsTrigger>
                            </TabsList>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>

                        {/* DASHBOARD TAB */}
                        <TabsContent value="dashboard" className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Valor em Pipeline</CardTitle>
                                        <Tooltip>
                                            <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                            <TooltipContent><p>Soma do valor de todas as oportunidades em aberto.</p></TooltipContent>
                                        </Tooltip>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{formatCurrency(kpiData.pipelineValue)}</div>
                                        <p className="text-xs text-muted-foreground">Soma das {kpiData.openCount} oportunidades em aberto.</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Valor Ganho (Total)</CardTitle>
                                        <Tooltip>
                                            <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                            <TooltipContent><p>Soma do valor de todas as oportunidades marcadas como "Ganha".</p></TooltipContent>
                                        </Tooltip>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-emerald-600">{formatCurrency(kpiData.wonValue)}</div>
                                        <p className="text-xs text-muted-foreground">Negócios fechados com sucesso.</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Previsão Ponderada</CardTitle>
                                        <Tooltip>
                                            <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                            <TooltipContent><p>Valor das oportunidades ponderado pela probabilidade de fecho da fase.</p></TooltipContent>
                                        </Tooltip>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{formatCurrency(kpiData.salesForecast)}</div>
                                        <p className="text-xs text-muted-foreground">Valor ponderado por fase do funil.</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                                        <Tooltip>
                                            <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                            <TooltipContent><p>Percentagem de oportunidades ganhas sobre o total fechado.</p></TooltipContent>
                                        </Tooltip>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{kpiData.conversionRate.toFixed(1)}%</div>
                                        <p className="text-xs text-muted-foreground">Eficácia de conversão comercial.</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Ciclo Médio de Venda</CardTitle>
                                        <Tooltip>
                                            <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                            <TooltipContent><p>Tempo médio, em dias, desde a criação até à vitória da proposta.</p></TooltipContent>
                                        </Tooltip>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{kpiData.avgSalesCycle.toFixed(0)} dias</div>
                                        <p className="text-xs text-muted-foreground">Duração média de negociação.</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Pipeline por Fase</CardTitle>
                                        <CardDescription>Volume financeiro distribuído nas etapas de negociação.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-64 w-full">
                                            <RechartsBarChart data={pipelineByStageData} layout="vertical" margin={{ left: 20 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} width={110} interval={0} />
                                                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                                                <Bar dataKey="value" layout="vertical" radius={5} fill="hsl(var(--primary))" />
                                            </RechartsBarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Evolução de Vendas</CardTitle>
                                        <CardDescription>Receita fechada nos últimos 6 meses (Kz).</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={salesChartConfig} className="h-64 w-full">
                                            <RechartsBarChart data={monthlySalesData}>
                                                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                                <YAxis tickFormatter={(value) => `${(Number(value) / 1000000).toFixed(0)}M`} />
                                                <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                                                <Bar dataKey="Vendas" fill="hsl(var(--chart-1))" radius={4} />
                                            </RechartsBarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Origem dos Clientes Potenciais</CardTitle>
                                        <CardDescription>Canais de aquisição de novos contactos.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={{}} className="h-64 w-full">
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <ChartTooltip content={<ChartTooltipContent />} />
                                                    <Pie data={leadSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                                        {leadSourceData.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* PRÓXIMAS AÇÕES & TAREFAS PENDENTES */}
                            <Card>
                                <CardHeader className="py-4 border-b bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CalendarClock className="h-5 w-5 text-primary" />
                                            <div>
                                                <CardTitle className="text-base font-semibold">Próximas Ações & Compromissos Comerciais</CardTitle>
                                                <CardDescription className="text-xs">
                                                    Atividades agendadas, reuniões e diligências comerciais pendentes em oportunidades ativas.
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="font-mono">
                                            {allPendingActivities.length} pendente(s)
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {allPendingActivities.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-70" />
                                            <p className="font-medium text-foreground">Todas as tarefas comerciais estão em dia!</p>
                                            <p>Nenhuma ação pendente ou em atraso encontrada nas oportunidades ativas.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y max-h-80 overflow-y-auto">
                                            {allPendingActivities.slice(0, 10).map((act) => {
                                                const dueDate = act.dueDate ? new Date((act.dueDate as any)?.toDate?.() || act.dueDate) : null;
                                                const isOverdue = dueDate && dueDate < new Date();
                                                const isToday = dueDate && dueDate.toDateString() === new Date().toDateString();

                                                return (
                                                    <div key={act.id} className="p-3 flex items-center justify-between hover:bg-muted/40 transition-colors text-xs gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-full bg-primary/10 text-primary">
                                                                {act.type === 'Chamada' ? <Phone className="h-4 w-4" /> :
                                                                 act.type === 'Reunião' ? <Users className="h-4 w-4" /> :
                                                                 act.type === 'Email' ? <Mail className="h-4 w-4" /> :
                                                                 act.type === 'Visita' ? <HardHat className="h-4 w-4" /> :
                                                                 <Calendar className="h-4 w-4" />}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-foreground">{act.text}</span>
                                                                    <Badge variant="outline" className="text-[10px] py-0">{act.type}</Badge>
                                                                </div>
                                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                                    <span className="font-medium text-foreground/80">{act.contextName}</span>
                                                                    {act.assignee && (
                                                                        <span className="flex items-center gap-1">
                                                                            <UserCheck className="h-3 w-3 text-primary" /> {act.assignee.displayName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0">
                                                            {dueDate ? (
                                                                <Badge className={
                                                                    isOverdue ? 'bg-destructive text-destructive-foreground' :
                                                                    isToday ? 'bg-amber-600 text-white' : 'bg-secondary text-secondary-foreground'
                                                                }>
                                                                    <Clock className="h-3 w-3 mr-1 inline" />
                                                                    {format(dueDate, 'dd/MM/yyyy')}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-[11px] text-muted-foreground">Sem data limite</span>
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs gap-1 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40"
                                                                onClick={() => handleCompleteActivity(act.contextId, act.id)}
                                                            >
                                                                <Check className="h-3.5 w-3.5 text-emerald-600" /> Concluir
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* FUNNEL TAB */}
                        <TabsContent value="funnel">
                            <CrmFunnel
                                initialOpportunities={effectiveOpportunities}
                                onOpportunityClick={handleOpportunityClick}
                                users={users}
                            />
                        </TabsContent>

                        {/* QUOTES TAB */}
                        <TabsContent value="quotes">
                            <CrmQuotesTab
                                quotes={effectiveQuotes}
                                opportunities={effectiveOpportunities}
                                onSelectOpportunity={(oppId) => {
                                    const opp = effectiveOpportunities.find(o => o.id === oppId);
                                    if (opp) {
                                        setSelectedOpportunity(opp);
                                    }
                                }}
                            />
                        </TabsContent>

                        {/* LEADS TAB */}
                        <TabsContent value="leads">
                            <LeadsTab
                                initialLeads={effectiveLeads}
                                onLeadClick={handleLeadClick}
                                users={users}
                            />
                        </TabsContent>

                        {/* ACCOUNTS TAB */}
                        <TabsContent value="accounts">
                            <AccountsTab
                                initialAccounts={effectiveAccounts}
                                onAccountClick={handleAccountClick}
                                users={users}
                            />
                        </TabsContent>
                    </Tabs>
                </TooltipProvider>
            </main>

            {/* QUICK CREATE OPPORTUNITY DIALOG */}
            <Dialog open={isCreateOppOpen} onOpenChange={setIsCreateOppOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nova Oportunidade Comercial</DialogTitle>
                        <DialogDescription>
                            Registe um novo projeto ou concurso no funil de vendas comercial.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="opp-name">Nome do Projeto / Oportunidade</Label>
                            <Input
                                id="opp-name"
                                placeholder="Ex: Construção de Armazém Logístico Viana"
                                value={newOppName}
                                onChange={(e) => setNewOppName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="opp-account">Nome do Cliente / Empresa</Label>
                            <Input
                                id="opp-account"
                                placeholder="Ex: Cuca Bebidas de Angola"
                                value={newOppAccount}
                                onChange={(e) => setNewOppAccount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="opp-value">Valor Estimado do Contrato (Kz)</Label>
                            <Input
                                id="opp-value"
                                type="number"
                                placeholder="Ex: 85000000"
                                value={newOppValue}
                                onChange={(e) => setNewOppValue(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOppOpen(false)} disabled={isSubmittingOpp}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateOpportunity} disabled={isSubmittingOpp}>
                            {isSubmittingOpp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            Criar Oportunidade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DETAILS SHEET */}
            <Sheet open={!!selectedOpportunity || !!selectedLead || !!selectedAccount} onOpenChange={(open) => !open && handleSheetClose()}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    {selectedOpportunity && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{selectedOpportunity.name}</SheetTitle>
                                <SheetDescription>
                                    Acompanhe o histórico de interações e as propostas para esta oportunidade.
                                </SheetDescription>
                            </SheetHeader>
                            <OpportunityDetails
                                opportunity={selectedOpportunity}
                                activities={opportunityActivities}
                                onApproveQuote={handleApproveQuote}
                                onConvertOpportunity={handleConvertOpportunity}
                                users={users}
                            />
                        </>
                    )}
                    {selectedLead && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{selectedLead.name}</SheetTitle>
                                <SheetDescription>
                                    Acompanhe e qualifique este cliente potencial antes de o converter numa oportunidade.
                                </SheetDescription>
                            </SheetHeader>
                            <LeadDetails
                                lead={selectedLead}
                                activities={leadActivities}
                                users={users}
                            />
                        </>
                    )}
                    {selectedAccount && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{selectedAccount.name}</SheetTitle>
                                <SheetDescription>
                                    Visão 360º da conta, incluindo oportunidades e histórico de interações.
                                </SheetDescription>
                            </SheetHeader>
                            <AccountDetails
                                account={selectedAccount}
                                activities={accountActivities}
                                opportunities={effectiveOpportunities.filter(opp => opp.accountId === selectedAccount.id || opp.accountName === selectedAccount.name)}
                                quotes={effectiveQuotes.filter(q => q.accountId === selectedAccount.id || q.accountName === selectedAccount.name || q.clientName === selectedAccount.name)}
                                users={users}
                            />
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

export default function CrmPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col h-screen bg-secondary/50">
                <Header />
                <main className="flex flex-1 items-center justify-center">
                    <div className="flex items-center text-lg text-muted-foreground">
                        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                        <p>A carregar o CRM...</p>
                    </div>
                </main>
            </div>
        }>
            <CrmPageContent />
        </Suspense>
    );
}
