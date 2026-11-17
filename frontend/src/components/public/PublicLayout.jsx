import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../layout/Navbar";
import Footer from "./Footer";
import CopilotClienteWidget from "./copilot/CopilotClienteWidget";

// Marco de todo el sitio público: Navbar + página + Footer
export default function PublicLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-brand-background text-brand-foreground">
      <Navbar />
      <main className="flex-1 pb-20 xl:pb-0">
        <Outlet />
        <CopilotClienteWidget />
      </main>
      <Footer />
    </div>
  );
}