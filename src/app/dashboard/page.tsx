'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ShoppingCart, MessageSquare, TrendingUp, Clock } from 'lucide-react';

interface OrderStats {
  total: number; today: number; pending: number;
  confirmed: number; delivered: number;
  revenue_total: number; revenue_today: number;
}

interface ConvStats {
  active: number; confirmed: number; abandoned: number; total_today: number;
}

function StatCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center gap-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderStats | null>(null);
  const [convs, setConvs] = useState<ConvStats | null>(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('fr-CI').format(n) + ' FCFA';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble — Aujourd'hui</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Commandes aujourd'hui"
          value={orders?.today ?? 0}
          sub={`${orders?.total ?? 0} au total`}
          icon={ShoppingCart}
          color="bg-blue-600"
        />
        <StatCard
          title="En attente"
          value={orders?.pending ?? 0}
          sub="À traiter"
          icon={Clock}
          color="bg-orange-500"
        />
        <StatCard
          title="Conversations actives"
          value={convs?.active ?? 0}
          sub={`${convs?.total_today ?? 0} nouvelles aujourd'hui`}
          icon={MessageSquare}
          color="bg-green-600"
        />
        <StatCard
          title="Revenus du jour"
          value={formatMoney(orders?.revenue_today ?? 0)}
          sub={`Total: ${formatMoney(orders?.revenue_total ?? 0)}`}
          icon={TrendingUp}
          color="bg-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Statut des commandes</h3>
          <div className="space-y-3">
            {[
              { label: 'En attente', value: orders?.pending ?? 0, color: 'bg-orange-400' },
              { label: 'Confirmées', value: orders?.confirmed ?? 0, color: 'bg-blue-500' },
              { label: 'Livrées', value: orders?.delivered ?? 0, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="font-semibold text-gray-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Conversations</h3>
          <div className="space-y-3">
            {[
              { label: 'Actives', value: convs?.active ?? 0, color: 'bg-green-500' },
              { label: 'Confirmées', value: convs?.confirmed ?? 0, color: 'bg-blue-500' },
              { label: 'Abandonnées', value: convs?.abandoned ?? 0, color: 'bg-red-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="font-semibold text-gray-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-between">
          <h3 className="font-semibold text-gray-700 mb-2">Revenus totaux</h3>
          <div>
            <p className="text-3xl font-bold text-blue-700">
              {formatMoney(orders?.revenue_total ?? 0)}
            </p>
            <p className="text-sm text-gray-400 mt-1">Commandes confirmées + livrées</p>
          </div>
        </div>
      </div>
    </div>
  );
}