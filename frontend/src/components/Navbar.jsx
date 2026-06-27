import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  if (loc.pathname === "/login" || loc.pathname === "/register") return null;

  const dashHref = user && user.role === "buyer" ? "/buyer"
    : user && user.role === "supplier" ? "/supplier"
    : user && user.role === "admin" ? "/admin" : "/";

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50" data-testid="main-navbar">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="font-display font-black text-2xl tracking-tighter" data-testid="logo-link">
          B2B<span className="text-[#0047FF]">/</span>HUB
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/browse" data-testid="nav-browse" className="hover:text-[#0047FF] transition">Browse Products</Link>
          <Link to="/browse?type=companies" data-testid="nav-companies" className="hover:text-[#0047FF] transition">Suppliers</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-trigger" className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:border-slate-900 transition">
                  <Avatar className="h-7 w-7 rounded-none">
                    <AvatarFallback className="rounded-none bg-slate-900 text-white text-xs">
                      {user.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold hidden sm:inline">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-none border-slate-300 w-48" align="end">
                <DropdownMenuLabel className="text-xs uppercase tracking-widest text-slate-500">
                  {user.role}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menu-dashboard" onClick={() => nav(dashHref)} className="rounded-none">
                  Dashboard
                </DropdownMenuItem>
                {user.role !== "admin" && (
                  <DropdownMenuItem data-testid="menu-chat" onClick={() => nav("/chat")} className="rounded-none">
                    Messages
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="menu-logout" onClick={async () => { await logout(); nav("/"); }} className="rounded-none text-red-600">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login" className="text-sm font-semibold hover:text-[#0047FF]">Sign in</Link>
              <Link to="/register" data-testid="nav-register" className="btn-primary text-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
