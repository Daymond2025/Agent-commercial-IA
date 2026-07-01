'use client';

import { useEffect, useState } from 'react';
import api, { mediaUrl } from '@/lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, SlidersHorizontal, X, Package, Copy, Check } from 'lucide-react';

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:    { label: 'En attente',    bg: 'bg-orange-100',  text: 'text-orange-700'    },
  confirmed:  { label: 'Confirmée',    bg: 'bg-neo-bg',      text: 'text-neo-dark'      },
  processing: { label: 'En traitement',bg: 'bg-yellow-100',  text: 'text-yellow-700'    },
  shipped:    { label: 'Expédiée',     bg: 'bg-purple-100',  text: 'text-purple-700'    },
  delivered:  { label: 'Livrée',       bg: 'bg-neo-bg',      text: 'text-neo-darker'    },
  cancelled:  { label: 'Annulée',      bg: 'bg-red-100',     text: 'text-red-700'       },
};

function Badge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n);

function buildOrderText(order: any): string {
  const lines = [
    `Commande ${order.reference}`,
    `Client : ${order.customer_name}`,
    `Téléphone : ${order.customer_phone}`,
    order.customer_email ? `Email : ${order.customer_email}` : null,
    `Produit : ${order.product?.name ?? '—'}${order.product?.brand ? ` (${order.product.brand})` : ''}`,
    `Montant : ${fmt(order.total_amount)} FCFA`,
    `Ville : ${order.delivery_city}`,
    `Adresse : ${order.delivery_address}`,
  ].filter(Boolean);
  return lines.join('\n');
}

export default function OrdersPage() {
  const [orders,       setOrders]       = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected,     setSelected]     = useState<any>(null);
  const [copiedId,     setCopiedId]     = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const params: any = {};
    if (search)       params.search = search;
    if (statusFilter) params.status = statusFilter;
    const { data } = await api.get('/orders', { params });
    setOrders(data.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [search, statusFilter]);

  async function updateStatus(id: number, status: string) {
    await api.patch(`/orders/${id}/status`, { status });
    load();
    setSelected(null);
  }

  function copyOrder(order: any) {
    navigator.clipboard.writeText(buildOrderText(order)).then(() => {
      setCopiedId(order.id);
      setTimeout(() => setCopiedId(prev => (prev === order.id ? null : prev)), 1800);
    });
  }

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-400">{orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-neo bg-white"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-white appearance-none"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-neo border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Référence', 'Client', 'Produit', 'Montant', 'Statut', 'Date', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neo-bg/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-neo">{order.reference}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{order.customer_name}</p>
                      <p className="text-gray-400 text-xs">{order.customer_phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {order.product?.image_url ? (
                          <img
                            src={mediaUrl(order.product.image_url)}
                            alt={order.product.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Package size={14} className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800">{order.product?.name ?? '—'}</p>
                          {order.product?.brand && (
                            <p className="text-xs text-gray-400">{order.product.brand}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900">{fmt(order.total_amount)} F</td>
                    <td className="px-5 py-4"><Badge status={order.status} /></td>
                    <td className="px-5 py-4 text-gray-400 text-xs whitespace-nowrap">
                      {format(new Date(order.created_at), 'dd MMM yy, HH:mm', { locale: fr })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelected(order)}
                          className="text-xs font-medium text-neo hover:text-neo-dark bg-neo-bg hover:bg-neo-border px-3 py-1.5 rounded-lg transition"
                        >
                          Détails
                        </button>
                        <button
                          onClick={() => copyOrder(order)}
                          title="Copier les infos (pour un fournisseur)"
                          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-neo-dark bg-gray-50 hover:bg-neo-bg px-2.5 py-1.5 rounded-lg transition"
                        >
                          {copiedId === order.id ? <Check size={13} className="text-neo" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-300 text-sm">Aucune commande</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Commande {selected.reference}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Détail et gestion du statut</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyOrder(selected)}
                  className="flex items-center gap-1.5 text-xs font-medium text-neo-dark bg-neo-bg hover:bg-neo-border px-3 py-1.5 rounded-lg transition mr-1"
                >
                  {copiedId === selected.id ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === selected.id ? 'Copié !' : 'Copier pour fournisseur'}
                </button>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              {/* Image produit dans le modal */}
              {selected.product?.image_url && (
                <div className="flex items-center gap-4 mb-5 p-4 bg-gray-50 rounded-xl">
                  <img
                    src={mediaUrl(selected.product.image_url)}
                    alt={selected.product.name}
                    className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{selected.product.name}</p>
                    {selected.product.brand && <p className="text-xs text-gray-400">{selected.product.brand}</p>}
                    <p className="text-neo font-bold mt-1">{fmt(selected.total_amount)} FCFA</p>
                  </div>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Client',   selected.customer_name],
                  ['Téléphone',selected.customer_phone],
                  ['Email',    selected.customer_email ?? '—'],
                  ['Produit',  selected.product?.name ?? '—'],
                  ['Montant',  `${fmt(selected.total_amount)} FCFA`],
                  ['Ville',    selected.delivery_city],
                  ['Adresse',  selected.delivery_address],
                  ['Statut',   <Badge key="s" status={selected.status} />],
                ].map(([k, v]) => (
                  <div key={String(k)} className="bg-gray-50 rounded-xl p-3">
                    <dt className="text-xs text-gray-400 mb-1">{k}</dt>
                    <dd className="font-medium text-gray-900 text-sm">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Changer le statut</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS)
                    .filter(([k]) => k !== selected.status)
                    .map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => updateStatus(selected.id, k)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition hover:opacity-80 ${v.bg} ${v.text}`}
                      >
                        {v.label}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
