'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import api, { mediaUrl } from '@/lib/api';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Bot, MessageSquare, Package, MapPin, Send, Pause, Play, AlertTriangle, ChevronLeft } from 'lucide-react';

// ── Constantes ───────────────────────────────────────────────────────────────

const STATUSES: Record<string, { label: string; dot: string; badge: string }> = {
  active:    { label: 'Active',      dot: 'bg-neo',       badge: 'bg-neo-bg text-neo-dark'         },
  confirmed: { label: 'Confirmée',   dot: 'bg-neo-dark',  badge: 'bg-neo-bg text-neo-darker'       },
  abandoned: { label: 'Abandonnée',  dot: 'bg-red-400',   badge: 'bg-red-100 text-red-700'         },
  completed: { label: 'Terminée',    dot: 'bg-gray-400',  badge: 'bg-gray-100 text-gray-600'       },
};

const STAGES = [
  { key: 'greeting',          label: 'Accueil'     },
  { key: 'product_selection', label: 'Produit'     },
  { key: 'customer_info',     label: 'Infos'       },
  { key: 'order_summary',     label: 'Récap'       },
  { key: 'confirmation',      label: 'Confirmation'},
];

const STATUS_TABS = [
  { value: '',          label: 'Toutes'     },
  { value: 'active',    label: 'Actives'    },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'abandoned', label: 'Abandonnées'},
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function msgTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hier';
  return format(d, 'dd MMM', { locale: fr });
}

function initials(name?: string, phone?: string): string {
  if (name) return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (phone ?? '?').slice(-2);
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status] ?? { badge: 'bg-gray-100 text-gray-600', label: status };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
      {s.label}
    </span>
  );
}

