import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { fileUrl } from "@/lib/api";

const FALLBACK = "https://images.unsplash.com/photo-1717386255773-1e3037c81788?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function CompanyProfile() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  useEffect(() => { api.get(`/companies/${id}`).then(({ data }) => setCompany(data)); }, [id]);

  if (!company) return <div className="p-12 text-center text-slate-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-white" data-testid="company-profile">
      <div className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
          <div className="label-eyebrow text-slate-400">{company.country || "Global"} · {company.industry || "General"}</div>
          <h1 className="font-display font-black text-5xl sm:text-6xl tracking-tighter mt-4">{company.name}</h1>
          {company.verified && <div className="inline-block mt-4 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-1 border border-emerald-400/40">VERIFIED SUPPLIER</div>}
          <p className="text-slate-300 mt-6 max-w-2xl text-lg leading-relaxed">{company.description || "Verified supplier on B2B/HUB."}</p>
          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer" className="inline-block mt-6 text-[#3a78ff] font-semibold" data-testid="company-website">{company.website} →</a>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <h2 className="font-display font-bold text-3xl tracking-tight mb-8">Products ({company.products?.length || 0})</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(company.products || []).map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="card-flat block" data-testid={`company-product-${p.id}`}>
              <div className="aspect-[4/3] bg-slate-100 overflow-hidden border-b border-slate-200">
                <img src={p.images?.[0] ? fileUrl(p.images[0]) : FALLBACK} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <div className="label-eyebrow">{p.category}</div>
                <div className="font-display font-bold text-lg mt-1 truncate">{p.title}</div>
                <div className="font-display font-bold text-xl mt-3">${p.price?.toFixed?.(2)}</div>
              </div>
            </Link>
          ))}
          {(!company.products || company.products.length === 0) && (
            <div className="col-span-full text-slate-500 text-center py-12">No products listed yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
