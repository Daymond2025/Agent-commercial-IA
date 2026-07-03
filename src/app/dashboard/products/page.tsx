'use client';

import { useEffect, useState, useRef } from 'react';
import api, { mediaUrl } from '@/lib/api';
import { Plus, Pencil, Trash2, Package, X, Upload, Tag, Link2, Check } from 'lucide-react';

const CHAT_APP_URL = process.env.NEXT_PUBLIC_CHAT_APP_URL || '';
const MAX_IMAGES = 10;

interface GalleryItem { id: string; url: string; file?: File }

const EMPTY: any = {
  name: '', brand: '', description: '', price: '', sale_price: '',
  currency: 'FCFA', is_available: true, stock: 0,
  specs: { RAM: '', Stockage: '', Processeur: '', Écran: '' },
  gallery: [] as GalleryItem[],
};

const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function ProductsPage() {
  const [products,  setProducts] = useState<any[]>([]);
  const [modal,     setModal]   = useState<null | 'create' | 'edit'>(null);
  const [form,      setForm]    = useState<any>(EMPTY);
  const [loading,   setLoading] = useState(false);
  const [copiedId,  setCopiedId] = useState<number | null>(null);
  const [urlInput,  setUrlInput] = useState('');
  const imageRef                 = useRef<HTMLInputElement>(null);

  function copyLink(product: any) {
    const url = `${CHAT_APP_URL}/p/${product.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function load() {
    const { data } = await api.get('/products');
    setProducts(data);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm({ ...EMPTY, specs: { RAM: '', Stockage: '', Processeur: '', Écran: '' } });
    setUrlInput('');
    setModal('create');
  }

  function openEdit(p: any) {
    const urls: string[] = (p.images?.length ? p.images : (p.image_url ? [p.image_url] : []));
    setForm({
      ...p,
      sale_price: p.sale_price ?? '',
      specs: p.specs ?? EMPTY.specs,
      gallery: urls.map((url) => ({ id: url, url })),
    });
    setUrlInput('');
    setModal('edit');
  }

  function onImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setForm((f: any) => ({
      ...f,
      gallery: [
        ...f.gallery,
        ...files.map((file) => ({ id: uid(), url: URL.createObjectURL(file), file })),
      ].slice(0, MAX_IMAGES),
    }));
  }

  function addImageUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setForm((f: any) => ({ ...f, gallery: [...f.gallery, { id: uid(), url }].slice(0, MAX_IMAGES) }));
    setUrlInput('');
  }

  function removeImage(id: string) {
    setForm((f: any) => ({ ...f, gallery: f.gallery.filter((g: GalleryItem) => g.id !== id) }));
  }

  async function save() {
    setLoading(true);
    try {
      const gallery: GalleryItem[] = form.gallery ?? [];
      const newFiles      = gallery.filter((g) => g.file).map((g) => g.file as File);
      const existingUrls  = gallery.filter((g) => !g.file).map((g) => g.url);

      if (newFiles.length > 0) {
        const fd = new FormData();
        fd.append('name',            form.name);
        fd.append('brand',           form.brand        || '');
        fd.append('description',     form.description);
        fd.append('price',           String(form.price));
        fd.append('currency',        form.currency     || 'FCFA');
        fd.append('specs',           JSON.stringify(form.specs));
        fd.append('is_available',    form.is_available ? '1' : '0');
        fd.append('stock',           String(form.stock));
        fd.append('existing_images', JSON.stringify(existingUrls));
        newFiles.forEach((file) => fd.append('images[]', file));
        if (form.sale_price) fd.append('sale_price', String(form.sale_price));

        if (modal === 'create') {
          await api.post('/products', fd);
        } else {
          fd.append('_method', 'PUT');
          await api.post(`/products/${form.id}`, fd);
        }
      } else {
        const payload: any = {
          name: form.name, brand: form.brand, description: form.description,
          price: Number(form.price), currency: form.currency,
          specs: form.specs, is_available: form.is_available,
          stock: Number(form.stock),
          sale_price: form.sale_price ? Number(form.sale_price) : null,
          existing_images: JSON.stringify(existingUrls),
        };
        if (modal === 'create') await api.post('/products', payload);
        else                    await api.put(`/products/${form.id}`, payload);
      }

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
          className="flex items-center gap-2 bg-neo hover:bg-neo-dark text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
        >
          <Plus size={16} /> Ajouter un produit
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow">

            {/* Image ou icône */}
            {p.image_url ? (
              <div className="relative h-40 bg-gray-100 overflow-hidden">
                <img src={mediaUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                {p.images?.length > 1 && (
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    +{p.images.length - 1}
                  </span>
                )}
                <span className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                  p.is_available ? 'bg-neo-bg text-neo-dark' : 'bg-red-100 text-red-600'
                }`}>
                  {p.is_available ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 bg-neo-bg">
                <Package size={32} className="text-neo opacity-40" />
              </div>
            )}

            <div className="p-5 flex flex-col gap-3 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{p.name}</h3>
                  <p className="text-xs text-gray-400">{p.brand}</p>
                </div>
                {!p.image_url && (
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                    p.is_available ? 'bg-neo-bg text-neo-dark' : 'bg-red-100 text-red-600'
                  }`}>
                    {p.is_available ? 'Disponible' : 'Indisponible'}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>

              {p.specs && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(p.specs).filter(([, v]) => v).map(([k, v]: any) => (
                    <span key={k} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-lg">
                      {k}: {v}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                <div>
                  {p.sale_price ? (
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-neo">{fmt(Number(p.sale_price))} F</p>
                      <p className="text-xs text-gray-400 line-through">{fmt(Number(p.price))} F</p>
                      <span className="flex items-center gap-0.5 bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 rounded-lg font-medium">
                        <Tag size={10} /> Promo
                      </span>
                    </div>
                  ) : (
                    <p className="text-base font-bold text-neo">{fmt(Number(p.price))} F</p>
                  )}
                  <p className="text-xs text-gray-400">Stock : {p.stock} unité{p.stock !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => copyLink(p)}
                    title="Copier le lien pour pub Facebook"
                    className={`p-2 rounded-lg transition ${
                      copiedId === p.id
                        ? 'text-green-600 bg-green-50'
                        : 'text-gray-400 hover:text-neo hover:bg-neo-bg'
                    }`}
                  >
                    {copiedId === p.id ? <Check size={15} /> : <Link2 size={15} />}
                  </button>
                  <button onClick={() => openEdit(p)} className="p-2 text-gray-400 hover:text-neo hover:bg-neo-bg rounded-lg transition">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={15} />
                  </button>
                </div>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">
                {modal === 'create' ? 'Nouveau produit' : 'Modifier le produit'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4">

              {/* Galerie d'images */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Images du produit ({form.gallery?.length ?? 0}/{MAX_IMAGES})
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(form.gallery ?? []).map((g: GalleryItem, i: number) => (
                    <div key={g.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={g.file ? g.url : mediaUrl(g.url)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                          Couverture
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(g.id)}
                        className="absolute top-1 right-1 bg-white/90 hover:bg-white text-gray-700 p-1 rounded-full shadow transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {(form.gallery?.length ?? 0) < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => imageRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-neo hover:text-neo transition"
                    >
                      <Upload size={18} />
                      <span className="text-[11px]">Ajouter</span>
                    </button>
                  )}
                </div>
                <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={onImages} />
                <p className="text-xs text-gray-400 mt-1.5">
                  JPG, PNG — max 4 Mo par image. La première image sert de couverture.
                </p>

                <div className="mt-2 flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } }}
                    placeholder="ou coller une URL externe"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={addImageUrl}
                    className="shrink-0 px-3 py-2 text-xs font-medium bg-neo-bg text-neo-dark rounded-xl hover:bg-neo hover:text-white transition border border-neo-border"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Champs texte */}
              {[
                { key: 'name',  label: 'Nom du produit', type: 'text'   },
                { key: 'brand', label: 'Marque',         type: 'text'   },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input
                    type={type}
                    value={form[key] ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                  />
                </div>
              ))}

              {/* Prix */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Prix normal (FCFA)</label>
                  <input
                    type="number"
                    value={form.price ?? ''}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                    Prix promo{' '}
                    <span className="font-normal normal-case text-gray-400">(optionnel)</span>
                  </label>
                  <input
                    type="number"
                    value={form.sale_price ?? ''}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    placeholder="Laisser vide si aucune promo"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Stock</label>
                <input
                  type="number"
                  value={form.stock ?? 0}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50 resize-none"
                />
              </div>

              {/* Spécifications */}
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
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neo bg-gray-50"
                        placeholder={`Valeur ${key}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggle disponibilité */}
              <label className="flex items-center gap-3 text-sm cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, is_available: !form.is_available })}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.is_available ? 'bg-neo' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_available ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-gray-700 font-medium">Disponible à la vente</span>
              </label>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={loading}
                className="flex-1 bg-neo hover:bg-neo-dark text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60"
              >
                {loading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}