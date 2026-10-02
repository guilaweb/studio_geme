import { redirect } from 'next/navigation';

export default function CrmQuotesPage() {
    redirect('/crm?tab=quotes');
}
