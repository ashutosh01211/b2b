import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { fileUrl, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { FavoriteButton } from "@/hooks/useFavorites";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const FALLBACK = "https://images.unsplash.com/photo-1717386255773-1e3037c81788?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [product, setProduct] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/products/${id}`).then(({ data }) => setProduct(data)).catch(() => toast.error("Not found"));
  }, [id]);

  const submitInquiry = async () => {
    if (!user) { nav("/login"); return; }
    if (user.role !== "buyer") { toast.error("Only buyers can send inquiries"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/inquiries", { product_id: id, message: msg, quantity: qty });
      toast.success("Inquiry sent");
      setOpen(false);
      nav(`/chat/${data.thread_id}`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Failed");
    } finally { setBusy(false); }
  };

  if (!product) return <div className="p-12 text-center text-slate-500" data-testid="product-loading">Loading…</div>;

  const images = product.images?.length ? product.images.map(fileUrl) : [FALLBACK];

  return (
    <div className="min-h-screen bg-white" data-testid="product-detail">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <Link to="/browse" className="label-eyebrow hover:text-[#0047FF]">← Back to browse</Link>
        <div className="grid lg:grid-cols-2 gap-12 mt-8">
          <div>
            <div className="aspect-square bg-slate-100 border border-slate-200 overflow-hidden">
              <img src={images[activeImg]} alt="" className="w-full h-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square border ${i === activeImg ? "border-slate-900" : "border-slate-200"}`}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="label-eyebrow">{product.category}</div>
            <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mt-3">{product.title}</h1>
            {product.company && (
              <Link to={`/companies/${product.company.id}`} className="inline-block mt-3 text-[#0047FF] font-semibold" data-testid="product-company-link">
                by {product.company.name}
              </Link>
            )}

            <div className="grid grid-cols-2 gap-6 mt-8 border-t border-b border-slate-200 py-6">
              <div>
                <div className="label-eyebrow">Price</div>
                <div className="font-display font-bold text-3xl mt-1">${product.price?.toFixed?.(2) || "0.00"}</div>
                <div className="text-xs text-slate-500 mt-1">per {product.unit}</div>
              </div>
              <div>
                <div className="label-eyebrow">Min. Order</div>
                <div className="font-display font-bold text-3xl mt-1">{product.moq}</div>
                <div className="text-xs text-slate-500 mt-1">{product.unit}s</div>
              </div>
            </div>

            <p className="text-slate-700 leading-relaxed mt-6">{product.description || "No description provided."}</p>

            <div className="mt-8 flex gap-3 items-stretch">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <button data-testid="product-inquiry-btn" className="btn-primary flex-1">Send Inquiry →</button>
                </DialogTrigger>
                <DialogContent className="rounded-none border-slate-300 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-display font-bold text-2xl">Request a quote</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="label-eyebrow block mb-2">Quantity</label>
                      <input data-testid="inquiry-qty" type="number" min="1" className="input-flat" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="label-eyebrow block mb-2">Message to supplier</label>
                      <textarea data-testid="inquiry-message" required rows={5} className="input-flat" style={{ height: "auto", padding: "0.75rem 1rem" }}
                        value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Hi, I'd like to know more about pricing, MOQ flexibility, and shipping..." />
                    </div>
                    <button data-testid="inquiry-submit" disabled={busy || !msg} onClick={submitInquiry} className="btn-primary w-full">
                      {busy ? "Sending…" : "Send inquiry"}
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
              <FavoriteButton productId={id} className="!p-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
