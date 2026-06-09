'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-orange-100 text-orange-700' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  processing: { label: 'En traitement', color: 'bg-yellow-100 text-yellow-700' },
  shipped: { label: 'Expédiée', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);

  async function load() {
    setLoading(true);
    const params: any = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    const { data } = await api.get('/orders', { params });
    setOrders(data.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [search, statusFilter]);

  async function updateStatus(orderId: number, status: string) {
    await api.patch(`/orders/${orderId}/status`, { status });
    load();
    setSelected(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Référence', 'Client', 'Produit', 'Montant', 'Statut', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-700">{order.reference}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-gray-400 text-xs">{order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3">{order.product?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">
                    {new Intl.NumberFormat('fr-CI').format(order.total_amount)} FCFA
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[order.status]?.color}`}>
                      {STATUS_LABELS[order.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {format(new Date(order.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(order)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Aucune commande</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal détail commande */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Commande {selected.reference}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Client', selected.customer_name],
                ['Téléphone', selected.customer_phone],
                ['Email', selected.customer_email ?? '—'],
                ['Produit', selected.product?.name],
                ['Montant', `${new Intl.NumberFormat('fr-CI').format(selected.total_amount)} FCFA`],
                ['Ville', selected.delivery_city],
                ['Adresse', selected.delivery_address],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 pt-4 border-t">
              <p className="text-sm font-medium text-gray-600 mb-2">Changer le statut :</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_LABELS).filter(([k]) => k !== selected.status).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => updateStatus(selected.id, k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition hover:opacity-80 ${v.color}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}