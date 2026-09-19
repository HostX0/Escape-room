import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { useStaff } from "../context/StaffContext";
import { LogOut } from "lucide-react";
import { Button } from "./ui/Button";
import logo from "../assets/logo.webp";

export function StaffLayout() {
  const { isAuthenticated, staff, logout } = useStaff();
  const location = useLocation();

  if (!isAuthenticated && !location.pathname.endsWith("/login")) {
    return <Navigate to="/staff/login" replace />;
  }

  if (location.pathname.endsWith("/login")) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex flex-col" dir="ltr">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-2xl">
        <div className="shell py-3.5 flex items-center justify-between gap-4">
          <Link to="/staff" className="flex items-center gap-3">
            <div className="relative h-10 min-w-[120px] max-w-[160px] rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-[0_10px_30px_rgba(15,23,42,0.9)] flex items-center justify-center">
              <img
                src={logo}
                alt="Escape Room Iraq staff"
                className="h-full w-auto max-h-10 object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide text-slate-100">
                Staff Dashboard
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Escape Room Iraq
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {staff?.full_name} <span className="text-slate-400">({staff?.role})</span>
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 py-8 md:py-10">
        <div className="shell">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
