'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { Plus, Bot, Power, Pencil, X, Upload, Globe, Check } from 'lucide-react';

type ModalMode = null | 'create' | 'edit';

const initForm = () => ({
  name: '',
  phone_number: '',
  phone_number_id: '',
  access_token: '',
  waba_id: '',
  persona_name: 'Awa',
  instructions: '',
  knowledge_base: '',
  website_url: '',
  avatarFile: null as File | null,
  avatarPreview: null as string | null,
  product_ids: [] as number[],
});

export default function AgentsPage() {
  const [agents, setAgents]       = useState<any[]>([]);
  const [allProducts, setAll]     = useState<any[]>([]);
  const [modal, setModal]         = useState<ModalMode>(null);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState(initForm());
  const [loading, setLoading]     = useState(false);
  const avatarRef                 = useRef<HTMLInputElement>(null);

  async function load() {
    const [{ data: ag }, { data: pr }] = await Promise.all([
      api.get('/agents'),
      api.get('/products'),
    ]);
    setAgents(ag);
    setAll(pr);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(initForm()); setEditId(null); setModal('create'); }

  function openEdit(agent: any) {
    setForm({
      name: agent.name ?? '',
      phone_number: agent.phone_number ?? '',
      phone_number_id: agent.phone_number_id ?? '',
      access_token: '',
      waba_id: agent.waba_id ?? '',
      persona_name: agent.persona?.name ?? 'Awa',
      instructions: agent.instructions ?? '',
      knowledge_base: agent.knowledge_base ?? '',
      website_url: agent.website_url ?? '',
      avatarFile: null,
      avatarPreview: agent.avatar_url ?? null,
      product_ids: (agent.products ?? []).map((p: any) => p.id),
    });
    setEditId(agent.id);
    setModal('edit');
  }

  function closeModal() { setModal(null); setEditId(null); setForm(initForm()); }

  function toggleProduct(id: number) {
    setForm(f => ({
      ...f,
      product_ids: f.product_ids.includes(id)
        ? f.product_ids.filter(p => p !== id)
        : [...f.product_ids, id],
    }));
  }

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, avatarFile: file, avatarPreview: URL.createObjectURL(file) }));
  }

  async function save() {
    setLoading(true);
    try {
      let agentId: number;

      if (form.avatarFile) {
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('persona', JSON.stringify({ name: form.persona_name }));
        if (form.access_token)   fd.append('access_token', form.access_token);
        if (form.instructions)   fd.append('instructions', form.instructions);
        if (form.knowledge_base) fd.append('knowledge_base', form.knowledge_base);
        if (form.website_url)    fd.append('website_url', form.website_url);
        fd.append('avatar', form.avatarFile);

        if (modal === 'create') {
          fd.append('phone_number',    form.phone_number);
          fd.append('phone_number_id', form.phone_number_id);
          fd.append('waba_id',         form.waba_id);
          const { data } = await api.post('/agents', fd);
          agentId = data.id;
        } else {
          fd.append('_method', 'PUT');
          const { data } = await api.post(`/agents/${editId}`, fd);
          agentId = data.id;
        }
      } else {
        const payload: any = {
          name:           form.name,
          persona:        { name: form.persona_name },
          instructions:   form.instructions   || null,
          knowledge_base: form.knowledge_base || null,
          website_url:    form.website_url    || null,
        };
        if (form.access_token) payload.access_token = form.access_token;

        if (modal === 'create') {
          payload.phone_number    = form.phone_number;
          payload.phone_number_id = form.phone_number_id;
          payload.waba_id         = form.waba_id;
          const { data } = await api.post('/agents', payload);
          agentId = data.id;
        } else {
          const { data } = await api.put(`/agents/${editId}`, payload);
          agentId = data.id;
        }
      }

      await api.post(`/agents/${agentId}/products`, { product_ids: form.product_ids });

      await load();
      closeModal();
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agents WhatsApp</h1>
          <p className="text-sm text-gray-400">{agents.length} agent{agents.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-neo hover:bg-neo-dark text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
        >
          <Plus size={16} /> Ajouter un agent
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-neo-bg flex items-center justify-center shrink-0 border border-neo-border">
                {agent.avatar_url
                  ? <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover" />
                  : <Bot size={22} className="text-neo" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
                <p className="text-xs text-gray-400">{agent.phone_number}</p>
              </div>
              <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                agent.is_active ? 'bg-neo-bg text-neo-dark' : 'bg-red-100 text-red-600'
              }`}>
                {agent.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>

            <div className="text-sm text-gray-500 space-y-1.5">
              <p><span className="font-medium text-gray-700">Prénom IA :</span> {agent.persona?.name ?? 'Awa'}</p>
              <p><span className="font-medium text-gray-700">Conversations :</span> {agent.conversations_count ?? 0}</p>
              {agent.products?.length > 0 && (
                <p>
                  <span className="font-medium text-gray-700">Produits :</span>{' '}
                  {agent.products.slice(0, 2).map((p: any) => p.name).join(', ')}
                  {agent.products.length > 2 && (
                    <span className="text-gray-400"> +{agent.products.length - 2}</span>
                  )}
                </p>
              )}
              {agent.website_url && (
                <p className="truncate">
                  <span className="font-medium text-gray-700">Site :</span>{' '}
                  <a href={agent.website_url} target="_blank" rel="noreferrer" className="text-neo hover:underline">
                    {agent.website_url}
                  </a>
                </p>
              )}
              {agent.instructions && (
                <p className="text-xs text-gray-400 italic line-clamp-1">"{agent.instructions}"</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
              <button
                onClick={() => openEdit(agent)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-neo transition"
              >
                <Pencil size={14} /> Modifier
              </button>
              <button
                onClick={() => toggle(agent)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <Power size={14} />
                {agent.is_active ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-300">
            <Bot size={40} className="mb-3" />
            <p className="text-sm">Aucun agent configuré. Ajoutez votre premier agent WhatsApp.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">
                {modal === 'create' ? 'Nouvel agent WhatsApp' : "Modifier l'agent"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 py-5 space-y-7">

              {/* ── IDENTITÉ ─────────────────────────────────────── */}
              <section>
                <p className="text-[11px] font-bold text-neo uppercase tracking-widest mb-3">Identité</p>

                <div className="flex items-center gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.click()}
                    className="w-16 h-16 rounded-full overflow-hidden bg-neo-bg flex items-center justify-center border-2 border-dashed border-neo-border hover:border-neo transition shrink-0"
                  >
                    {form.avatarPreview
                      ? <img src={form.avatarPreview} alt="" className="w-full h-full object-cover" />
                      : <Upload size={20} className="text-neo" />
                    }
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Photo de profil</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — max 2 Mo</p>
                    <button
                      type="button"
                      onClick={() => avatarRef.current?.click()}
                      className="text-xs text-neo hover:underline mt-1"
                    >
                      {form.avatarPreview ? 'Changer' : 'Choisir une image'}
                    </button>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'name', label: "Nom de l'agent", placeholder: 'Agent Abidjan' },
                    { key: 'persona_name', label: 'Prénom IA', placeholder: 'Awa, Kouamé, Sarah…' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                      <input
                        type="text"
                        value={(form as any)[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* ── CONNEXION WHATSAPP ────────────────────────────── */}
              <section>
                <p className="text-[11px] font-bold text-neo uppercase tracking-widest mb-3">Connexion WhatsApp (Meta)</p>
                <div className="space-y-3">
                  {modal === 'create' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Numéro WhatsApp</label>
                        <input
                          type="text"
                          value={form.phone_number}
                          onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                          placeholder="2250700000000"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'phone_number_id', label: 'Phone Number ID' },
                          { key: 'waba_id',         label: 'WABA ID'         },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                            <input
                              type="text"
                              value={(form as any)[key]}
                              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Access Token
                      {modal === 'edit' && <span className="ml-1 font-normal normal-case text-gray-400">(laisser vide pour conserver l'actuel)</span>}
                    </label>
                    <input
                      type="password"
                      value={form.access_token}
                      onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                    />
                  </div>
                </div>
              </section>

              {/* ── CONFIGURATION IA ─────────────────────────────── */}
              <section>
                <p className="text-[11px] font-bold text-neo uppercase tracking-widest mb-3">Configuration IA</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Instructions spécifiques</label>
                    <textarea
                      value={form.instructions}
                      onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                      rows={3}
                      placeholder="Ex: Cet agent se spécialise dans les ordinateurs pour étudiants. Toujours mentionner les facilités de paiement…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50 resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">S'ajoutent au prompt de base Daymond — ne le remplacent pas</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Base de connaissances</label>
                    <textarea
                      value={form.knowledge_base}
                      onChange={(e) => setForm({ ...form, knowledge_base: e.target.value })}
                      rows={4}
                      placeholder="Ex: Délai de livraison 24-48h à Abidjan, 3-5 jours en province. Garantie 1 an constructeur. SAV au 05 05 05 05…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">URL du site / catalogue</label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        value={form.website_url}
                        onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                        placeholder="https://daymondboutique.com/catalogue"
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── PRODUITS ASSIGNÉS ─────────────────────────────── */}
              <section>
                <p className="text-[11px] font-bold text-neo uppercase tracking-widest mb-1">Produits assignés</p>
                <p className="text-xs text-gray-400 mb-3">
                  Si aucun produit sélectionné, l'agent accède à tout le catalogue Daymond
                </p>
                {allProducts.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Aucun produit dans le catalogue</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allProducts.map((p) => {
                      const sel = form.product_ids.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProduct(p.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                            sel ? 'border-neo bg-neo-bg' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                            sel ? 'border-neo bg-neo' : 'border-gray-300'
                          }`}>
                            {sel && <Check size={11} className="text-white" strokeWidth={3} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.brand}</p>
                          </div>
                          {p.image_url && (
                            <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="flex-1 bg-neo hover:bg-neo-dark text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60"
              >
                {loading ? 'Enregistrement…' : modal === 'create' ? "Créer l'agent" : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}