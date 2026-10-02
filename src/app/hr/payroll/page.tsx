import { redirect } from 'next/navigation';

export default function PayrollPage() {
    redirect('/hr?tab=payroll');
}
