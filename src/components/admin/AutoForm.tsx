'use client';

// Форма за филтри: при смяна на падащо меню се изпраща сама.
export default function AutoForm({ children, action }: { children: React.ReactNode; action: string }) {
  return (
    <form
      className="filters"
      method="get"
      action={action}
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === 'SELECT') (e.currentTarget as HTMLFormElement).requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
