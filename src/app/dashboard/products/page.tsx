'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, Package, X } from 'lucide-react';

const EMPTY: any = {
  name: '', brand: '', description: '', price: '',
  currency: 'FCFA', is_available: true, stock: 0,
  specs: { RAM: '', Stockage: '', Processeur: '', Écran: '' },
};

const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n);

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [modal, setModal]       = useState<null | 'create' | 'edit'>(null);
  const [form, setForm]         = useState<any>(EMPTY);
  const [loading, setLoading]   = useState(false);

  async function load() {
    const { data } = await api.get('/products');
    setProducts(data);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setModal('create'); }
  function openEdit(p: any) {
    setForm({ ...p, specs: p.specs ?? EMPTY.specs });
    setModal('edit');
  }

  async function save() {
    setLoading(true);
    try {
      if (modal === 'create') await api.post('/products', form);
      else await api.put(`/products/${form.id}`, form);
      await load();
      setModal(null);
    } finally { setLoading(false); }
  }

  async function remove(id: number) {
    if (!confirm('Supprimer ce produit ?')) return;
    await api.delete(`/products/${id}`);
    load();
  }

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catalogue Produits</h1>
          <p className="text-sm text-gray-400">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
        >
          <Plus size={16} /> Ajouter un produit
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Package size={18} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                  <p className="text-xs text-gray-400">{p.brand}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                p.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
                {p.is_available ? 'Disponible' : 'Indisponible'}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>

            {/* Specs */}
            {p.specs && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(p.specs).filter(([, v]) => v).map(([k, v]: any) => (
                  <span key={k} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-lg">
                    {k}: {v}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
              <div>
                <p className="text-base font-bold text-blue-600">{fmt(p.price)} F</p>
                <p className="text-xs text-gray-400">Stock: {p.stock} unité{p.stock !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(p)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-300">
            <Package size={40} className="mb-3" />
            <p className="text-sm">Aucun produit dans le catalogue</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">
                {modal === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {[
                { key: 'name',      label: 'Nom du produit', type: 'text' },
                { key: 'brand',     label: 'Marque',         type: 'text' },
                { key: 'price',     label: 'Prix (FCFA)',    type: 'number' },
                { key: 'stock',     label: 'Stock',          type: 'number' },
                { key: 'image_url', label: 'URL Image',      type: 'url' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input
                    type={type}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Spécifications</label>
                <div className="space-y-2">
                  {Object.keys(form.specs ?? {}).map((key) => (
                    <div key={key} className="flex gap-2 items-center">
                      <span className="text-xs text-gray-500 w-24 shrink-0 font-medium">{key}</span>
                      <input
                        type="text"
                        value={form.specs[key] ?? ''}
                        onChange={(e) => setForm({ ...form, specs: { ...form.specs, [key]: e.target.value } })}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        placeholder={`Valeur ${key}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, is_available: !form.is_available })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_available ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-gray-700 font-medium">Disponible à la vente</span>
              </label>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
