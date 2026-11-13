import { requireStaff } from '@/lib/auth';
import { navCounts } from '@/lib/admin-data';
import { BRAND } from '@/lib/brand';
import { fullName } from '@/lib/format';
import Nav, { type NavItem } from '@/components/admin/Nav';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const counts = await navCounts(user);
  const boss = user.role === 'boss';

  const main: NavItem[] = [
    { href: '/admin', label: 'Табло', short: 'Табло' },
    { href: '/admin/zapitvania', label: 'Запитвания', short: 'Запитвания', count: counts.fresh },
    { href: '/admin/imoti', label: 'Имоти', short: 'Имоти' },
    { href: '/admin/linkove', label: 'Линкове за споделяне', short: 'Линкове' },
  ];
  const more: NavItem[] = [
    { href: '/admin/klienti', label: 'Клиенти' },
    ...(boss
      ? [
          { href: '/admin/brokeri', label: 'Брокери' },
          { href: '/admin/analiz', label: 'Анализ на чата' },
        ]
      : []),
    { href: '/admin/izvestia', label: 'Известия' },
    { href: '/admin/profil', label: 'Моят профил' },
    ...(boss ? [{ href: '/admin/nastroiki', label: 'Настройки' }] : []),
  ];

  return (
    <Nav
      brand={BRAND.name}
      main={main}
      more={more}
      name={fullName(user)}
      role={boss ? 'Управител' : 'Брокер'}
    >
      {children}
    </Nav>
  );
}
