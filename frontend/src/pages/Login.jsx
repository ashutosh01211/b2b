import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatApiErrorDetail } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success("Welcome back");
      const dest = loc.state?.from || (u.role === "buyer" ? "/buyer" : u.role === "supplier" ? "/supplier" : "/admin");
      nav(dest);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      <div className="hidden lg:flex bg-slate-900 text-white p-12 flex-col justify-between border-r border-slate-200">
        <Link to="/" className="font-display font-black text-2xl tracking-tighter" data-testid="login-logo">
          B2B<span className="text-[#0047FF]">/</span>HUB
        </Link>
        <div>
          <div className="label-eyebrow text-slate-400 mb-4">Sign in</div>
          <h1 className="font-display font-black text-5xl tracking-tighter leading-tight">
            Source.<br />Sell.<br />Scale.
          </h1>
          <p className="text-slate-400 mt-6 max-w-sm leading-relaxed">
            The infrastructure for global trade. Built for procurement teams and exporters.
          </p>
        </div>
        <div className="text-xs font-mono tracking-widest text-slate-500">© 2026 B2B/HUB</div>
      </div>
      <div className="flex items-center justify-center p-8 lg:p-16">
        <form onSubmit={submit} className="w-full max-w-md space-y-6" data-testid="login-form">
          <div>
            <div className="label-eyebrow mb-3">Welcome back</div>
            <h2 className="font-display font-bold text-4xl tracking-tight">Sign in</h2>
          </div>
          <div>
            <label className="label-eyebrow block mb-2">Email</label>
            <input data-testid="login-email" type="email" required className="input-flat"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label-eyebrow block mb-2">Password</label>
            <input data-testid="login-password" type="password" required className="input-flat"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button data-testid="login-submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Signing in…" : "Sign in →"}
          </button>
          <div className="text-sm text-slate-600 text-center">
            No account? <Link to="/register" className="text-[#0047FF] font-semibold" data-testid="login-to-register">Create one</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
