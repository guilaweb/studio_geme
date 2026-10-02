
'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Users, Building, Pencil, Trash2 } from 'lucide-react';
import { type Supplier, SupplierCategory } from '@/types/suppliers';
import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@/app/projects/[id]/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SuppliersTabProps {
    projectId: string;
    userRole: UserRole | null;
}

export default function SuppliersTab({ projectId, userRole }: SuppliersTabProps) {
    const { user, idToken } = useAuth();
    const { toast } = useToast();

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [name, setName] = useState('');
    const [category, setCategory] = useState<SupplierCategory>('Serviços');
    const [contactPerson, setContactPerson] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    const canEdit = userRole === 'Editor' || userRole === 'Gestor';

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        const q = query(collection(db, 'projects', projectId, 'suppliers'), orderBy('name', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSuppliers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Supplier));
            setSuppliers(fetchedSuppliers);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching suppliers: ", error);
            toast({ title: 'Erro ao carregar fornecedores', variant: 'destructive' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, toast]);

    const resetForm = () => {
        setName('');
        setCategory('Serviços');
        setContactPerson('');
        setEmail('');
        setPhone('');
        setAddress('');
        setEditingSupplier(null);
        setIsDialogOpen(false);
    };

    const handleOpenDialog = (supplier: Supplier | null = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setName(supplier.name);
            setCategory(supplier.category);
            setContactPerson(supplier.contactPerson || '');
            setEmail(supplier.email || '');
            setPhone(supplier.phone || '');
            setAddress(supplier.address || '');
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!canEdit || !user) return;
        if (!name.trim() || !category) {
            toast({ title: 'Campos obrigatórios em falta', description: 'Nome e categoria são obrigatórios.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        const supplierData = { name, category, contactPerson, email, phone, address };

        try {
            if (editingSupplier) {
                const response = await fetch(`/api/projects/${projectId}/suppliers/${editingSupplier.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify(supplierData),
                });
                if (!response.ok) throw new Error((await response.json()).error || 'Falha ao atualizar fornecedor.');
                toast({ title: 'Fornecedor atualizado com sucesso!' });
            } else {
                await addDoc(collection(db, 'projects', projectId, 'suppliers'), {
                    ...supplierData,
                    author: { uid: user.uid, displayName: user.displayName || user.email },
                    createdAt: serverTimestamp(),
                });
                toast({ title: 'Fornecedor adicionado com sucesso!' });
            }
            resetForm();
        } catch (error: any) {
            console.error("Error submitting supplier:", error);
            toast({ title: `Erro ao ${editingSupplier ? 'atualizar' : 'adicionar'} fornecedor`, description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (supplierId: string) => {
        if (!canEdit || !idToken) return;

        try {
            const response = await fetch(`/api/projects/${projectId}/suppliers/${supplierId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Falha ao eliminar fornecedor.');
            toast({ title: 'Fornecedor eliminado com sucesso.' });
        } catch (error: any) {
            console.error("Error deleting supplier: ", error);
            toast({ title: 'Erro ao eliminar fornecedor.', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="p-4 space-y-6">
             <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
                <Card>
                    <CardHeader className="flex-row items-start justify-between">
                         <div>
                            <CardTitle>Base de Dados de Fornecedores</CardTitle>
                            <CardDescription>Consulte todos os fornecedores registados neste projeto.</CardDescription>
                        </div>
                        {canEdit && (
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenDialog(null)}><Plus className="mr-2"/>Adicionar Novo Fornecedor</Button>
                            </DialogTrigger>
                        )}
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin"/> Carregando...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Categoria</TableHead>
                                            <TableHead>Contacto</TableHead>
                                            <TableHead>Email</TableHead>
                                            {canEdit && <TableHead className="text-right">Ações</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {suppliers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={canEdit ? 5 : 4} className="text-center h-24">Nenhum fornecedor registado.</TableCell>
                                            </TableRow>
                                        ) : (
                                            suppliers.map(supplier => (
                                                <TableRow key={supplier.id}>
                                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                                    <TableCell>{supplier.category}</TableCell>
                                                    <TableCell>{supplier.contactPerson}</TableCell>
                                                    <TableCell>{supplier.email}</TableCell>
                                                    {canEdit && (
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(supplier)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon">
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Esta ação não pode ser desfeita. Isto irá eliminar permanentemente o fornecedor "{supplier.name}".
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDelete(supplier.id)}>
                                                                            Eliminar
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'}</DialogTitle>
                        <DialogDescription>{editingSupplier ? `A editar informações para ${editingSupplier.name}.` : 'Registe um novo fornecedor, parceiro ou prestador de serviço.'}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto px-2">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome do Fornecedor / Empresa</Label>
                                <Input id="name" placeholder="Ex: Cimentex Angola" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Categoria</Label>
                                 <Select value={category} onValueChange={(v) => setCategory(v as SupplierCategory)}>
                                    <SelectTrigger id="category">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SupplierCategory.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contactPerson">Pessoa de Contacto</Label>
                                <Input id="contactPerson" placeholder="Ex: João da Silva" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" placeholder="comercial@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input id="phone" placeholder="+244 9XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="address">Morada</Label>
                             <Textarea id="address" placeholder="Rua, cidade, etc." value={address} onChange={e => setAddress(e.target.value)} rows={2}/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : editingSupplier ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2" />}
                            {editingSupplier ? 'Guardar Alterações' : 'Adicionar Fornecedor'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
        </div>
    );
}
