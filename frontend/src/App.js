import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Browse from "@/pages/Browse";
import ProductDetail from "@/pages/ProductDetail";
import CompanyProfile from "@/pages/CompanyProfile";
import BuyerDashboard from "@/pages/BuyerDashboard";
import SupplierDashboard from "@/pages/SupplierDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import Chat from "@/pages/Chat";
import Navbar from "@/components/Navbar";

const Protected = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center font-body text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/companies/:id" element={<CompanyProfile />} />
        <Route path="/buyer" element={<Protected roles={["buyer"]}><BuyerDashboard /></Protected>} />
        <Route path="/supplier" element={<Protected roles={["supplier"]}><SupplierDashboard /></Protected>} />
        <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
        <Route path="/chat" element={<Protected><Chat /></Protected>} />
        <Route path="/chat/:threadId" element={<Protected><Chat /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
