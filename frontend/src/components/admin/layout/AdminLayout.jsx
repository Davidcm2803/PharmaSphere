import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [openAt, setOpenAt] = useState(null);
  const open = openAt === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-foreground">
      <Sidebar open={open} onClose={() => setOpenAt(null)} />
      <div className="min-w-0 lg:ml-[280px]">
        <Topbar onMenu={() => setOpenAt(pathname)} onLogout={handleLogout} />
        <main className="px-5 pb-28 pt-9 sm:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}