function StageProgress({ stage }: { stage: string }) {
  const idx = STAGES.findIndex(s => s.key === stage);
  return (
    <div className="flex items-center gap-0 w-full">
      {STAGES.map((s, i) => {
        const done    = i < idx;
        const current = i === idx;
        const future  = i > idx;
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-3 h-3 rounded-full border-2 transition-all ${
                current ? 'border-neo bg-neo scale-125'
                : done   ? 'border-neo bg-neo'
                : 'border-gray-300 bg-white'
              }`} />
              <span className={`text-[9px] font-medium whitespace-nowrap ${
                current ? 'text-neo' : done ? 'text-neo/60' : 'text-gray-300'
              }`}>{s.label}</span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 transition-all ${done || current ? 'bg-neo' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function ConversationsPage() {
  const [convList, setConvList]       = useState<any[]>([]);
  const [agents, setAgents]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<any>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [meta, setMeta]               = useState<any>(null);
  const [page, setPage]               = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reply & AI toggle
  const [replyText, setReplyText]     = useState('');
  const [sending, setSending]         = useState(false);
  const [togglingAI, setTogglingAI]   = useState(false);

  // Filtres
  const [search, setSearch]           = useState('');
  const [statusTab, setStatusTab]     = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchTimer    = useRef<ReturnType<typeof setTimeout>>();
  const replyRef       = useRef<HTMLTextAreaElement>(null);

  // ── Chargement liste ──────────────────────────────────────────────────────

  const loadList = useCallback(async (p = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params: any = { page: p };
      if (statusTab)   params.status   = statusTab;
      if (agentFilter) params.agent_id = agentFilter;
      if (search)      params.search   = search;

      const { data } = await api.get('/conversations', { params });
      setConvList(prev => append ? [...prev, ...data.data] : data.data);
      setMeta(data);
      setPage(p);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [statusTab, agentFilter, search]);

  useEffect(() => {
    api.get('/agents').then(({ data }) => setAgents(data)).catch(() => {});
  }, []);

  useEffect(() => { loadList(1); }, [loadList]);

  // Recherche avec debounce
  function onSearch(val: string) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadList(1), 400);
  }

  // ── Chargement détail conversation ───────────────────────────────────────

  async function openConversation(conv: any) {
    setSelected(null);
    setLoadingChat(true);
    setReplyText('');
    const { data } = await api.get(`/conversations/${conv.id}`);
    setSelected(data);
    setLoadingChat(false);
  }

  useEffect(() => {
    if (selected) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [selected]);

  // ── Envoyer un message depuis le dashboard ────────────────────────────────

  async function sendReply() {
    if (!replyText.trim() || !selected || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/conversations/${selected.id}/send`, { message: replyText.trim() });
      // Si c'était une commande IA (.., ...)
      if ('ai_paused' in data || 'ai_active' in data) {
        setSelected((prev: any) => ({ ...prev, ai_active: data.ai_active ?? false }));
      } else {
        // Ajouter le message dans la liste locale
        setSelected((prev: any) => ({
          ...prev,
          messages: [...(prev.messages ?? []), { ...data, created_at: new Date().toISOString() }],
        }));
      }
      setReplyText('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      // Fenêtre expirée ou autre erreur
    } finally {
      setSending(false);
    }
  }

  // ── Toggle IA ─────────────────────────────────────────────────────────────

  async function toggleAI() {
    if (!selected || togglingAI) return;
    setTogglingAI(true);
    try {
      const { data } = await api.patch(`/conversations/${selected.id}/toggle-ai`);
      setSelected((prev: any) => ({ ...prev, ai_active: data.ai_active }));
    } finally {
      setTogglingAI(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white -m-2"
      style={{ height: 'calc(100vh - 118px)' }}
    >

      {/* ══ PANNEAU GAUCHE — Liste ══════════════════════════════════════════ */}
      <div className={`w-full md:w-[320px] shrink-0 flex-col border-r border-gray-100 ${selected ? 'hidden md:flex' : 'flex'}`}>

        {/* Barre de recherche */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Rechercher nom, numéro…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
            />
          </div>

          {/* Filtre agent */}
          {agents.length > 0 && (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-neo text-gray-600"
            >
              <option value="">Tous les agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
        </div>

        {/* Onglets statut */}
        <div className="flex border-b border-gray-100 shrink-0">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusTab(tab.value)}
              className={`flex-1 py-2 text-[11px] font-semibold transition ${
                statusTab === tab.value
                  ? 'text-neo border-b-2 border-neo'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Liste conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-6 h-6 border-2 border-neo border-t-transparent rounded-full animate-spin" />
            </div>
          ) : convList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-300">
              <MessageSquare size={28} className="mb-2" />
              <p className="text-xs">Aucune conversation</p>
            </div>
          ) : (
            <>
              {convList.map(conv => {
                const active = selected?.id === conv.id;
                const s      = STATUSES[conv.status] ?? STATUSES.active;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition ${
                      active ? 'bg-neo-bg' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase shrink-0 ${
                        active ? 'bg-neo text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {initials(conv.customer_name, conv.customer_phone)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`text-sm font-semibold truncate ${active ? 'text-neo-dark' : 'text-gray-900'}`}>
                            {conv.customer_name ?? conv.customer_phone}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                            {conv.last_message_at ? msgTime(conv.last_message_at) : ''}
                          </span>
                        </div>

                        {/* Aperçu dernier message */}
                        <p className="text-xs text-gray-400 truncate leading-relaxed">
                          {conv.latest_message
                            ? (conv.latest_message.direction === 'outbound' ? '🤖 ' : '')
                              + conv.latest_message.content
                            : 'Aucun message'}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          <StatusBadge status={conv.status} />
                          {conv.agent && (
                            <span className="text-[10px] text-gray-400 truncate">{conv.agent.persona?.name ?? conv.agent.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Charger plus */}
              {meta && page < meta.last_page && (
                <button
                  onClick={() => loadList(page + 1, true)}
                  disabled={loadingMore}
                  className="w-full py-3 text-xs text-neo font-medium hover:bg-neo-bg transition disabled:opacity-50"
                >
                  {loadingMore ? 'Chargement…' : `Voir plus (${meta.total - convList.length} restants)`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══ PANNEAU DROIT — Chat ════════════════════════════════════════════ */}
      <div className={`flex-1 flex-col min-w-0 ${selected ? 'flex' : 'hidden md:flex'}`}>

        {/* État vide */}
        {!selected && !loadingChat && (
          <div className="flex-1 flex-col items-center justify-center text-gray-300 gap-3 hidden md:flex">
            <MessageSquare size={40} />
            <p className="text-sm">Sélectionnez une conversation</p>
          </div>
        )}

        {/* Chargement */}
        {loadingChat && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-neo border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Conversation sélectionnée */}
        {selected && !loadingChat && (
          <>
            {/* ─ Header ─────────────────────────────────────────────── */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-y-2">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelected(null)}
                    className="md:hidden shrink-0 text-gray-400 hover:text-gray-700 -ml-1 p-1"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="w-11 h-11 rounded-full bg-neo-bg flex items-center justify-center text-neo font-bold text-sm uppercase shrink-0">
                    {initials(selected.customer_name, selected.customer_phone)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900 leading-tight truncate">
                      {selected.customer_name ?? 'Client inconnu'}
                    </h2>
                    <p className="text-xs text-gray-400 truncate">
                      {selected.customer_phone}
                      {selected.agent && (
                        <> · <span className="text-neo-dark font-medium">{selected.agent.name}</span></>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <StatusBadge status={selected.status} />
                  {/* Toggle IA */}
                  <button
                    onClick={toggleAI}
                    disabled={togglingAI}
                    title={selected.ai_active !== false ? "Mettre l'IA en pause" : "Relancer l'IA"}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                      selected.ai_active !== false
                        ? 'bg-neo-bg text-neo-dark hover:bg-neo hover:text-white'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white'
                    }`}
                  >
                    {selected.ai_active !== false
                      ? <><Pause size={11} /> IA active</>
                      : <><Play size={11} /> IA en pause</>
                    }
                  </button>
                  <span className="text-xs text-gray-400 hidden sm:inline">{selected.messages_count ?? selected.messages?.length ?? 0} msg</span>
                </div>
              </div>

              {/* Progression étapes */}
              <div className="mt-4 px-2">
                <StageProgress stage={selected.stage} />
              </div>
            </div>

            {/* ─ Messages ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2 bg-[#F7F8FC]">
              {(selected.messages ?? []).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-10">Aucun message dans cette conversation</p>
              )}

              {(selected.messages ?? []).map((msg: any, i: number) => {
                const out  = msg.direction === 'outbound';
                const prev = selected.messages[i - 1];
                const showDate = !prev || format(new Date(msg.created_at), 'yyyy-MM-dd') !== format(new Date(prev.created_at), 'yyyy-MM-dd');

                return (
                  <div key={msg.id}>
                    {/* Séparateur de date */}
                    {showDate && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">
                          {isToday(new Date(msg.created_at))
                            ? "Aujourd'hui"
                            : isYesterday(new Date(msg.created_at))
                            ? 'Hier'
                            : format(new Date(msg.created_at), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    )}

                    <div className={`flex items-end gap-2 ${out ? 'justify-end' : 'justify-start'}`}>
                      {/* Avatar agent (outbound) */}
                      {out && (
                        <div className="w-6 h-6 rounded-full bg-neo-bg flex items-center justify-center shrink-0 mb-0.5 overflow-hidden">
                          {selected.agent?.avatar_url
                            ? <img src={mediaUrl(selected.agent.avatar_url)} alt="" className="w-full h-full object-cover" />
                            : <Bot size={12} className="text-neo" />
                          }
                        </div>
                      )}

                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                        out
                          ? 'bg-neo text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1.5 text-right ${out ? 'text-white/60' : 'text-gray-400'}`}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* ─ Zone de réponse ────────────────────────────────────── */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
              {selected.ai_active === false && (
                <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-xl px-3 py-2 mb-2">
                  <AlertTriangle size={12} />
                  <span>IA en pause — vous répondez manuellement. Cliquez sur <strong>IA en pause</strong> pour relancer l'agent.</span>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={replyRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                  }}
                  rows={2}
                  placeholder={
                    selected.ai_active !== false
                      ? "Répondre (ou tapez '..' pour mettre l'IA en pause)…"
                      : "Répondre au client directement…"
                  }
                  className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neo transition"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="h-[60px] w-11 flex items-center justify-center bg-neo text-white rounded-xl hover:bg-neo-dark disabled:opacity-40 transition"
                >
                  {sending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send size={15} />
                  }
                </button>
              </div>
            </div>

            {/* ─ Infos commande (si confirmée) ──────────────────────── */}
            {selected.order && (
              <div className="px-6 py-3 border-t border-gray-100 bg-white shrink-0">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-neo-dark font-medium">
                    <Package size={14} />
                    <span>{selected.order.product?.name ?? 'Produit'}</span>
                  </div>
                  <div className="text-gray-400">|</div>
                  <span className="text-gray-600 font-semibold">
                    {selected.order.total_amount
                      ? new Intl.NumberFormat('fr-CI').format(selected.order.total_amount) + ' FCFA'
                      : '—'}
                  </span>
                  {selected.order.delivery_city && (
                    <>
                      <div className="text-gray-400">|</div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <MapPin size={12} />
                        <span>{selected.order.delivery_city}</span>
                      </div>
                    </>
                  )}
                  <div className="ml-auto">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      selected.order.status === 'delivered' ? 'bg-neo-bg text-neo-dark'
                      : selected.order.status === 'pending'   ? 'bg-yellow-100 text-yellow-700'
                      : selected.order.status === 'cancelled' ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selected.order.status === 'pending'   ? 'En attente'
                       : selected.order.status === 'confirmed' ? 'Confirmée'
                       : selected.order.status === 'delivered' ? 'Livrée'
                       : selected.order.status === 'cancelled' ? 'Annulée'
                       : selected.order.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}