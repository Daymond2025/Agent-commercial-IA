'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY_PRODUCT = {
  name: '', brand: '', description: '', price: '',
  currency: 'FCFA', is_available: true, stock: 0,
  specs: { RAM: '', Stockage: '', Processeur: '', Écran: '' },
};

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [form, setForm] = useState<any>(EMPTY_PRODUCT);
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await api.get('/products');
    setProducts(data);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY_PRODUCT); setModal('create'); }
  function openEdit(p: any) {
    setForm({ ...p, specs: p.specs ?? { RAM: '', Stockage: '', Processeur: '', Écran: '' } });
    setModal('edit');
  }

  async function save() {
    setLoading(true);
    try {
      if (modal === 'create') await api.post('/products', form);
      else await api.put(`/products/${form.id}`, form);
      await load();
      setModal(null);
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Supprimer ce produit ?')) return;
    await api.delete(`/products/${id}`);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Catalogue Produits</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
        >
          <Plus size={16} /> Ajouter un produit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="text-xs text-gray-400">{p.brand}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {p.is_available ? 'Disponible' : 'Indisponible'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {p.specs && Object.entries(p.specs).map(([k, v]: any) => (
                <span key={k} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{k}: {v}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-bold text-blue-700">
                {new Intl.NumberFormat('fr-CI').format(p.price)} {p.currency}
              </span>
              <div className="flex gap-2">
                <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(p.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Stock: {p.stock}</p>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold mb-4">
              {modal === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
            </h2>

            <div className="space-y-3">
              {[
                { key: 'name', label: 'Nom', type: 'text' },
                { key: 'brand', label: 'Marque', type: 'text' },
                { key: 'price', label: 'Prix (FCFA)', type: 'number' },
                { key: 'stock', label: 'Stock', type: 'number' },
                { key: 'image_url', label: 'URL Image', type: 'url' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input
                    type={type}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-sm font-medium text-gray-700 mt-2">Spécifications</p>
              {Object.keys(form.specs ?? {}).map((key) => (
                <div key={key} className="flex gap-2 items-center">
                  <span className="text-sm text-gray-500 w-24 shrink-0">{key}</span>
                  <input
                    type="text"
                    value={form.specs[key] ?? ''}
                    onChange={(e) => setForm({ ...form, specs: { ...form.specs, [key]: e.target.value } })}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                />
                Disponible à la vente
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60"
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