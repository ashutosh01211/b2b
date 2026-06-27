import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { fileUrl } from "@/lib/api";

const HERO = "https://images.unsplash.com/photo-1760124056883-732e7a5e2e68?crop=entropy&cs=srgb&fm=jpg&q=85";
const PROD_FALLBACK = [
  "https://images.unsplash.com/photo-1717386255773-1e3037c81788?crop=entropy&cs=srgb&fm=jpg&q=85",
  "https://images.unsplash.com/photo-1647427060118-4911c9821b82?crop=entropy&cs=srgb&fm=jpg&q=85",
  "https://images.unsplash.com/photo-1610891015188-5369212db097?crop=entropy&cs=srgb&fm=jpg&q=85",
];

export default function Landing() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    api.get("/products?limit=6").then(({ data }) => setProducts(data)).catch(() => {});
  }, []);

  return (
    <div className="bg-white" data-testid="landing-page">
      {/* HERO */}
      <section className="relative border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-32 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="label-eyebrow mb-6" data-testid="hero-eyebrow">Global B2B Marketplace · Est. 2026</div>
            <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl tracking-tighter leading-[0.95] mb-8">
              Source smarter.<br />
              Sell <span className="text-[#0047FF]">borderless</span>.
            </h1>
            <p className="font-body text-lg text-slate-600 leading-relaxed max-w-xl mb-10">
              The infrastructure for verified suppliers, qualified buyers, and frictionless trade — from inquiry to invoice.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/browse" className="btn-primary" data-testid="hero-cta-browse">Browse Products →</Link>
              <Link to="/register" className="btn-secondary" data-testid="hero-cta-register">Sell on B2B/HUB</Link>
            </div>
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-md">
              <div><div className="font-display text-3xl font-black">12k+</div><div className="label-eyebrow mt-1">Suppliers</div></div>
              <div><div className="font-display text-3xl font-black">180+</div><div className="label-eyebrow mt-1">Countries</div></div>
              <div><div className="font-display text-3xl font-black">$2B+</div><div className="label-eyebrow mt-1">GMV</div></div>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] relative overflow-hidden border border-slate-200">
              <img src={HERO} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white p-4 border border-slate-200">
                  <div className="label-eyebrow">Verified Network</div>
                  <div className="font-display font-bold text-lg mt-1">Real-time Quotes</div>
                  <div className="text-sm text-slate-600 mt-1">Chat with suppliers instantly. No middlemen.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="label-eyebrow mb-4">What we do</div>
          <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight mb-16 max-w-3xl">
            Three roles. One marketplace. Zero friction.
          </h2>
          <div className="grid md:grid-cols-3 border-t border-l border-slate-200">
            {[
              { eb: "01 / For Buyers", title: "Find verified suppliers", desc: "Search across thousands of qualified manufacturers and distributors. Filter by category, country, and minimum order." },
              { eb: "02 / For Suppliers", title: "Showcase your catalog", desc: "Create a company profile, upload products with images, and receive RFQs from qualified buyers worldwide." },
              { eb: "03 / Realtime Chat", title: "Negotiate in real time", desc: "Built-in WebSocket messaging means no email tag. Quote, counter-offer, and close deals within the platform." },
            ].map((f, i) => (
              <div key={i} className="p-10 border-r border-b border-slate-200 hover:bg-slate-50 transition-colors">
                <div className="label-eyebrow text-[#0047FF]">{f.eb}</div>
                <h3 className="font-display font-bold text-2xl mt-4 tracking-tight">{f.title}</h3>
                <p className="text-slate-600 mt-3 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="label-eyebrow mb-4">Featured</div>
              <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">Latest listings</h2>
            </div>
            <Link to="/browse" className="text-sm font-semibold hover:text-[#0047FF]" data-testid="featured-view-all">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(products.length ? products : Array(3).fill(null)).slice(0, 6).map((p, i) => (
              <Link
                key={p?.id || i}
                to={p ? `/products/${p.id}` : "/browse"}
                className="card-flat block"
                data-testid={`featured-product-${i}`}
              >
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden border-b border-slate-200">
                  <img
                    src={p?.images?.[0] ? fileUrl(p.images[0]) : PROD_FALLBACK[i % PROD_FALLBACK.length]}
                    alt="" className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="label-eyebrow">{p?.category || "Industrial"}</div>
                  <div className="font-display font-bold text-lg mt-1 truncate">{p?.title || "Industrial product"}</div>
                  <div className="text-sm text-slate-500 mt-1 truncate">{p?.company?.name || "Verified supplier"}</div>
                  <div className="mt-3 font-display font-bold text-xl">{p?.price ? `$${p.price}` : "On request"}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 grid md:grid-cols-2 gap-12 items-center">
          <h2 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-tight">
            Ready to move<br />your business?
          </h2>
          <div>
            <p className="text-slate-300 text-lg leading-relaxed mb-8">
              Join thousands of buyers and suppliers transacting on B2B/HUB. Setup takes 2 minutes.
            </p>
            <div className="flex gap-4">
              <Link to="/register" className="bg-white text-slate-900 px-6 py-3 font-bold hover:bg-slate-100 transition" data-testid="cta-register">
                Create account
              </Link>
              <Link to="/browse" className="border border-white px-6 py-3 font-bold hover:bg-white hover:text-slate-900 transition" data-testid="cta-explore">
                Explore catalog
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-900 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 flex justify-between">
          <div>© 2026 B2B/HUB — Built for global trade.</div>
          <div className="font-mono tracking-widest">v.1.0</div>
        </div>
      </footer>
    </div>
  );
}
