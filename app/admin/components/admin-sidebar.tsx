'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ListOrdered, Users, Settings, LogOut } from 'lucide-react';

const navItems = [
    { href: '/admin', label: 'Дашборд', icon: LayoutDashboard, exact: true },
    { href: '/admin/lots', label: 'Заявки (Аукционы)', icon: ListOrdered },
    { href: '/admin/investors', label: 'Инвесторы', icon: Users },
    { href: '/admin/settings', label: 'Настройки', icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    const handleLogout = async () => {
        await fetch('/api/admin/auth', { method: 'DELETE' });
        router.push('/admin/login');
    };

    return (
        <>
            <div className="flex-1 py-6 px-4 flex flex-col gap-2">
                {navItems.map(({ href, label, icon: Icon, exact }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                            isActive(href, exact)
                                ? 'bg-white/10 text-white font-medium'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Icon className="w-5 h-5" />
                        {label}
                    </Link>
                ))}
            </div>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Выйти
                </button>
            </div>
        </>
    );
}
