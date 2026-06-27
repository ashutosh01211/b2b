import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatApiErrorDetail } from "@/lib/api";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState("buyer");
  const [form, setForm] = useState({ name: "", email: "", password: "", company_name: "" });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await register({ ...form, role });
      toast.success("Account created");
      nav(u.role === "buyer" ? "/buyer" : "/supplier");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Registration failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="register-page">
      <div className="hidden lg:flex bg-slate-900 text-white p-12 flex-col justify-between border-r border-slate-200">
        <Link to="/" className="font-display font-black text-2xl tracking-tighter">
          B2B<span className="text-[#0047FF]">/</span>HUB
        </Link>
        <div>
          <div className="label-eyebrow text-slate-400 mb-4">Get started</div>
          <h1 className="font-display font-black text-5xl tracking-tighter leading-tight">
            Join the<br />network.
          </h1>
          <ul className="mt-8 space-y-3 text-slate-300 text-sm">
            <li className="flex gap-3"><span className="text-[#0047FF]">→</span> Verified supplier directory</li>
            <li className="flex gap-3"><span className="text-[#0047FF]">→</span> Real-time chat & quotes</li>
            <li className="flex gap-3"><span className="text-[#0047FF]">→</span> Free forever for buyers</li>
          </ul>
        </div>
        <div className="text-xs font-mono tracking-widest text-slate-500">© 2026 B2B/HUB</div>
      </div>
      <div className="flex items-center justify-center p-8 lg:p-16">
        <form onSubmit={submit} className="w-full max-w-md space-y-5" data-testid="register-form">
          <div>
            <div className="label-eyebrow mb-3">Create account</div>
            <h2 className="font-display font-bold text-4xl tracking-tight">Start trading</h2>
          </div>

          <div className="grid grid-cols-2 border border-slate-200">
            <button type="button" data-testid="role-buyer"
              onClick={() => setRole("buyer")}
              className={`p-4 font-bold text-sm transition border-r border-slate-200 ${role === "buyer" ? "bg-slate-900 text-white" : "bg-white"}`}>
              I&apos;M A BUYER
            </button>
            <button type="button" data-testid="role-supplier"
              onClick={() => setRole("supplier")}
              className={`p-4 font-bold text-sm transition ${role === "supplier" ? "bg-slate-900 text-white" : "bg-white"}`}>
              I&apos;M A SUPPLIER
            </button>
          </div>

          <div>
            <label className="label-eyebrow block mb-2">Full Name</label>
            <input data-testid="register-name" required className="input-flat" value={form.name} onChange={set("name")} />
          </div>
          {role === "supplier" && (
            <div>
              <label className="label-eyebrow block mb-2">Company Name</label>
              <input data-testid="register-company" required className="input-flat" value={form.company_name} onChange={set("company_name")} />
            </div>
          )}
          <div>
            <label className="label-eyebrow block mb-2">Email</label>
            <input data-testid="register-email" type="email" required className="input-flat" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label-eyebrow block mb-2">Password</label>
            <input data-testid="register-password" type="password" required minLength={6} className="input-flat" value={form.password} onChange={set("password")} />
          </div>
          <button data-testid="register-submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Creating…" : "Create account →"}
          </button>
          <div className="text-sm text-slate-600 text-center">
            Already have an account? <Link to="/login" className="text-[#0047FF] font-semibold">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
