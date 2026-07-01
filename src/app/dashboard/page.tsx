'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  ShoppingCart, MessageSquare, TrendingUp, Clock,
  ArrowUpRight, ArrowDownRight, PhoneMissed, Bot,
} from 'lucide-react';

const fmt     = (n: number) => new Intl.NumberFormat('fr-CI').format(n);
const NEO     = '#25d366';
const NEO_DK  = '#1a9649';
const NEO_DKR = '#11622f';

const ORDER_COLORS = ['#f97316', NEO, NEO_DK];
const CONV_COLORS  = [NEO, NEO_DK, '#ef4444'];

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, icon: Icon, accent = false, trend, alert }: {
  title: string; value: string | number; sub?: string;
  icon: any; accent?: boolean;
  trend?: { value: number } | null;
  alert?: string | null;
}) {
  const up = (trend?.value ?? 0) >= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-neo' : 'bg-neo-bg'}`}>
          <Icon size={19} className={accent ? 'text-white' : 'text-neo'} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {alert && (
        <p className="text-xs text-orange-500 font-medium flex items-center gap-1">
          <Clock size={11} /> {alert}
        </p>
      )}
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${up ? 'text-neo' : 'text-red-500'}`}>
          {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {trend.value > 0 ? '+' : ''}{trend.value}% vs hier
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [orders,  setOrders]  = useState<any>(null);
  const [convs,   setConvs]   = useState<any>(null);
  const [agents,  setAgents]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/stats/orders'),
      api.get('/stats/conversations'),
      api.get('/stats/agents'),
    ]).then(([o, c, a]) => {
      setOrders(o.data);
      setConvs(c.data);
      setAgents(a.data);
    }).finally(() => setLoading(false));
  }, []);

  const donutOrders = orders ? [
    { name: 'En attente', value: orders.pending   || 0 },
    { name: 'Confirmées', value: orders.confirmed  || 0 },
    { name: 'Livrées',    value: orders.delivered  || 0 },
  ] : [];

  const donutConvs = convs ? [
    { name: 'Actives',     value: convs.active    || 0 },
    { name: 'Confirmées',  value: convs.confirmed || 0 },
    { name: 'Abandonnées', value: convs.abandoned || 0 },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-neo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const oldestAlert = orders?.oldest_pending_hours != null
    ? `En attente depuis ${orders.oldest_pending_hours}h`
    : null;

  return (
    <div className="space-y-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Commandes aujourd'hui"
          value={orders?.today ?? 0}
          sub={`${orders?.total ?? 0} au total`}
          icon={ShoppingCart}
          accent
          trend={orders?.trend_orders != null ? { value: orders.trend_orders } : null}
        />
        <KpiCard
          title="En attente"
          value={orders?.pending ?? 0}
          sub="Nécessitent une action"
          icon={Clock}
          alert={oldestAlert}
        />
        <KpiCard
          title="Leads à relancer"
          value={convs?.leads_to_relance ?? 0}
          sub={convs?.leads_this_week != null ? `+${convs.leads_this_week} nouveaux cette semaine` : undefined}
          icon={PhoneMissed}
        />
        <KpiCard
          title="Revenus du jour"
          value={`${fmt(orders?.revenue_today ?? 0)} F`}
          sub={`Total : ${fmt(orders?.revenue_total ?? 0)} FCFA`}
          icon={TrendingUp}
          accent
          trend={orders?.trend_revenue != null ? { value: orders.trend_revenue } : null}
        />
      </div>

      {/* ── Graphiques donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Répartition des commandes</h2>
          <p className="text-xs text-gray-400 mb-4">Par statut</p>
          {donutOrders.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">Aucune commande</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutOrders} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {donutOrders.map((_, i) => <Cell key={i} fill={ORDER_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [v, '']} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Répartition des conversations</h2>
          <p className="text-xs text-gray-400 mb-4">Par statut</p>
          {donutConvs.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">Aucune conversation</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutConvs} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {donutConvs.map((_, i) => <Cell key={i} fill={CONV_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [v, '']} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Ligne basse : statuts + conversations + revenus ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Statut des commandes</h3>
          <div className="space-y-3">
            {[
              { label: 'En attente',  value: orders?.pending   ?? 0, color: 'bg-orange-400' },
              { label: 'Confirmées',  value: orders?.confirmed ?? 0, color: 'bg-neo'        },
              { label: 'Livrées',     value: orders?.delivered ?? 0, color: 'bg-neo-dark'   },
            ].map((item) => {
              const pct = orders?.total ? Math.round((item.value / orders.total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Conversations</h3>
          <div className="space-y-3">
            {[
              { label: 'Actives',     value: convs?.active    ?? 0, color: 'bg-neo'      },
              { label: 'Confirmées',  value: convs?.confirmed ?? 0, color: 'bg-neo-dark' },
              { label: 'Abandonnées', value: convs?.abandoned ?? 0, color: 'bg-red-400'  },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Revenus totaux</h3>
            <p className="text-xs text-gray-400">Commandes confirmées + livrées</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-neo mt-4">{fmt(orders?.revenue_total ?? 0)}</p>
            <p className="text-sm text-gray-400 mt-1">FCFA</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Aujourd'hui</span>
              <span className="font-semibold text-neo">+{fmt(orders?.revenue_today ?? 0)} F</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tableau stats agents ── */}
      {agents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Performance des agents</h3>
            <p className="text-xs text-gray-400 mt-0.5">Leads reçus, commandes générées, taux de conversion</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Agent', 'Leads', 'Commandes', 'Conversion', 'Statut'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {agents.map((agent) => {
                  const conv = agent.conversion_rate ??
                    (agent.leads_count > 0 ? Math.round((agent.orders_count / agent.leads_count) * 100) : 0);
                  return (
                    <tr key={agent.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-neo-bg flex items-center justify-center shrink-0">
                            {agent.avatar_url
                              ? <img src={agent.avatar_url} alt="" className="w-full h-full object-cover" />
                              : <Bot size={16} className="text-neo" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{agent.name}</p>
                            <p className="text-xs text-gray-400">{agent.persona?.name ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-gray-800">{agent.leads_count}</td>
                      <td className="px-6 py-3.5 font-semibold text-gray-800">{agent.orders_count}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-neo rounded-full" style={{ width: `${Math.min(conv, 100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{conv}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          agent.is_active ? 'bg-neo-bg text-neo-dark' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {agent.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}