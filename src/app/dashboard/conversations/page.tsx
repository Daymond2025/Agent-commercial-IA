'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, MessageSquare } from 'lucide-react';

const STATUS: Record<string, { label: string; bg: string; text: string }> = {
  active:               { label: 'Active',          bg: 'bg-blue-100',    text: 'text-blue-700'   },
  pending_confirmation: { label: 'En confirmation', bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  confirmed:            { label: 'Confirmée',       bg: 'bg-emerald-100', text: 'text-emerald-700'},
  abandoned:            { label: 'Abandonnée',      bg: 'bg-red-100',     text: 'text-red-700'    },
  completed:            { label: 'Terminée',        bg: 'bg-gray-100',    text: 'text-gray-600'   },
};

const STAGE_LABELS: Record<string, string> = {
  greeting:          'Accueil',
  product_selection: 'Choix produit',
  customer_info:     'Infos client',
  order_summary:     'Récapitulatif',
  confirmation:      'Confirmation',
  done:              'Terminé',
};

function Badge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<any>(null);
  const [statusFilter, setStatusFilter]   = useState('');

  useEffect(() => {
    const params: any = {};
    if (statusFilter) params.status = statusFilter;
    api.get('/conversations', { params }).then(({ data }) => {
      setConversations(data.data ?? []);
      setLoading(false);
    });
  }, [statusFilter]);

  async function loadDetail(id: number) {
    const { data } = await api.get(`/conversations/${id}`);
    setSelected(data);
  }

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Conversations</h1>
          <p className="text-sm text-gray-400">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Client', 'Téléphone', 'Agent', 'Statut', 'Étape', 'Dernier message', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {conversations.map((conv) => (
                  <tr key={conv.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm uppercase shrink-0">
                          {(conv.customer_name ?? '?')[0]}
                        </div>
                        <span className="font-medium text-gray-900">{conv.customer_name ?? 'Inconnu'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{conv.customer_phone}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{conv.agent?.name ?? '—'}</td>
                    <td className="px-5 py-4"><Badge status={conv.status} /></td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{STAGE_LABELS[conv.stage] ?? conv.stage}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs whitespace-nowrap">
                      {conv.last_message_at
                        ? format(new Date(conv.last_message_at), 'dd MMM, HH:mm', { locale: fr })
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => loadDetail(conv.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                      >
                        <MessageSquare size={12} /> Voir
                      </button>
                    </td>
                  </tr>
                ))}
                {conversations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-300 text-sm">
                      Aucune conversation
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chat modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '85vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
                  {(selected.customer_name ?? '?')[0]}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{selected.customer_name ?? selected.customer_phone}</h2>
                  <p className="text-xs text-gray-400">{selected.customer_phone} · Agent: {selected.agent?.name ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={selected.status} />
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-gray-50">
              {(selected.messages ?? []).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">Aucun message</p>
              )}
              {(selected.messages ?? []).map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1.5 text-right ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
