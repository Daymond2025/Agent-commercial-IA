'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import {
  LayoutDashboard, ShoppingCart, MessageSquare,
  Package, Bot, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',              label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/orders',        label: 'Commandes',       icon: ShoppingCart },
  { href: '/dashboard/conversations', label: 'Conversations',   icon: MessageSquare },
  { href: '/dashboard/products',      label: 'Produits',        icon: Package,  adminOnly: true },
  { href: '/dashboard/agents',        label: 'Agents WhatsApp', icon: Bot,      adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]               = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token    = Cookies.get('token');
    const userData = Cookies.get('user');
    if (!token) { router.push('/login'); return; }
    if (userData) setUser(JSON.parse(userData));
  }, []);

  function logout() {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/login');
  }

  const filteredNav = navItems.filter(item => !item.adminOnly || user?.role === 'admin');
  const pageLabel   = navItems.find(n => n.href === pathname)?.label ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-[#F0F2F8] font-sans">

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col
        bg-neo-darkest text-white
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>

        {/* Logo */}
        <div className="flex items-center justify-between h-[70px] px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neo flex items-center justify-center text-white font-bold text-sm">D</div>
            <div>
              <p className="text-[15px] font-bold leading-tight">Daymond</p>
              <p className="text-[10px] text-neo-light/70 uppercase tracking-widest">Commercial IA</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-3">Menu</p>
          {filteredNav.map((item) => {
            const Icon   = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-neo text-white shadow-lg'
                    : 'text-white/60 hover:bg-white/8 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} className={active ? 'text-white' : 'text-white/50 group-hover:text-white'} />
                  {item.label}
                </div>
                {active && <ChevronRight size={14} className="text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-9 h-9 rounded-full bg-neo flex items-center justify-center text-white text-sm font-bold uppercase">
              {user?.name?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-white/40 capitalize">
                {user?.role === 'admin' ? 'Administrateur' : 'Coordinateur'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/50 hover:text-white hover:bg-white/8 rounded-lg transition"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-[70px] bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-gray-700">
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-[17px] font-bold text-gray-900">{pageLabel}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Daymond — Agent Commercial IA</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-neo-bg border border-neo-border rounded-full px-4 py-1.5">
              <div className="w-2 h-2 rounded-full bg-neo animate-pulse" />
              <span className="text-xs text-neo-dark font-medium">Système actif</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-neo flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.[0] ?? 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
