import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { staffList } from '@/lib/admin-data';
import { fullName } from '@/lib/format';
import { PageHead } from '@/components/admin/ui';
import PropertyForm from '@/components/admin/PropertyForm';

export const metadata = { title: 'Нов имот' };

export default async function NewProperty() {
  const user = await requireStaff();
  const boss = user.role === 'boss';
  const staff = boss ? await staffList(true) : [];
  return (
    <>
      <PageHead
        kicker={<Link href="/admin/imoti">Имоти</Link>}
        title="Нов имот"
        sub="Задължителни са заглавието, цената, площта и районът. Останалото може да допълниш, когато имаш снимките."
      />
      <PropertyForm
        initial={boss ? { broker_id: user.id } : null}
        boss={boss}
        staff={staff.map((s: any) => ({ id: s.id, name: fullName(s) }))}
      />
    </>
  );
}
