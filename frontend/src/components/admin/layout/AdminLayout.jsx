import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-brand-background text-brand-foreground">
      <Sidebar />
      <div className="min-w-0 lg:ml-[264px]">
        <Topbar onLogout={handleLogout} />
        <main className="px-5 pb-36 pt-9 sm:px-10 lg:pb-28">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}