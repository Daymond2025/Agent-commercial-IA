'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending_confirmation: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  abandoned: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-600',
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous</option>
          <option value="active">Actives</option>
          <option value="confirmed">Confirmées</option>
          <option value="abandoned">Abandonnées</option>
        </select>
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
                {['Client', 'Téléphone', 'Agent', 'Statut', 'Étape', 'Dernier message', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {conversations.map((conv) => (
                <tr key={conv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{conv.customer_name ?? 'Inconnu'}</td>
                  <td className="px-4 py-3 text-gray-500">{conv.customer_phone}</td>
                  <td className="px-4 py-3 text-gray-500">{conv.agent?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[conv.status] ?? 'bg-gray-100'}`}>
                      {conv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{conv.stage}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {conv.last_message_at
                      ? format(new Date(conv.last_message_at), 'dd/MM HH:mm', { locale: fr })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => loadDetail(conv.id)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
              {conversations.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Aucune conversation</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Panel messages */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h2 className="font-bold text-lg">{selected.customer_name ?? selected.customer_phone}</h2>
                <p className="text-xs text-gray-400">{selected.customer_phone} · {selected.agent?.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {(selected.messages ?? []).map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {msg.content}
                    <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
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