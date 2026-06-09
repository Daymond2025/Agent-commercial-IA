'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ShoppingCart, MessageSquare, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface OrderStats {
  total: number; today: number; pending: number;
  confirmed: number; delivered: number;
  revenue_total: number; revenue_today: number;
}
interface ConvStats {
  active: number; confirmed: number; abandoned: number; total_today: number;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n);

function KpiCard({ title, value, sub, icon: Icon, color, trend }: {
  title: string; value: string | number; sub?: string;
  icon: any; color: string; trend?: { value: number; up: boolean };
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={19} className="text-white" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend.up ? 'text-neo-green' : 'text-red-500'}`}>
          {trend.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend.value}% vs hier
        </div>
      )}
    </div>
  );
}

const DONUT_COLORS = ['#F97316', '#3B82F6', '#10B981'];

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderStats | null>(null);
  const [convs,  setConvs]  = useState<ConvStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/stats/orders'),
      api.get('/stats/conversations'),
    ]).then(([o, c]) => {
      setOrders(o.data);
      setConvs(c.data);
    }).finally(() => setLoading(false));
  }, []);

  const donutData = orders ? [
    { name: 'En attente',  value: orders.pending   || 0 },
    { name: 'Confirmées',  value: orders.confirmed  || 0 },
    { name: 'Livrées',     value: orders.delivered  || 0 },
  ] : [];

  const convDonut = convs ? [
    { name: 'Actives',      value: convs.active    || 0 },
    { name: 'Confirmées',   value: convs.confirmed || 0 },
    { name: 'Abandonnées',  value: convs.abandoned || 0 },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Commandes aujourd'hui"
          value={orders?.today ?? 0}
          sub={`${orders?.total ?? 0} au total`}
          icon={ShoppingCart}
          color="bg-blue-500"
          trend={{ value: 12, up: true }}
        />
        <KpiCard
          title="En attente de traitement"
          value={orders?.pending ?? 0}
          sub="Nécessitent une action"
          icon={Clock}
          color="bg-orange-500"
        />
        <KpiCard
          title="Conversations actives"
          value={convs?.active ?? 0}
          sub={`${convs?.total_today ?? 0} nouvelles aujourd'hui`}
          icon={MessageSquare}
          color="bg-neo-green"
          trend={{ value: 8, up: true }}
        />
        <KpiCard
          title="Revenus du jour"
          value={`${fmt(orders?.revenue_today ?? 0)} F`}
          sub={`Total: ${fmt(orders?.revenue_total ?? 0)} FCFA`}
          icon={TrendingUp}
          color="bg-purple-500"
          trend={{ value: 5, up: true }}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Donut commandes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Répartition des commandes</h2>
          <p className="text-xs text-gray-400 mb-4">Par statut</p>
          {donutData.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">Aucune commande</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  paddingAngle={3} dataKey="value">
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [v, '']} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut conversations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Répartition des conversations</h2>
          <p className="text-xs text-gray-400 mb-4">Par statut</p>
          {convDonut.every(d => d.value === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">Aucune conversation</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={convDonut} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  paddingAngle={3} dataKey="value">
                  {convDonut.map((_, i) => (
                    <Cell key={i} fill={['#3B82F6', '#10B981', '#EF4444'][i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [v, '']} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Statut commandes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Statut des commandes</h3>
          <div className="space-y-3">
            {[
              { label: 'En attente',  value: orders?.pending   ?? 0, color: 'bg-orange-400', pct: orders?.total ? Math.round(((orders?.pending ?? 0) / orders.total) * 100) : 0 },
              { label: 'Confirmées', value: orders?.confirmed  ?? 0, color: 'bg-blue-500',   pct: orders?.total ? Math.round(((orders?.confirmed ?? 0) / orders.total) * 100) : 0 },
              { label: 'Livrées',    value: orders?.delivered  ?? 0, color: 'bg-neo-green',pct: orders?.total ? Math.round(((orders?.delivered ?? 0) / orders.total) * 100) : 0 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-800">{item.value}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Conversations</h3>
          <div className="space-y-3">
            {[
              { label: 'Actives',     value: convs?.active    ?? 0, color: 'bg-blue-500' },
              { label: 'Confirmées',  value: convs?.confirmed ?? 0, color: 'bg-neo-green' },
              { label: 'Abandonnées', value: convs?.abandoned ?? 0, color: 'bg-red-400' },
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

        {/* Revenus */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Revenus totaux</h3>
            <p className="text-xs text-gray-400">Commandes confirmées + livrées</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600 mt-4">
              {fmt(orders?.revenue_total ?? 0)}
            </p>
            <p className="text-sm text-gray-400 mt-1">FCFA</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Aujourd'hui</span>
              <span className="font-semibold text-neo-green">
                +{fmt(orders?.revenue_today ?? 0)} F
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
