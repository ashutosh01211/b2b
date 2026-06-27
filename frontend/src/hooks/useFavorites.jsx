import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

let cache = null;
const subs = new Set();

const fetchFavs = async () => {
  try {
    const { data } = await api.get("/favorites/ids");
    cache = new Set(data);
    subs.forEach((fn) => fn(cache));
  } catch {
    cache = new Set();
  }
};

export const useFavorites = () => {
  const { user } = useAuth();
  const [favs, setFavs] = useState(cache || new Set());

  useEffect(() => {
    if (!user || user.role !== "buyer") { setFavs(new Set()); return; }
    if (!cache) fetchFavs();
    const fn = (s) => setFavs(new Set(s));
    subs.add(fn);
    return () => subs.delete(fn);
  }, [user]);

  const toggle = async (productId) => {
    if (!user) { toast.error("Sign in to save products"); return; }
    if (user.role !== "buyer") { toast.error("Only buyers can save"); return; }
    try {
      const { data } = await api.post(`/favorites/${productId}`);
      if (!cache) cache = new Set();
      if (data.favorited) cache.add(productId); else cache.delete(productId);
      subs.forEach((fn) => fn(cache));
      toast.success(data.favorited ? "Saved" : "Removed");
    } catch { toast.error("Failed"); }
  };

  return { favs, toggle, isFav: (id) => favs.has(id) };
};

export const FavoriteButton = ({ productId, className = "" }) => {
  const { user } = useAuth();
  const { isFav, toggle } = useFavorites();
  if (!user || user.role !== "buyer") return null;
  const active = isFav(productId);
  return (
    <button
      data-testid={`fav-btn-${productId}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId); }}
      className={`p-2 border transition ${active ? "bg-[#0047FF] border-[#0047FF] text-white" : "bg-white border-slate-200 text-slate-600 hover:border-slate-900"} ${className}`}
      title={active ? "Saved" : "Save product"}
      aria-label={active ? "Remove from saved" : "Save product"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
};
