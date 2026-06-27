import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

export default function BuyerDashboard() {
  const [inquiries, setInquiries] = useState([]);
  const [threads, setThreads] = useState([]);

  useEffect(() => {
    api.get("/inquiries").then(({ data }) => setInquiries(data));
    api.get("/threads").then(({ data }) => setThreads(data));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="buyer-dashboard">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="label-eyebrow mb-3">Buyer console</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mb-10">Dashboard</h1>

        <div className="grid md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Inquiries sent", value: inquiries.length },
            { label: "Active chats", value: threads.length },
            { label: "Open", value: inquiries.filter(i => i.status === "open").length },
            { label: "Suppliers contacted", value: new Set(inquiries.map(i => i.supplier_id)).size },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6" data-testid={`stat-${i}`}>
              <div className="label-eyebrow">{s.label}</div>
              <div className="font-display font-black text-4xl mt-2">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
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

          <div className="bg-white border border-slate-200">
            <div className="p-5 border-b border-slate-200">
              <h2 className="font-display font-bold text-xl">Recent chats</h2>
            </div>
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
        </div>
      </div>
    </div>
  );
}
