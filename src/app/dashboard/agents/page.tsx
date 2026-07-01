'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import {
  AlertCircle, Bot, Check, FileText, FolderOpen, Globe,
  Pencil, Plus, Power, Sparkles, Upload, X,
} from 'lucide-react';

type ModalMode = null | 'create' | 'edit';

interface KbDoc {
  id: number;
  original_name: string;
  mime_type: string;
  created_at: string;
}

const initForm = () => ({
  name: '',
  phone_number: '',
  phone_number_id: '',
  access_token: '',
  waba_id: '',
  persona_name: 'Awa',
  instructions: '',
  website_url: '',
  avatarFile: null as File | null,
  avatarPreview: null as string | null,
  product_ids: [] as number[],
});

const ACCEPTED = '.pdf,.txt,.csv,application/pdf,text/plain,text/csv';

function fileEmoji(mime: string) {
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('csv')) return '📊';
  return '📝';
}

function compressImage(file: File, maxDim = 800, quality = 0.82): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas indisponible')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) { reject(new Error('compression échouée')); return; }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image invalide')); };
    img.src = url;
  });
}

function extractErrorMessage(err: any): string {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  if (data?.message) return data.message;
  return "Une erreur est survenue lors de l'enregistrement.";
}

export default function AgentsPage() {
  const [agents,      setAgents]     = useState<any[]>([]);
  const [allProducts, setAll]        = useState<any[]>([]);
  const [modal,       setModal]      = useState<ModalMode>(null);
  const [editId,      setEditId]     = useState<number | null>(null);
  const [form,        setForm]       = useState(initForm());
  const [saving,      setSaving]     = useState(false);
  const [formError,   setFormError]  = useState<string | null>(null);
  const [avatarBusy,  setAvatarBusy] = useState(false);
  const avatarRef                    = useRef<HTMLInputElement>(null);

  // KB state
  const [kbDocs,      setKbDocs]     = useState<KbDoc[]>([]);
  const [pending,     setPending]    = useState<File[]>([]);
  const [uploading,   setUploading]  = useState(false);
  const [training,    setTraining]   = useState(false);
  const [kbMsg,       setKbMsg]      = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [dragOver,    setDragOver]   = useState(false);
  const kbFileRef                    = useRef<HTMLInputElement>(null);
  const kbDirRef                     = useRef<HTMLInputElement>(null);

  async function load() {
    const [{ data: ag }, { data: pr }] = await Promise.all([
      api.get('/agents'),
      api.get('/products'),
    ]);
    setAgents(ag);
    setAll(pr);
  }

  useEffect(() => { load(); }, []);

  async function loadDocs(id: number) {
    const { data } = await api.get(`/agents/${id}/documents`);
    setKbDocs(data);
  }

  function resetKb() {
    setPending([]);
    setKbDocs([]);
    setKbMsg(null);
    setDragOver(false);
  }

  function openCreate() {
    setForm(initForm());
    setEditId(null);
    setModal('create');
    setFormError(null);
    resetKb();
  }

  function openEdit(agent: any) {
    setForm({
      name:            agent.name ?? '',
      phone_number:    agent.phone_number ?? '',
      phone_number_id: agent.phone_number_id ?? '',
      access_token:    '',
      waba_id:         agent.waba_id ?? '',
      persona_name:    agent.persona?.name ?? 'Awa',
      instructions:    agent.instructions ?? '',
      website_url:     agent.website_url ?? '',
      avatarFile:      null,
      avatarPreview:   agent.avatar_url ?? null,
      product_ids:     (agent.products ?? []).map((p: any) => p.id),
    });
    setEditId(agent.id);
    setModal('edit');
    setFormError(null);
    resetKb();
    loadDocs(agent.id);
  }

  function closeModal() {
    setModal(null);
    setEditId(null);
    setForm(initForm());
    setFormError(null);
    resetKb();
  }

  function toggleProduct(id: number) {
    setForm(f => ({
      ...f,
      product_ids: f.product_ids.includes(id)
        ? f.product_ids.filter(p => p !== id)
        : [...f.product_ids, id],
    }));
  }

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFormError(null);
    setAvatarBusy(true);
    try {
      // Compresse côté client pour rester sous la limite serveur, même avec des photos de téléphone lourdes
      const finalFile = file.size > 400 * 1024 ? await compressImage(file) : file;
      setForm(f => ({ ...f, avatarFile: finalFile, avatarPreview: URL.createObjectURL(finalFile) }));
    } catch {
      setForm(f => ({ ...f, avatarFile: file, avatarPreview: URL.createObjectURL(file) }));
    } finally {
      setAvatarBusy(false);
    }
  }

  function addFiles(files: FileList | File[]) {
    const valid = Array.from(files).filter(f =>
      f.name.match(/\.(pdf|txt|csv)$/i)
    );
    if (!valid.length) {
      setKbMsg({ type: 'err', text: 'Formats acceptés : PDF, TXT, CSV uniquement' });
      return;
    }
    setPending(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))];
    });
    setKbMsg(null);
  }

  function onKbInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  async function uploadFiles(agentId: number) {
    if (!pending.length) return;
    setUploading(true);
    setKbMsg(null);
    try {
      const fd = new FormData();
      pending.forEach(f => fd.append('documents[]', f));
      const { data } = await api.post(`/agents/${agentId}/knowledge-base/upload`, fd);
      setKbMsg({ type: 'ok', text: data.message });
      setPending([]);
      await loadDocs(agentId);
    } catch (err: any) {
      setKbMsg({ type: 'err', text: err.response?.data?.message ?? "Erreur lors de l'upload" });
    } finally {
      setUploading(false);
    }
  }

  async function trainAgent() {
    if (!editId) return;
    setTraining(true);
    setKbMsg(null);
    try {
      const { data } = await api.post(`/agents/${editId}/train`);
      setKbMsg({ type: 'ok', text: data.message });
    } catch (err: any) {
      setKbMsg({ type: 'err', text: err.response?.data?.message ?? 'Pas assez de données pour former l\'agent' });
    } finally {
      setTraining(false);
    }
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    try {
      let agentId: number;

      if (form.avatarFile) {
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('persona', JSON.stringify({ name: form.persona_name }));
        if (form.access_token) fd.append('access_token', form.access_token);
        if (form.instructions) fd.append('instructions', form.instructions);
        if (form.website_url)  fd.append('website_url', form.website_url);
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
          name:         form.name,
          persona:      { name: form.persona_name },
          instructions: form.instructions || null,
          website_url:  form.website_url  || null,
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

      if (pending.length > 0) {
        await uploadFiles(agentId);
      }

      await load();
      closeModal();
    } catch (err: any) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(agent: any) {
    await api.put(`/agents/${agent.id}`, { is_active: !agent.is_active });
    load();
  }

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────── */}
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

      {/* ── Cards ───────────────────────────────────────────── */}
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
                  {agent.products.length > 2 && <span className="text-gray-400"> +{agent.products.length - 2}</span>}
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

      {/* ── Modal ───────────────────────────────────────────── */}
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

            {/* Body scrollable */}
            <div className="overflow-y-auto px-6 py-5 space-y-7">

              {formError && (
                <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm border text-red-700 bg-red-50 border-red-200">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}

              {/* ── IDENTITÉ ─── */}
              <section>
                <p className="text-[11px] font-bold text-neo uppercase tracking-widest mb-3">Identité</p>
                <div className="flex items-center gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.click()}
                    disabled={avatarBusy}
                    className="w-16 h-16 rounded-full overflow-hidden bg-neo-bg flex items-center justify-center border-2 border-dashed border-neo-border hover:border-neo transition shrink-0 disabled:opacity-60"
                  >
                    {avatarBusy
                      ? <div className="w-5 h-5 border-2 border-neo border-t-transparent rounded-full animate-spin" />
                      : form.avatarPreview
                        ? <img src={form.avatarPreview} alt="" className="w-full h-full object-cover" />
                        : <Upload size={20} className="text-neo" />
                    }
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Photo de profil</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — compressée automatiquement</p>
                    <button type="button" onClick={() => avatarRef.current?.click()} disabled={avatarBusy} className="text-xs text-neo hover:underline mt-1 disabled:opacity-60">
                      {avatarBusy ? 'Optimisation…' : form.avatarPreview ? 'Changer' : 'Choisir une image'}
                    </button>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'name',         label: "Nom de l'agent", placeholder: 'Agent Abidjan' },
                    { key: 'persona_name', label: 'Prénom IA',      placeholder: 'Awa, Kouamé, Sarah…' },
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

              {/* ── CONNEXION WHATSAPP ─── */}
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

              {/* ── CONFIGURATION IA ─── */}
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
                    <p className="text-xs text-gray-400 mt-1">S'ajoutent au prompt de base WhatsApp Shop — ne le remplacent pas</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">URL du site / catalogue</label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        value={form.website_url}
                        onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                        placeholder="https://votresite.com/catalogue"
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── BASE DE CONNAISSANCES ─── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold text-neo uppercase tracking-widest">Base de connaissances</p>
                  {modal === 'edit' && (
                    <button
                      type="button"
                      onClick={trainAgent}
                      disabled={training}
                      className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition disabled:opacity-60"
                    >
                      <Sparkles size={13} />
                      {training ? 'Formation…' : "Former l'IA"}
                    </button>
                  )}
                </div>

                {/* Notifications KB */}
                {kbMsg && (
                  <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm mb-3 border ${
                    kbMsg.type === 'ok'
                      ? 'text-neo-dark bg-neo-bg border-neo-border'
                      : 'text-red-700 bg-red-50 border-red-200'
                  }`}>
                    {kbMsg.type === 'ok'
                      ? <Check size={14} className="shrink-0 mt-0.5" />
                      : <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    }
                    {kbMsg.text}
                  </div>
                )}

                {modal === 'create' ? (
                  /* Mode création : placeholder */
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50">
                    <FileText size={28} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-500">Documents disponibles après création</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Créez l'agent, puis importez vos fichiers PDF, TXT ou CSV depuis "Modifier"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">

                    {/* Liste docs existants */}
                    {kbDocs.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Documents importés ({kbDocs.length})
                        </p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {kbDocs.map(doc => (
                            <div key={doc.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                              <span className="shrink-0 text-base">{fileEmoji(doc.mime_type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{doc.original_name}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                        dragOver
                          ? 'border-neo bg-neo-bg'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                      onClick={() => kbFileRef.current?.click()}
                    >
                      <Upload size={22} className={`mx-auto mb-2 transition ${dragOver ? 'text-neo' : 'text-gray-300'}`} />
                      <p className="text-sm font-medium text-gray-600">
                        Glissez vos fichiers ici ou{' '}
                        <span className="text-neo">parcourir</span>
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); kbDirRef.current?.click(); }}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-neo mx-auto mt-2 transition"
                      >
                        <FolderOpen size={12} /> Importer un dossier entier
                      </button>
                      <p className="text-xs text-gray-400 mt-2">PDF, TXT, CSV — max 10 Mo par fichier</p>
                    </div>

                    {/* Inputs cachés */}
                    <input
                      ref={kbFileRef}
                      type="file"
                      multiple
                      accept={ACCEPTED}
                      className="hidden"
                      onChange={onKbInput}
                    />
                    <input
                      ref={kbDirRef}
                      type="file"
                      multiple
                      // @ts-ignore – webkitdirectory is not in React types
                      webkitdirectory="true"
                      accept={ACCEPTED}
                      className="hidden"
                      onChange={onKbInput}
                    />

                    {/* Fichiers en attente */}
                    {pending.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          En attente ({pending.length} fichier{pending.length > 1 ? 's' : ''})
                        </p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {pending.map(f => (
                            <div key={f.name} className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-sm">
                              <span className="shrink-0">{fileEmoji(f.type)}</span>
                              <span className="flex-1 truncate text-gray-700 font-medium">{f.name}</span>
                              <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                                {f.size >= 1024 * 1024
                                  ? `${(f.size / 1024 / 1024).toFixed(1)} Mo`
                                  : `${(f.size / 1024).toFixed(0)} Ko`}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPending(p => p.filter(x => x.name !== f.name))}
                                className="text-gray-400 hover:text-red-500 transition shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => uploadFiles(editId!)}
                          disabled={uploading}
                          className="w-full bg-neo hover:bg-neo-dark text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60"
                        >
                          {uploading
                            ? 'Envoi en cours…'
                            : `Uploader ${pending.length} fichier${pending.length > 1 ? 's' : ''}`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ── PRODUITS ASSIGNÉS ─── */}
              <section>
                <p className="text-[11px] font-bold text-neo uppercase tracking-widest mb-1">Produits assignés</p>
                <p className="text-xs text-gray-400 mb-3">
                  Si aucun produit sélectionné, l'agent accède à tout le catalogue WhatsApp Shop
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
                disabled={saving || avatarBusy}
                className="flex-1 bg-neo hover:bg-neo-dark text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : modal === 'create' ? "Créer l'agent" : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}