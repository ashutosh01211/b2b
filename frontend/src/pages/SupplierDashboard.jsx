import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { fileUrl, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EMPTY_PRODUCT = { title: "", description: "", category: "General", price: 0, moq: 1, unit: "piece", images: [], status: "active" };
const EMPTY_COMPANY = { name: "", description: "", website: "", country: "", industry: "", year_established: null, logo: "" };

export default function SupplierDashboard() {
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [inquiries, setInquiries] = useState([]);
  const [threads, setThreads] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    const [p, c, i, t] = await Promise.all([
      api.get("/products/me/list"),
      api.get("/companies/me/profile"),
      api.get("/inquiries"),
      api.get("/threads"),
    ]);
    setProducts(p.data); setCompany(c.data || EMPTY_COMPANY);
    setInquiries(i.data); setThreads(t.data);
  };
  useEffect(() => { refresh(); }, []);

  const saveCompany = async () => {
    try {
      await api.put("/companies/me", company);
      toast.success("Company updated");
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(f => ({ ...f, images: [...f.images, data.path] }));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Upload failed");
    } finally { setUploading(false); }
  };

  const saveProduct = async () => {
    try {
      if (editing) {
        await api.put(`/products/${editing}`, form);
        toast.success("Product updated");
      } else {
        await api.post("/products", form);
        toast.success("Product created");
      }
      setOpen(false); setEditing(null); setForm(EMPTY_PRODUCT); refresh();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const openEdit = (p) => { setEditing(p.id); setForm({ ...EMPTY_PRODUCT, ...p }); setOpen(true); };
  const openNew = () => { setEditing(null); setForm(EMPTY_PRODUCT); setOpen(true); };
  const deleteProduct = async (pid) => {
    if (!window.confirm("Delete this product?")) return;
    await api.delete(`/products/${pid}`); refresh(); toast.success("Deleted");
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="supplier-dashboard">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="label-eyebrow mb-3">Supplier console</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mb-10">{company.name || "Dashboard"}</h1>

        <div className="grid md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Products", value: products.length },
            { label: "Inquiries", value: inquiries.length },
            { label: "Active chats", value: threads.length },
            { label: "Open inquiries", value: inquiries.filter(i => i.status === "open").length },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 p-6">
              <div className="label-eyebrow">{s.label}</div>
              <div className="font-display font-black text-4xl mt-2">{s.value}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="bg-white border border-slate-200 rounded-none p-0 h-auto">
            <TabsTrigger value="products" data-testid="tab-supplier-products" className="rounded-none data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-3 font-bold">Products</TabsTrigger>
            <TabsTrigger value="inquiries" data-testid="tab-supplier-inquiries" className="rounded-none data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-3 font-bold">Inquiries</TabsTrigger>
            <TabsTrigger value="company" data-testid="tab-supplier-company" className="rounded-none data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-3 font-bold">Company</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-bold text-2xl">My Products</h2>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <button onClick={openNew} className="btn-primary" data-testid="add-product-btn">+ Add Product</button>
                </DialogTrigger>
                <DialogContent className="rounded-none max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display font-bold text-2xl">{editing ? "Edit" : "Create"} Product</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="label-eyebrow block mb-2">Title</label>
                      <input data-testid="product-title-input" className="input-flat" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label-eyebrow block mb-2">Category</label>
                        <input className="input-flat" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-eyebrow block mb-2">Unit</label>
                        <input className="input-flat" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                      </div>
                      <div>
                        <label className="label-eyebrow block mb-2">Price (USD)</label>
                        <input type="number" className="input-flat" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="label-eyebrow block mb-2">MOQ</label>
                        <input type="number" className="input-flat" value={form.moq} onChange={e => setForm({ ...form, moq: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div>
                      <label className="label-eyebrow block mb-2">Description</label>
                      <textarea rows={4} className="input-flat" style={{ height: "auto", padding: "0.75rem 1rem" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-eyebrow block mb-2">Images</label>
                      <input data-testid="product-image-input" type="file" accept="image/*" onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])} />
                      {uploading && <div className="text-sm text-slate-500 mt-2">Uploading…</div>}
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {form.images.map((p, idx) => (
                          <div key={idx} className="relative aspect-square border border-slate-200">
                            <img src={fileUrl(p)} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => setForm({ ...form, images: form.images.filter((_, i) => i !== idx) })} className="absolute top-1 right-1 bg-white border border-slate-900 px-1 text-xs font-bold">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button data-testid="product-save-btn" onClick={saveProduct} className="btn-primary w-full">{editing ? "Update" : "Create"} →</button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.length === 0 && <div className="col-span-full text-center py-16 border border-slate-200 bg-white text-slate-500">No products yet — add your first.</div>}
              {products.map(p => (
                <div key={p.id} className="card-flat" data-testid={`my-product-${p.id}`}>
                  <div className="aspect-[4/3] bg-slate-100 border-b border-slate-200 overflow-hidden">
                    {p.images?.[0] && <img src={fileUrl(p.images[0])} className="w-full h-full object-cover" alt="" />}
                  </div>
                  <div className="p-5">
                    <div className="label-eyebrow">{p.category}</div>
                    <div className="font-display font-bold text-lg mt-1 truncate">{p.title}</div>
                    <div className="font-display font-bold text-xl mt-2">${p.price?.toFixed?.(2)}</div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => openEdit(p)} className="btn-secondary text-xs flex-1">Edit</button>
                      <button onClick={() => deleteProduct(p.id)} className="text-xs border border-red-500 text-red-500 px-3 hover:bg-red-50">Del</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="inquiries" className="mt-6">
            <div className="bg-white border border-slate-200">
              {inquiries.length === 0 && <div className="p-8 text-center text-slate-500">No inquiries yet.</div>}
              <div className="divide-y divide-slate-200">
                {inquiries.map(i => (
                  <Link key={i.id} to={`/chat/${i.thread_id}`} className="p-5 block hover:bg-slate-50" data-testid={`s-inquiry-${i.id}`}>
                    <div className="flex justify-between">
                      <div>
                        <div className="font-display font-bold">{i.product_title}</div>
                        <div className="text-sm text-slate-500 mt-1">From: {i.buyer_name} · Qty: {i.quantity}</div>
                      </div>
                      <span className="text-xs font-bold border border-slate-300 px-2 py-1 uppercase h-fit">{i.status}</span>
                    </div>
                    <div className="text-sm text-slate-700 mt-2">{i.message}</div>
                  </Link>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="company" className="mt-6">
            <div className="bg-white border border-slate-200 p-8 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-eyebrow block mb-2">Name</label>
                  <input className="input-flat" value={company.name || ""} onChange={e => setCompany({ ...company, name: e.target.value })} />
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">Industry</label>
                  <input className="input-flat" value={company.industry || ""} onChange={e => setCompany({ ...company, industry: e.target.value })} />
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">Country</label>
                  <input className="input-flat" value={company.country || ""} onChange={e => setCompany({ ...company, country: e.target.value })} />
                </div>
                <div>
                  <label className="label-eyebrow block mb-2">Website</label>
                  <input className="input-flat" value={company.website || ""} onChange={e => setCompany({ ...company, website: e.target.value })} />
                </div>
              </div>
              <div className="mt-4">
                <label className="label-eyebrow block mb-2">Description</label>
                <textarea rows={5} className="input-flat" style={{ height: "auto", padding: "0.75rem 1rem" }} value={company.description || ""} onChange={e => setCompany({ ...company, description: e.target.value })} />
              </div>
              <button onClick={saveCompany} data-testid="save-company-btn" className="btn-primary mt-6">Save Profile →</button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
