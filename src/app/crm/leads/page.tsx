import { redirect } from 'next/navigation';

export default function CrmLeadsPage() {
    redirect('/crm?tab=leads');
}
