'use client';

import { useEffect, useState, useCallback } from 'react';
import api, { mediaUrl } from '@/lib/api';
import { Send, X, Bot, Clock, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';

// ── Config étapes ────────────────────────────────────────────────────────────
const STAGES: Record<string, { label: string; color: string; heat: number }> = {
  confirmation:      { label: 'Confirmation',        color: 'bg-red-100 text-red-700 border-red-200',         heat: 5 },
  order_summary:     { label: 'Récapitulatif',        color: 'bg-orange-100 text-orange-700 border-orange-200', heat: 4 },
  customer_info:     { label: 'Infos client',         color: 'bg-yellow-100 text-yellow-700 border-yellow-200', heat: 3 },
  product_selection: { label: 'Sélection produit',   color: 'bg-blue-100 text-blue-700 border-blue-200',       heat: 2 },
  greeting:          { label: 'Accueil',              color: 'bg-gray-100 text-gray-600 border-gray-200',       heat: 1 },
};

function HeatDots({ heat }: { heat: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i <= heat
              ? heat >= 4 ? 'bg-red-500' : heat === 3 ? 'bg-orange-400' : 'bg-blue-400'
              : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs    = Date.now() - new Date(iso).getTime();
  const diffMins  = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays  = Math.floor(diffHours / 24);
  if (diffMins < 60)  return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} h`;
  return `${diffDays} j`;
}

function getSuggestedMessage(conv: any): string {
  const prenom    = conv.customer_name ? ` ${conv.customer_name.split(' ')[0]}` : '';
  const agentName = conv.agent?.persona?.name ?? 'Agent WhatsApp Shop';

  const msgs: Record<string, string> = {
    greeting:          `Bonjour${prenom} ! Je suis ${agentName} de WhatsApp Shop. Vous avez visité notre catalogue d'ordinateurs. Puis-je vous aider à trouver l'appareil idéal pour vous ? 😊`,
    product_selection: `Bonjour${prenom} ! Avez-vous trouvé l'ordinateur qui correspond à vos besoins ? Je reste disponible pour vous aider dans votre choix. 😊`,
    customer_info:     `Bonjour${prenom} ! Vous avez sélectionné un ordinateur chez WhatsApp Shop. Pouvez-vous me confirmer votre adresse de livraison pour finaliser votre commande ?`,
    order_summary:     `Bonjour${prenom} ! Votre récapitulatif de commande est prêt. Souhaitez-vous le confirmer ? Je suis là pour répondre à vos dernières questions.`,
    confirmation:      `Bonjour${prenom} ! Votre ordinateur vous attend 🖥️. Confirmez-vous votre commande pour que nous préparions votre livraison ?`,
  };

  return msgs[conv.stage] ?? msgs['greeting'];
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads]       = useState<any[]>([]);
  const [agents, setAgents]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [meta, setMeta]         = useState<any>(null);

  // Filtres
  const [filterAgent, setFilterAgent] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // Modal relance
  const [relanceTarget, setRelanceTarget] = useState<any>(null);
  const [message, setMessage]             = useState('');
  const [sending, setSending]             = useState(false);
  const [feedback, setFeedback]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p };
      if (filterAgent) params.agent_id = filterAgent;
      if (filterStage) params.stage    = filterStage;

      const { data } = await api.get('/leads', { params });
      setLeads(data.data);
      setMeta(data);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [filterAgent, filterStage]);

  useEffect(() => {
    api.get('/agents').then(({ data }) => setAgents(data)).catch(() => {});
  }, []);

  useEffect(() => { load(1); }, [load]);

  function openRelance(conv: any) {
    setRelanceTarget(conv);
    setMessage(getSuggestedMessage(conv));
    setFeedback(null);
  }

  function closeRelance() {
    setRelanceTarget(null);
    setMessage('');
    setFeedback(null);
  }

  async function sendRelance() {
    if (!relanceTarget || !message.trim()) return;
    setSending(true);
    setFeedback(null);
    try {
      await api.post(`/leads/${relanceTarget.id}/relance`, { message });
      setFeedback({ type: 'ok', text: 'Message envoyé avec succès !' });
      // Rafraîchir la liste après 1.5s
      setTimeout(() => { closeRelance(); load(page); }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Une erreur est survenue.';
      setFeedback({ type: 'err', text: msg });
    } finally {
      setSending(false);
    }
  }

  const stageInfo = (stage: string) => STAGES[stage] ?? { label: stage, color: 'bg-gray-100 text-gray-600 border-gray-200', heat: 0 };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads à relancer</h1>
          <p className="text-sm text-gray-400">
            {meta ? `${meta.total} lead${meta.total !== 1 ? 's' : ''} en attente` : '…'}
          </p>
        </div>
        <button
          onClick={() => load(page)}
          className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* ── Filtres ── */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neo"
        >
          <option value="">Tous les agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neo"
        >
          <option value="">Toutes les étapes</option>
          {Object.entries(STAGES)
            .sort(([, a], [, b]) => b.heat - a.heat)
            .map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-300">
            <RefreshCw size={24} className="animate-spin mr-2" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <CheckCircle size={36} className="mb-3 text-neo opacity-40" />
            <p className="text-sm font-medium text-gray-400">Aucun lead à relancer</p>
            <p className="text-xs text-gray-300 mt-1">Tous les prospects sont convertis ou actifs</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Client</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Agent</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Étape</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Inactivité</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Relances</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((conv) => {
                  const stage = stageInfo(conv.stage);
                  return (
                    <tr key={conv.id} className="hover:bg-gray-50/60 transition-colors">

                      {/* Client */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{conv.customer_name ?? '—'}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{conv.customer_phone}</p>
                      </td>

                      {/* Agent */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-neo-bg flex items-center justify-center overflow-hidden shrink-0">
                            {conv.agent?.avatar_url
                              ? <img src={mediaUrl(conv.agent.avatar_url)} alt="" className="w-full h-full object-cover" />
                              : <Bot size={14} className="text-neo" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">{conv.agent?.name ?? '—'}</p>
                            <p className="text-xs text-gray-400">{conv.agent?.persona?.name ?? ''}</p>
                          </div>
                        </div>
                      </td>

                      {/* Étape */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${stage.color}`}>
                            {stage.label}
                          </span>
                          <HeatDots heat={stage.heat} />
                        </div>
                      </td>

                      {/* Inactivité */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Clock size={13} />
                          <span className="font-medium">{conv.last_message_at ? timeAgo(conv.last_message_at) : '—'}</span>
                        </div>
                      </td>

                      {/* Relances */}
                      <td className="px-5 py-3.5">
                        <span className={`text-sm font-semibold ${conv.followups_count > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                          {conv.followups_count}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => openRelance(conv)}
                          className="inline-flex items-center gap-1.5 bg-neo hover:bg-neo-dark text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                        >
                          <Send size={12} /> Relancer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Page {meta.current_page} / {meta.last_page} — {meta.total} leads
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => load(page - 1)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= meta.last_page}
                onClick={() => load(page + 1)}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal relance ── */}
      {relanceTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Envoyer un message de relance</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {relanceTarget.customer_name ?? relanceTarget.customer_phone} ·{' '}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${stageInfo(relanceTarget.stage).color}`}>
                    {stageInfo(relanceTarget.stage).label}
                  </span>
                </p>
              </div>
              <button onClick={closeRelance} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">

              {/* Info destinataire */}
              <div className="bg-neo-bg border border-neo-border rounded-xl px-4 py-3 text-sm">
                <p className="text-neo-dark font-medium">
                  📱 {relanceTarget.customer_phone}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Via <strong>{relanceTarget.agent?.name}</strong> ({relanceTarget.agent?.persona?.name})
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50 resize-none"
                />
                <p className="text-right text-xs text-gray-400 mt-1">{message.length} / 1000</p>
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`flex items-start gap-2 text-sm rounded-xl px-3 py-2.5 ${
                  feedback.type === 'ok'
                    ? 'bg-neo-bg text-neo-dark'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {feedback.type === 'ok'
                    ? <CheckCircle size={15} className="shrink-0 mt-0.5" />
                    : <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  }
                  {feedback.text}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={closeRelance}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={sendRelance}
                disabled={sending || !message.trim() || feedback?.type === 'ok'}
                className="flex-1 flex items-center justify-center gap-2 bg-neo hover:bg-neo-dark text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60"
              >
                {sending ? (
                  <><RefreshCw size={14} className="animate-spin" /> Envoi…</>
                ) : (
                  <><Send size={14} /> Envoyer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}