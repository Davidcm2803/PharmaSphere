import { useState } from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { AuthModal } from "../layout/AuthModal";

export const AuthButtons = ({ isCollapsed }) => {
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (user) {
    return (
      <div
        className={cn(
          "border-t border-brand-border p-3 flex items-center gap-2",
          isCollapsed && "justify-center",
        )}
      >
        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-brand-primary/20 flex items-center justify-center">
          <User className="w-4 h-4 text-brand-primary" />
        </div>

        {!isCollapsed && (
          <>
            <span className="text-sm text-brand-foreground truncate flex-1 min-w-0">
              {user.nombre}
            </span>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-brand-muted-foreground hover:text-brand-foreground hover:bg-brand-background transition-colors flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "border-t border-brand-border p-3",
          isCollapsed && "flex justify-center",
        )}
      >
        <button
          onClick={() => setShowModal(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full",
            "text-brand-muted-foreground hover:text-brand-foreground hover:bg-brand-background transition-colors",
            isCollapsed && "justify-center",
          )}
        >
          <LogIn className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Iniciar sesión</span>}
        </button>
      </div>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
};