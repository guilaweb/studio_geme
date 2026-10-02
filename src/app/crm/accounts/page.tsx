import { redirect } from 'next/navigation';

export default function CrmAccountsPage() {
    redirect('/crm?tab=accounts');
}
