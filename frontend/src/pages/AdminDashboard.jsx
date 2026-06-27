import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);

  const refresh = async () => {
    const [s, u, c, p] = await Promise.all([
      api.get("/admin/stats"), api.get("/admin/users"),
      api.get("/admin/companies"), api.get("/admin/products"),
    ]);
    setStats(s.data); setUsers(u.data); setCompanies(c.data); setProducts(p.data);
  };
  useEffect(() => { refresh(); }, []);

  const verifyCompany = async (id) => {
    await api.post(`/admin/companies/${id}/verify`); toast.success("Verified"); refresh();
  };
  const delUser = async (id) => {
    if (!window.confirm("Delete user?")) return;
    await api.delete(`/admin/users/${id}`); toast.success("Deleted"); refresh();
  };

  const statList = [
    ["Total Users", stats.users], ["Buyers", stats.buyers], ["Suppliers", stats.suppliers],
    ["Companies", stats.companies], ["Products", stats.products], ["Inquiries", stats.inquiries],
    ["Messages", stats.messages],
  ];

  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        <div className="label-eyebrow mb-3">Admin console</div>
        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mb-10">Control room</h1>

        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          {statList.map(([k, v]) => (
            <div key={k} className="bg-white border border-slate-200 p-5">
              <div className="label-eyebrow">{k}</div>
              <div className="font-display font-black text-3xl mt-2">{v ?? 0}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="bg-white border border-slate-200 rounded-none p-0 h-auto">
            <TabsTrigger value="users" data-testid="admin-tab-users" className="rounded-none data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-3 font-bold">Users</TabsTrigger>
            <TabsTrigger value="companies" data-testid="admin-tab-companies" className="rounded-none data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-3 font-bold">Companies</TabsTrigger>
            <TabsTrigger value="products" data-testid="admin-tab-products" className="rounded-none data-[state=active]:bg-slate-900 data-[state=active]:text-white px-6 py-3 font-bold">Products</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <div className="bg-white border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-widest text-slate-500 bg-slate-50">
                  <th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4"></th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-slate-200">
                      <td className="p-4 font-semibold">{u.name}</td>
                      <td className="p-4">{u.email}</td>
                      <td className="p-4"><span className="text-xs uppercase tracking-widest font-bold">{u.role}</span></td>
                      <td className="p-4">{u.role !== "admin" && <button onClick={() => delUser(u.id)} data-testid={`del-user-${u.id}`} className="text-red-600 font-bold text-xs">Delete</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="companies" className="mt-6">
            <div className="bg-white border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-widest text-slate-500 bg-slate-50">
                  <th className="p-4">Name</th><th className="p-4">Industry</th><th className="p-4">Country</th><th className="p-4">Verified</th><th className="p-4"></th>
                </tr></thead>
                <tbody>
                  {companies.map(c => (
                    <tr key={c.id} className="border-t border-slate-200">
                      <td className="p-4 font-semibold">{c.name}</td>
                      <td className="p-4">{c.industry || "—"}</td>
                      <td className="p-4">{c.country || "—"}</td>
                      <td className="p-4">{c.verified ? <span className="text-emerald-600 font-bold">✓ Yes</span> : "No"}</td>
                      <td className="p-4">{!c.verified && <button onClick={() => verifyCompany(c.id)} data-testid={`verify-company-${c.id}`} className="text-[#0047FF] font-bold text-xs">Verify</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <div className="bg-white border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-widest text-slate-500 bg-slate-50">
                  <th className="p-4">Title</th><th className="p-4">Category</th><th className="p-4">Price</th><th className="p-4">Status</th>
                </tr></thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="border-t border-slate-200">
                      <td className="p-4 font-semibold">{p.title}</td>
                      <td className="p-4">{p.category}</td>
                      <td className="p-4">${p.price?.toFixed?.(2)}</td>
                      <td className="p-4 uppercase text-xs tracking-widest">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
