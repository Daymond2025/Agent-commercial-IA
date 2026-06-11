'use client';

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { Lock, ShieldCheck, CheckCircle, AlertCircle, Eye, EyeOff, Globe, Webhook } from 'lucide-react';

function Section({ title, desc, icon: Icon, children }: {
  title: string; desc?: string; icon: any; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neo-bg flex items-center justify-center">
            <Icon size={17} className="text-neo" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
            {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function PasswordInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          className="w-full px-4 pr-11 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neo/30 focus:border-neo transition"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 select-all cursor-text"
        />
        <button
          onClick={copy}
          className="shrink-0 px-3 py-2.5 text-xs font-medium bg-neo-bg text-neo-dark rounded-xl hover:bg-neo hover:text-white transition border border-neo-border"
        >
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  const [current,  setCurrent]  = useState('');
  const [newPwd,   setNewPwd]   = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    const raw = Cookies.get('user');
    if (raw) setUser(JSON.parse(raw));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (newPwd !== confirm) {
      setFeedback({ type: 'err', msg: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (newPwd.length < 8) {
      setFeedback({ type: 'err', msg: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/password', {
        current_password:      current,
        new_password:          newPwd,
        new_password_confirmation: confirm,
      });
      setFeedback({ type: 'ok', msg: 'Mot de passe mis à jour avec succès.' });
      setCurrent(''); setNewPwd(''); setConfirm('');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erreur lors du changement de mot de passe.';
      setFeedback({ type: 'err', msg });
    } finally {
      setSaving(false);
    }
  }

  const isAdmin = user?.role === 'admin';

  const appUrl    = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? '';
  const webhookUrl   = `${appUrl}/api/webhook/whatsapp`;
  const verifyToken  = 'daymond_whatsapp_verify_2024';

  return (
    <div className="max-w-2xl space-y-6">

      {/* Profil rapide */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-neo flex items-center justify-center text-white text-xl font-bold uppercase shadow-lg">
          {user?.name?.[0] ?? 'U'}
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-400 capitalize">{user?.role === 'admin' ? 'Administrateur' : 'Coordinateur'}</p>
        </div>
      </div>

      {/* ── Changement de mot de passe ── */}
      <Section title="Mon compte" desc="Modifier votre mot de passe de connexion" icon={Lock}>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <PasswordInput
            label="Mot de passe actuel"
            value={current}
            onChange={setCurrent}
          />
          <PasswordInput
            label="Nouveau mot de passe"
            value={newPwd}
            onChange={setNewPwd}
            placeholder="8 caractères minimum"
          />
          <PasswordInput
            label="Confirmer le nouveau mot de passe"
            value={confirm}
            onChange={setConfirm}
          />

          {feedback && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
              feedback.type === 'ok'
                ? 'bg-neo-bg border-neo-border text-neo-dark'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {feedback.type === 'ok'
                ? <CheckCircle size={15} className="shrink-0" />
                : <AlertCircle size={15} className="shrink-0" />
              }
              {feedback.msg}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving || !current || !newPwd || !confirm}
              className="px-6 py-2.5 text-sm font-semibold bg-neo text-white rounded-xl hover:bg-neo-dark disabled:opacity-40 transition"
            >
              {saving ? 'Sauvegarde…' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── Configuration Meta (admin only) ── */}
      {isAdmin && (
        <Section
          title="Configuration Meta / WhatsApp"
          desc="Paramètres à renseigner dans Meta for Developers"
          icon={ShieldCheck}
        >
          <div className="space-y-4">
            <ReadonlyField label="URL du Webhook" value={webhookUrl} />
            <ReadonlyField label="Token de vérification" value={verifyToken} />

            <div className="mt-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                <Webhook size={13} /> Instructions
              </p>
              <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
                <li>Ouvrez <strong>Meta for Developers</strong> → votre app WhatsApp Business</li>
                <li>Allez dans <strong>WhatsApp → Configuration</strong></li>
                <li>Collez l'URL du webhook ci-dessus dans le champ <em>Callback URL</em></li>
                <li>Collez le token dans le champ <em>Verify token</em></li>
                <li>Souscrivez aux événements : <code>messages</code>, <code>message_deliveries</code></li>
              </ol>
            </div>
          </div>
        </Section>
      )}

      {/* ── Infos système ── */}
      <Section title="Informations système" desc="Détails techniques de l'environnement" icon={Globe}>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Version',    value: '1.0.0' },
            { label: 'Environnement', value: process.env.NODE_ENV === 'production' ? 'Production' : 'Développement' },
            { label: 'API',        value: process.env.NEXT_PUBLIC_API_URL ?? 'Non défini' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-500">{row.label}</span>
              <span className="font-medium text-gray-800 text-xs font-mono">{row.value}</span>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}