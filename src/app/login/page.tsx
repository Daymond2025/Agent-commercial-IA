'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      Cookies.set('token', data.token, { expires: 1 });
      Cookies.set('user',  JSON.stringify(data.user), { expires: 1 });
      router.push('/dashboard');
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F0F2F8]">

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0B1739] text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-lg">D</div>
          <span className="text-xl font-bold">Daymond</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Plateforme de<br />vente intelligente
          </h1>
          <p className="text-blue-200 text-base leading-relaxed max-w-sm">
            Gérez vos agents IA WhatsApp, suivez vos commandes et analysez vos performances en temps réel.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Agents actifs',    value: '∞' },
              { label: 'Ventes 24/7',      value: '100%' },
              { label: 'Réponse auto',     value: '<2s' },
              { label: 'Langues',          value: 'FR' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-blue-300 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-400 text-sm">© 2024 Daymond — Côte d'Ivoire</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-lg">D</div>
            <span className="text-xl font-bold text-gray-900">Daymond</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Connexion</h2>
            <p className="text-gray-400 text-sm mb-7">Accédez à votre espace de gestion</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="votre@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60 mt-2 text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
