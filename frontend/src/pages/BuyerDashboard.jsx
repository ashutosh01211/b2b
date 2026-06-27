import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { fileUrl } from "@/lib/api";
import { FavoriteButton } from "@/hooks/useFavorites";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FALLBACK = "https://images.unsplash.com/photo-1717386255773-1e3037c81788?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function BuyerDashboard() {
  const [inquiries, setInquiries] = useState([]);
  const [threads, setThreads] = useState([]);
  const [saved, setSaved] = useState([]);

  const refresh = () => {
    api.get("/inquiries").then(({ data }) => setInquiries(data));
    api.get("/threads").then(({ data }) => setThreads(data));
    api.get("/favorites").then(({ data }) => setSaved(data));
  };
  useEffect(() => { refresh(); }, []);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="buyer-dashboard">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="label-eyebrow mb-3">Buyer console</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mb-10">Dashboard</h1>

        <div className="grid md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Inquiries sent", value: inquiries.length },
            { label: "Active chats", value: threads.length },
            { label: "Saved products", value: saved.length },
            { label: "Suppliers contacted", value: new Set(inquiries.map(i => i.supplier_id)).size },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6" data-testid={`stat-${i}`}>
              <div className="label-eyebrow">{s.label}</div>
              <div className="font-display font-black text-4xl mt-2">{s.value}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="inquiries">
          <TabsList className="bg-white border border-slate-200 rounded-none p-0 h-auto">
            <TabsTrigger value="inquiries" data-testid="buyer-tab-inquiries" className="rounded-none data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-3 font-bold">Inquiries</TabsTrigger>
            <TabsTrigger value="chats" data-testid="buyer-tab-chats" className="rounded-none data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-3 font-bold">Recent Chats</TabsTrigger>
            <TabsTrigger value="saved" data-testid="buyer-tab-saved" className="rounded-none data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-3 font-bold">Saved ({saved.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="inquiries" className="mt-6">
            <div className="bg-white border border-slate-200">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-display font-bold text-xl">My inquiries</h2>
                <Link to="/browse" className="text-sm text-[#0047FF] font-semibold">+ New</Link>
              </div>
              <div className="divide-y divide-slate-200">
                {inquiries.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No inquiries yet. <Link to="/browse" className="text-[#0047FF] font-semibold">Browse products</Link></div>}
                {inquiries.map(i => (
                  <Link key={i.id} to={`/chat/${i.thread_id}`} className="p-5 block hover:bg-slate-50" data-testid={`inquiry-${i.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="font-display font-bold">{i.product_title}</div>
                      <span className="text-xs font-bold border border-slate-300 px-2 py-1 uppercase">{i.status}</span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Qty: {i.quantity}</div>
                    <div className="text-sm text-slate-600 mt-2 line-clamp-2">{i.message}</div>
                  </Link>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="chats" className="mt-6">
            <div className="bg-white border border-slate-200">
              <div className="divide-y divide-slate-200">
                {threads.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No chats yet.</div>}
                {threads.map(t => (
                  <Link key={t.id} to={`/chat/${t.id}`} className="p-5 block hover:bg-slate-50" data-testid={`thread-${t.id}`}>
                    <div className="font-display font-bold">{t.supplier_name}</div>
                    <div className="text-sm text-slate-500 mt-1">re: {t.product_title}</div>
                  </Link>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            {saved.length === 0 ? (
              <div className="bg-white border border-slate-200 p-12 text-center text-slate-500">
                No saved products yet. <Link to="/browse" className="text-[#0047FF] font-semibold">Browse the catalog →</Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {saved.map(p => (
                  <Link key={p.id} to={`/products/${p.id}`} className="card-flat block relative" data-testid={`saved-${p.id}`}>
                    <div className="absolute top-3 right-3 z-10">
                      <FavoriteButton productId={p.id} />
                    </div>
                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden border-b border-slate-200">
                      <img src={p.images?.[0] ? fileUrl(p.images[0]) : FALLBACK} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5">
                      <div className="label-eyebrow">{p.category}</div>
                      <div className="font-display font-bold text-lg mt-1 truncate">{p.title}</div>
                      <div className="text-sm text-slate-500 mt-1 truncate">{p.company?.name || "—"}</div>
                      <div className="font-display font-bold text-xl mt-3">${p.price?.toFixed?.(2)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
