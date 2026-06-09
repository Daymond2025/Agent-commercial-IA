'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Bot, Power } from 'lucide-react';

const EMPTY = {
  name: '', phone_number: '', phone_number_id: '',
  access_token: '', waba_id: '', persona: { name: 'Awa' },
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await api.get('/agents');
    setAgents(data);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setLoading(true);
    try {
      await api.post('/agents', form);
      await load();
      setModal(false);
      setForm(EMPTY);
    } finally {
      setLoading(false);
    }
  }

  async function toggle(agent: any) {
    await api.put(`/agents/${agent.id}`, { is_active: !agent.is_active });
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agents WhatsApp</h1>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
        >
          <Plus size={16} /> Ajouter un agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Bot size={20} className="text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold">{agent.name}</h3>
                <p className="text-xs text-gray-400">{agent.phone_number}</p>
              </div>
              <div className="ml-auto">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${agent.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {agent.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-500 space-y-1">
              <p><span className="font-medium">Conversations:</span> {agent.conversations_count ?? 0}</p>
              <p><span className="font-medium">Personnage:</span> {agent.persona?.name ?? 'Awa'}</p>
              <p className="font-mono text-xs text-gray-400 truncate">ID: {agent.phone_number_id}</p>
            </div>

            <button
              onClick={() => toggle(agent)}
              className="mt-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <Power size={14} />
              {agent.is_active ? 'Désactiver' : 'Activer'}
            </button>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            Aucun agent configuré. Ajoutez votre premier agent WhatsApp.
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-4">Nouvel agent WhatsApp</h2>

            <div className="space-y-3">
              {[
                { key: 'name', label: "Nom de l'agent (ex: Agent Abidjan)" },
                { key: 'phone_number', label: 'Numéro WhatsApp (ex: 2250700000000)' },
                { key: 'phone_number_id', label: 'Phone Number ID (Meta Dashboard)' },
                { key: 'waba_id', label: 'WhatsApp Business Account ID' },
                { key: 'access_token', label: 'Access Token (Meta)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input
                    type={key === 'access_token' ? 'password' : 'text'}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div>
                <label className="text-sm font-medium text-gray-700">Prénom de l'agent IA</label>
                <input
                  type="text"
                  value={form.persona?.name ?? 'Awa'}
                  onChange={(e) => setForm({ ...form, persona: { ...form.persona, name: e.target.value } })}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Awa, Kouamé, Sarah..."
                />
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 mt-4 text-xs text-blue-700">
              Ces informations se trouvent dans votre <strong>Meta for Developers Dashboard</strong> → WhatsApp → Configuration.
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 border rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60"
              >
                {loading ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}