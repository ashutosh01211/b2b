import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { fileUrl } from "@/lib/api";
import { FavoriteButton } from "@/hooks/useFavorites";

const PROD_FALLBACK = "https://images.unsplash.com/photo-1717386255773-1e3037c81788?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function Browse() {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [tab, setTab] = useState("products");
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/products", { params: { q, category: cat, limit: 60 } });
      setProducts(data);
    } finally { setLoading(false); }
  };
  const fetchCompanies = async () => {
    const { data } = await api.get("/companies", { params: { q } });
    setCompanies(data);
  };

  useEffect(() => { api.get("/products/categories").then(({ data }) => setCats(data)); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { tab === "products" ? fetchProducts() : fetchCompanies(); }, [tab]);

  const submit = (e) => {
    e.preventDefault();
    tab === "products" ? fetchProducts() : fetchCompanies();
  };

  return (
    <div className="min-h-screen bg-white" data-testid="browse-page">
      <div className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
          <div className="label-eyebrow mb-3">Marketplace</div>
          <h1 className="font-display font-black text-5xl tracking-tighter mb-8">Browse the network</h1>

          <div className="flex gap-2 border border-slate-200 w-fit mb-6">
            <button
              data-testid="tab-products"
              onClick={() => setTab("products")}
              className={`px-6 py-3 font-bold text-sm ${tab === "products" ? "bg-slate-900 text-white" : ""}`}>
              Products
            </button>
            <button
              data-testid="tab-companies"
              onClick={() => setTab("companies")}
              className={`px-6 py-3 font-bold text-sm ${tab === "companies" ? "bg-slate-900 text-white" : ""}`}>
              Suppliers
            </button>
          </div>

          <form onSubmit={submit} className="flex flex-wrap gap-3">
            <input
              data-testid="browse-search"
              className="input-flat flex-1 min-w-[240px]"
              placeholder={tab === "products" ? "Search products..." : "Search suppliers..."}
              value={q} onChange={(e) => setQ(e.target.value)}
            />
            {tab === "products" && (
              <select
                data-testid="browse-category"
                value={cat} onChange={(e) => setCat(e.target.value)}
                className="input-flat w-auto min-w-[160px]"
              >
                <option value="all">All categories</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button data-testid="browse-submit" className="btn-primary">Search →</button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {tab === "products" ? (
          <>
            <div className="label-eyebrow mb-6">{products.length} result{products.length !== 1 ? "s" : ""}</div>
            {loading ? (
              <div className="text-center text-slate-500 py-12">Loading…</div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 border border-slate-200">
                <div className="font-display font-bold text-2xl">No products yet</div>
                <div className="text-slate-500 mt-2">Be the first supplier to list one.</div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <Link key={p.id} to={`/products/${p.id}`} className="card-flat block relative" data-testid={`product-card-${p.id}`}>
                    <div className="absolute top-3 right-3 z-10">
                      <FavoriteButton productId={p.id} />
                    </div>
                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden border-b border-slate-200">
                      <img src={p.images?.[0] ? fileUrl(p.images[0]) : PROD_FALLBACK} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5">
                      <div className="label-eyebrow">{p.category}</div>
                      <div className="font-display font-bold text-lg mt-1 truncate">{p.title}</div>
                      <div className="text-sm text-slate-500 mt-1 truncate">{p.company?.name || "—"}</div>
                      <div className="flex justify-between items-end mt-3">
                        <div className="font-display font-bold text-xl">${p.price?.toFixed?.(2) || "0.00"}</div>
                        <div className="text-xs text-slate-500">MOQ: {p.moq} {p.unit}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="label-eyebrow mb-6">{companies.length} supplier{companies.length !== 1 ? "s" : ""}</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((c) => (
                <Link key={c.id} to={`/companies/${c.id}`} className="card-flat block p-6" data-testid={`company-card-${c.id}`}>
                  <div className="label-eyebrow">{c.country || "Global"}</div>
                  <div className="font-display font-bold text-xl mt-2">{c.name}</div>
                  <div className="text-sm text-slate-500 mt-1">{c.industry || "General trading"}</div>
                  <div className="mt-4 text-sm text-slate-600 line-clamp-3">{c.description || "Verified supplier on B2B/HUB."}</div>
                  {c.verified && <div className="mt-4 inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 border border-emerald-200">VERIFIED</div>}
                </Link>
              ))}
              {companies.length === 0 && (
                <div className="col-span-full text-center text-slate-500 py-12">No suppliers found.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
