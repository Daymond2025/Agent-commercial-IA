'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import api from '@/lib/api';
import {
  LayoutDashboard, ShoppingCart, MessageSquare,
  Package, Bot, LogOut, Menu, X, ChevronRight, PhoneMissed, Settings,
  BellRing,
} from 'lucide-react';

const NAV_CONFIG = [
  { href: '/dashboard',               label: 'Tableau de bord',  icon: LayoutDashboard },
  { href: '/dashboard/orders',         label: 'Commandes',        icon: ShoppingCart,   showOrderBadge: true },
  { href: '/dashboard/leads',          label: 'Leads à relancer', icon: PhoneMissed,    showLeadsBadge: true },
  { href: '/dashboard/conversations',  label: 'Conversations',    icon: MessageSquare },
  { href: '/dashboard/products',       label: 'Produits',         icon: Package,        adminOnly: true },
  { href: '/dashboard/agents',         label: 'Agents WhatsApp',  icon: Bot,            adminOnly: true },
  { href: '/dashboard/settings',       label: 'Paramètres',       icon: Settings },
];

// 4 bips montants — distinctif et impossible à ignorer
function playOrderAlert() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [
      { delay: 0,    freq: 660,  vol: 0.5 },
      { delay: 0.18, freq: 880,  vol: 0.55 },
      { delay: 0.36, freq: 990,  vol: 0.6 },
      { delay: 0.54, freq: 1320, vol: 0.65 },
    ].forEach(({ delay, freq, vol }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.25);
    });
  } catch { /* contexte audio non disponible */ }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]                     = useState<any>(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [leadsCount, setLeadsCount]         = useState<number | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [toast, setToast]                   = useState<{ msg: string; count: number } | null>(null);

  const lastOrderTotal  = useRef<number | null>(null);
  const blinkRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeatSoundRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativeNotifRef  = useRef<Notification | null>(null);
  const pendingCountRef = useRef(0); // commandes non consultées

  // ── Tout effacer quand l'admin consulte les commandes ───────────────────────
  const clearAllAlerts = useCallback(() => {
    pendingCountRef.current = 0;
    setNewOrdersCount(0);
    setToast(null);

    if (blinkRef.current)       { clearInterval(blinkRef.current); blinkRef.current = null; }
    if (repeatSoundRef.current) { clearInterval(repeatSoundRef.current); repeatSoundRef.current = null; }

    nativeNotifRef.current?.close();
    nativeNotifRef.current = null;

    document.title = 'Daymond — Commercial IA';
  }, []);

  // ── Init auth + permission notifs ─────────────────────────────────────────
  useEffect(() => {
    const token    = Cookies.get('token');
    const userData = Cookies.get('user');
    if (!token) { router.push('/login'); return; }
    if (userData) setUser(JSON.parse(userData));

    api.get('/leads/count')
      .then(({ data }) => setLeadsCount(data.count))
      .catch(() => {});

    // Demander la permission pour les notifications natives OS
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Polling nouvelles commandes toutes les 15 s ───────────────────────────
  useEffect(() => {
    const checkOrders = async () => {
      try {
        const { data } = await api.get('/stats/orders');
        const total = data.total ?? 0;

        if (lastOrderTotal.current === null) {
          lastOrderTotal.current = total;
          return;
        }

        if (total > lastOrderTotal.current) {
          const diff = total - lastOrderTotal.current;
          lastOrderTotal.current = total;
          pendingCountRef.current += diff;

          setNewOrdersCount((prev) => prev + diff);

          // 1. Son d'alerte
          playOrderAlert();

          // 2. Notification native OS (visible même si l'onglet est minimisé)
          if ('Notification' in window && Notification.permission === 'granted') {
            nativeNotifRef.current?.close();
            const label = diff === 1
              ? 'Nouvelle commande reçue !'
              : `${diff} nouvelles commandes reçues !`;
            const notif = new Notification('🛒 Daymond — Commande', {
              body: label + '\nCliquez pour traiter maintenant.',
              requireInteraction: true, // reste visible jusqu'à action
            });
            notif.onclick = () => {
              window.focus();
              router.push('/dashboard/orders');
              notif.close();
              clearAllAlerts();
            };
            nativeNotifRef.current = notif;
          }

          // 3. Toast persistant (pas de timer d'auto-fermeture)
          const msg = diff === 1
            ? 'Nouvelle commande reçue !'
            : `${diff} nouvelles commandes reçues !`;
          setToast({ msg, count: pendingCountRef.current });

          // 4. Titre clignotant dans l'onglet
          if (!blinkRef.current) {
            let flip = true;
            blinkRef.current = setInterval(() => {
              document.title = flip
                ? `🔔 (${pendingCountRef.current}) COMMANDE — Daymond`
                : 'Daymond — Commercial IA';
              flip = !flip;
            }, 900);
          }

          // 5. Son répété toutes les 30 s tant que non consulté
          if (!repeatSoundRef.current) {
            repeatSoundRef.current = setInterval(() => {
              if (pendingCountRef.current > 0) {
                playOrderAlert();
              } else {
                clearInterval(repeatSoundRef.current!);
                repeatSoundRef.current = null;
              }
            }, 30_000);
          }
        }
      } catch { /* silencieux */ }
    };

    checkOrders();
    const interval = setInterval(checkOrders, 15_000);
    return () => clearInterval(interval);
  }, [clearAllAlerts]);

  // ── Reset quand l'admin ouvre la page Commandes ───────────────────────────
  useEffect(() => {
    if (pathname === '/dashboard/orders') {
      clearAllAlerts();
    }
  }, [pathname, clearAllAlerts]);

  function logout() {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/login');
  }

  const navItems = NAV_CONFIG
    .filter(item => !item.adminOnly || user?.role === 'admin')
    .map(item => {
      let badge: number | null = null;
      if (item.showLeadsBadge) badge = leadsCount;
      if (item.showOrderBadge && newOrdersCount > 0) badge = newOrdersCount;
      return { ...item, badge };
    });

  const pageLabel = NAV_CONFIG.find(n => n.href === pathname)?.label ?? 'Dashboard';

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
          {navItems.map((item) => {
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
                <div className="flex items-center gap-2">
                  {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                  {active && <ChevronRight size={14} className="text-white/70" />}
                </div>
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
            {/* Indicateur alerte commande dans le header */}
            {newOrdersCount > 0 && (
              <Link
                href="/dashboard/orders"
                onClick={clearAllAlerts}
                className="flex items-center gap-2 bg-red-500 text-white rounded-full px-4 py-1.5 animate-pulse hover:bg-red-600 transition-colors"
              >
                <BellRing size={14} />
                <span className="text-xs font-bold">
                  {newOrdersCount} commande{newOrdersCount > 1 ? 's' : ''} en attente
                </span>
              </Link>
            )}
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

      {/* ── Toast persistant nouvelle commande ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up max-w-sm w-full">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Barre rouge animée en haut */}
            <div className="h-1 bg-red-500 animate-pulse" />
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shrink-0 animate-bounce">
                  <ShoppingCart size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight">🛒 {toast.msg}</p>
                  {toast.count > 1 && (
                    <p className="text-xs text-red-400 font-semibold mt-0.5">
                      {toast.count} commande{toast.count > 1 ? 's' : ''} non traitée{toast.count > 1 ? 's' : ''}
                    </p>
                  )}
                  <p className="text-xs text-white/50 mt-1">Le son se répète jusqu'à consultation</p>
                </div>
                <button
                  onClick={clearAllAlerts}
                  className="text-white/30 hover:text-white transition-colors shrink-0 mt-0.5"
                >
                  <X size={16} />
                </button>
              </div>
              <Link
                href="/dashboard/orders"
                onClick={clearAllAlerts}
                className="mt-3 flex items-center justify-center gap-2 w-full bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
              >
                <ShoppingCart size={15} />
                Voir les commandes maintenant
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
