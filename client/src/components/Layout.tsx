import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { User, LogOut, CalendarCheck, Menu, X, Ticket } from "lucide-react";
import { Button } from "./ui/Button";
import { Footer } from "./Footer";
import { cn } from "../lib/utils";
import logo from "../assets/logo.webp";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollToTop } from "./ScrollToTop";

const navLinks = [
  { to: "/", labelKey: "summary.backHome", exact: true },
  { to: "/themes", labelKey: "nav.themesBooking", exact: false },
];

export function Layout() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const { locale, setLocale, dir, t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const isHomePage = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      {/* ── Navbar ── */}
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500",
          scrolled
            ? "border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
            : "border-b border-transparent"
        )}
        style={{
          background: scrolled
            ? "rgba(10,10,15,0.92)"
            : isHomePage
            ? "rgba(10,10,15,0.3)"
            : "rgba(10,10,15,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 h-14 sm:h-16 md:h-[68px] flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo + Brand */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative h-9 sm:h-10 md:h-11 w-auto rounded-xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.04] duration-300">
              <img
                src={logo}
                alt="Switch Escape Room"
                className="h-full w-auto object-contain drop-shadow-[0_2px_12px_rgba(225,29,72,0.25)]"
              />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-bold text-white tracking-tight">Switch Escape Room</span>
              <span className="text-[10px] font-semibold text-rose-400/80 tracking-widest uppercase">Iraq</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ to, labelKey, exact }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-300",
                  isActive(to, exact)
                    ? "text-white bg-white/[0.06]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                {t(labelKey)}
                {isActive(to, exact) && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute -bottom-px left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500/60"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-2.5">
            {/* Language toggle */}
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "ar" : "en")}
              className="text-[11px] font-bold text-slate-300 hover:text-rose-300 border border-white/[0.1] bg-white/[0.03] rounded-full px-3.5 py-1.5 transition-all duration-300 hover:border-rose-500/30 hover:bg-rose-500/[0.06] tracking-wide"
              title={locale === "en" ? "العربية" : "English"}
            >
              {locale === "en" ? "عربي" : "EN"}
            </button>

            {isAuthenticated && user ? (
              <>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-200 border border-white/[0.06] hover:border-rose-500/20 hover:bg-rose-500/[0.04] transition-colors"
                >
                  <Ticket className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">{t("nav.myBookings")}</span>
                </Link>
                <Link
                  to="/profile"
                  className="hidden lg:inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-rose-400" />
                  <span className="max-w-[100px] truncate">{user.full_name}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">{t("nav.login")}</Button>
                </Link>
                <Link to="/themes" className="hidden sm:block">
                  <Button size="sm" variant="primary">{t("hero.bookNow")}</Button>
                </Link>
                <Link to="/register" className="sm:hidden">
                  <Button size="sm">{t("nav.signUp")}</Button>
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Red accent line under nav on scroll */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-rose-500/30 to-transparent transition-opacity duration-500",
          scrolled ? "opacity-100" : "opacity-0"
        )} />
      </header>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: dir === "rtl" ? "100%" : "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir === "rtl" ? "100%" : "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "md:hidden fixed top-0 bottom-0 z-50 w-[280px] overflow-y-auto",
                dir === "rtl" ? "right-0" : "left-0"
              )}
              style={{ background: "rgba(10,10,15,0.98)", backdropFilter: "blur(24px)" }}
            >
              <div className="px-5 pt-6 pb-8 flex flex-col gap-1.5 h-full">
                {/* Close button */}
                <div className="flex items-center justify-between mb-6">
                  <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {navLinks.map(({ to, labelKey, exact }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors",
                      isActive(to, exact)
                        ? "bg-rose-500/[0.08] text-rose-200 border border-rose-500/15"
                        : "text-slate-300 hover:bg-white/[0.04]"
                    )}
                  >
                    {t(labelKey)}
                  </Link>
                ))}

                <div className="h-px bg-white/[0.06] my-3" />

                {isAuthenticated && user ? (
                  <>
                    <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] text-slate-300 hover:bg-white/[0.04]">
                      <CalendarCheck className="w-5 h-5 text-rose-400" /> {t("nav.myBookings")}
                    </Link>
                    <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] text-slate-300 hover:bg-white/[0.04]">
                      <User className="w-5 h-5 text-rose-400" /> {user.full_name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] text-red-400 hover:bg-white/[0.04]"
                    >
                      <LogOut className="w-5 h-5" /> {t("nav.logout")}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] text-slate-300 hover:bg-white/[0.04]">
                      {t("nav.login")}
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] text-slate-300 hover:bg-white/[0.04]">
                      {t("nav.signUp")}
                    </Link>
                  </>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Mobile Book Now CTA at bottom */}
                <Link to="/themes" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="lg" className="w-full">{t("hero.bookNow")}</Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex-1 pt-14 sm:pt-16 md:pt-[68px] relative z-10">
        <div className="py-5 sm:py-8 md:py-12">
          <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
