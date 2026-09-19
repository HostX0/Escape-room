import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "../context/LocaleContext";
import { publicApiEndpoints } from "../api/endpoints";
import { Phone, MapPin, Mail, Clock, ArrowRight, Sparkles } from "lucide-react";
import logo from "../assets/logo.webp";

export function Footer() {
  const { t } = useLocale();
  const { data } = useQuery({
    queryKey: ["public-contact-info"],
    queryFn: publicApiEndpoints.contactInfo,
  });

  const phone = data?.phone || "+964 XXX XXX XXXX";
  const address = data?.address || "بغداد، العراق";
  const email = data?.email || "info@escaperoomiraq.com";

  return (
    <footer className="relative mt-8 pb-16 md:pb-0" style={{ background: "rgba(6,6,10,0.97)" }}>
      {/* Top gradient line — brand red */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />

      {/* CTA banner above footer */}
      <div className="border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-12 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {t("hero.canYouEscape")}
            </h3>
            <p className="text-sm text-slate-400 mt-1.5">{t("home.chooseStoryDesc")}</p>
          </div>
          <Link
            to="/themes"
            className="btn-shimmer shrink-0 inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 px-7 py-3.5 text-sm font-bold text-white shadow-[0_6px_24px_rgba(225,29,72,0.35)] hover:shadow-[0_10px_36px_rgba(225,29,72,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-rose-400/30"
          >
            <Sparkles className="w-4 h-4" />
            {t("hero.bookNow")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-8 sm:mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Logo" className="h-10 w-auto object-contain drop-shadow-[0_2px_12px_rgba(225,29,72,0.2)]" />
              <div className="flex flex-col leading-none">
                <span className="text-sm font-bold text-white tracking-tight">Switch Escape Room</span>
                <span className="text-[10px] font-semibold text-rose-400/80 tracking-widest uppercase">Iraq</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              {t("home.heroDesc")}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 mb-5">{t("footer.quickLinks")}</p>
            <nav className="flex flex-col gap-2.5">
              {[
                { to: "/", label: t("summary.backHome") },
                { to: "/themes", label: t("home.chooseStory") },
                { to: "/login", label: t("nav.login") },
                { to: "/register", label: t("nav.signUp") },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm text-slate-500 hover:text-rose-300 transition-colors duration-200 flex items-center gap-2.5 group"
                >
                  <span className="h-1 w-1 rounded-full bg-slate-700 group-hover:bg-rose-500 transition-colors" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 mb-5">{t("contact.title")}</p>
            <div className="flex flex-col gap-3">
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-rose-300 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-rose-500/[0.08] border border-rose-500/15 flex items-center justify-center group-hover:bg-rose-500/15 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-rose-400/70" />
                </div>
                {phone}
              </a>
              <div className="flex items-center gap-2.5 text-sm text-slate-400">
                <div className="w-8 h-8 rounded-lg bg-blue-500/[0.08] border border-blue-500/15 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-blue-500/70" />
                </div>
                {address}
              </div>
              <a href={`mailto:${email}`} className="flex items-center gap-2.5 text-sm text-slate-400 hover:text-rose-300 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-amber-500/[0.08] border border-amber-500/15 flex items-center justify-center group-hover:bg-amber-500/15 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-amber-500/70" />
                </div>
                {email}
              </a>
            </div>
          </div>

          {/* Hours */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 mb-5">{t("footer.hours")}</p>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-emerald-500/70" />
                </div>
                <span className="text-sm font-medium text-slate-200">{t("footer.hoursValue")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{t("footer.paymentMethods") || "Payment Methods"}:</span>
          {[
            { label: "Cash", icon: "💵" },
            { label: "Qi Card", icon: "💳" },
            { label: "ZainCash", icon: "📱" },
            { label: "FIB", icon: "🏦" },
          ].map((m) => (
            <span key={m.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-2.5 py-1">
              <span>{m.icon}</span> {m.label}
            </span>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>{t("footer.builtIn")}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          </div>
        </div>
      </div>
    </footer>
  );
}
