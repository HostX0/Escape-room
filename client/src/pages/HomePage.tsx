import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Users,
  CalendarCheck,
  Sparkles,
  MapPin,
  Timer,
  Shield,
  Star,
  Ghost,
  Clock,
  Play,
  Zap,
  Trophy,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import { useLocale } from "../context/LocaleContext";
import { Button } from "../components/ui/Button";
import { publicApiEndpoints } from "../api/endpoints";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { getThemeImageFullUrl } from "../lib/themeImage";
import { ContactUsSection } from "../components/ContactUsSection";
import { ReviewsSection } from "../components/ReviewsSection";
import { FAQSection } from "../components/FAQSection";
import { StickyBookCTA } from "../components/StickyBookCTA";
import logo from "../assets/logo.webp";

/* ── Framer variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" as const },
  }),
};

/* ── Animated counter hook ── */
function useCountUp(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(!startOnView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return { count, ref };
}

export function HomePage() {
  const { t } = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ["public-themes"],
    queryFn: publicApiEndpoints.themes,
  });

  const themes = data?.themes ?? [];

  const { data: ratingsData } = useQuery({
    queryKey: ["public-themes-ratings"],
    queryFn: publicApiEndpoints.themesRatingsSummary,
  });
  const ratingsMap = new Map(
    (ratingsData?.ratings || []).map((r) => [r.theme_id, r])
  );

  const heroImage =
    themes.length > 0 ? getThemeImageFullUrl(themes[0].image_url) : null;

  // Parallax ref for hero
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* ══════════════════════════════════════════════
          HERO — Full Viewport Cinematic Banner
         ══════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative -mx-3 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-8 md:-mt-12 flex flex-col min-h-[85vh] sm:min-h-[92vh] md:min-h-[95vh] overflow-hidden"
      >
        {/* Background with parallax */}
        <motion.div style={{ y: heroY }} className="absolute inset-0 z-0">
          {heroImage ? (
            <>
              <img
                src={heroImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-110"
              />
              <div className="absolute inset-0 bg-[#0a0a0f]/85" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-[#0a0a0f]/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/70 via-transparent to-[#0a0a0f]/70" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]" />
          )}
        </motion.div>

        {/* Geometric decoration — triangles inspired by logo */}
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
          {/* Large triangle left */}
          <div className="absolute -left-10 top-1/4 w-0 h-0 border-l-[0px] border-r-[120px] border-b-[200px] border-l-transparent border-r-transparent border-b-rose-600/[0.06]" />
          {/* Large triangle right */}
          <div className="absolute -right-10 top-1/3 w-0 h-0 border-l-[100px] border-r-[0px] border-t-[180px] border-l-transparent border-r-transparent border-t-rose-600/[0.05]" />
          {/* Diagonal line */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-[15%] left-[10%] w-[200px] h-[1px] bg-gradient-to-r from-rose-500/20 to-transparent rotate-[30deg]" />
            <div className="absolute top-[25%] right-[15%] w-[150px] h-[1px] bg-gradient-to-l from-rose-500/15 to-transparent -rotate-[20deg]" />
          </div>
        </div>

        {/* Animated glow orbs */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-rose-600/[0.08] blur-[120px] animate-glow-pulse" />
        <div className="pointer-events-none absolute top-1/2 -right-40 h-80 w-80 rounded-full bg-rose-500/[0.05] blur-[100px] animate-glow-pulse" style={{ animationDelay: "2s" }} />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-amber-500/[0.04] blur-[80px]" />

        {/* Content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col items-center text-center flex-1 justify-center py-20"
        >
          {/* Logo mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6"
          >
            <img
              src={logo}
              alt="Switch Escape Room"
              className="h-16 sm:h-20 md:h-28 w-auto object-contain drop-shadow-[0_4px_24px_rgba(225,29,72,0.3)]"
            />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/[0.08] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300/90 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
              </span>
              {t("home.badge")}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-5 sm:mt-7 text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[0.9]"
          >
            <span className="block bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent drop-shadow-[0_2px_30px_rgba(225,29,72,0.15)]">
              {t("hero.canYouEscape")}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-5 text-sm sm:text-base md:text-lg text-slate-400 max-w-xl leading-relaxed"
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/themes">
              <button className="btn-shimmer btn-brand sm:px-10 sm:py-4 sm:text-base">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                {t("hero.bookNow")}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </Link>
            <a
              href="#now-showing"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors group"
            >
              <div className="w-10 h-10 rounded-full border border-white/[0.1] bg-white/[0.04] flex items-center justify-center hover:border-rose-500/25 hover:bg-rose-500/[0.06] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(225,29,72,0.15)]">
                <Play className="w-3.5 h-3.5 fill-current" />
              </div>
              {t("hero.watchTrailer")}
            </a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.75 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
          >
            {[
              { icon: Shield, label: t("urgency.freeCancellation"), color: "emerald" as const },
              { icon: Timer, label: t("home.stat60min"), color: "rose" as const },
              { icon: Users, label: t("home.statPlayers"), color: "blue" as const },
              { icon: MapPin, label: t("home.statBaghdad"), color: "amber" as const },
            ].map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.08 }}
                className={`flex items-center gap-2 text-[11px] sm:text-xs font-medium rounded-full border px-3 py-1.5 backdrop-blur-sm transition-all duration-300 hover:scale-105
                  ${badge.color === "emerald"
                    ? "bg-emerald-500/[0.06] border-emerald-500/15 text-emerald-300/90 hover:border-emerald-500/30"
                    : badge.color === "rose"
                    ? "bg-rose-500/[0.06] border-rose-500/15 text-rose-300/90 hover:border-rose-500/30"
                    : badge.color === "blue"
                    ? "bg-blue-500/[0.06] border-blue-500/15 text-blue-300/90 hover:border-blue-500/30"
                    : "bg-amber-500/[0.06] border-amber-500/15 text-amber-300/90 hover:border-amber-500/30"
                  }`}
              >
                <badge.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{badge.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{t("home.tonightSessions")}</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border border-white/[0.15] flex justify-center pt-1.5"
          >
            <div className="w-1 h-2 rounded-full bg-rose-500/60" />
          </motion.div>
        </motion.div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0f] to-transparent z-[2]" />
      </section>

      {/* Spacer */}
      <div className="h-12 sm:h-16" />

      {/* ══════════════════════════════════════════════
          STATS — Animated Counters
         ══════════════════════════════════════════════ */}
      <StatsSection t={t} />

      {/* Spacer */}
      <div className="h-16 sm:h-20" />

      {/* ══════════════════════════════════════════════
          NOW SHOWING — Cinema Theme Cards
         ══════════════════════════════════════════════ */}
      <section id="now-showing" className="relative scroll-mt-24">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 mb-3"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-70 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <span className="section-label">
                {t("home.tonightSessions")}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="section-title"
            >
              {t("home.chooseStory")}
            </motion.h2>
            <p className="text-sm text-slate-500 mt-2 max-w-md">
              {t("home.chooseStoryDesc")}
            </p>
          </div>
          <Link
            to="/themes"
            className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-all shrink-0 border border-rose-500/20 rounded-full px-4 py-2 hover:bg-rose-500/[0.06] hover:border-rose-500/30"
          >
            {t("common.viewAll")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading && (
          <div className="py-20">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && themes.length === 0 && (
          <div className="py-20 text-center">
            <Ghost className="w-14 h-14 text-slate-700 mx-auto mb-4" />
            <p className="text-sm text-slate-500">{t("home.themesEmpty")}</p>
          </div>
        )}

        {/* Theme cards — Featured + Grid layout */}
        {themes.length > 0 && (
          <div className="grid gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Featured first theme — large card */}
            {(() => {
              const theme = themes[0];
              const rating = ratingsMap.get(theme.id);
              const imageUrl = getThemeImageFullUrl(theme.image_url);
              return (
                <motion.div
                  custom={0}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={fadeUp}
                  className={themes.length === 1 ? "lg:col-span-2" : "lg:row-span-2"}
                >
                  <Link
                    to={`/themes/${theme.id}`}
                    className="group block relative h-full rounded-2xl overflow-hidden border border-white/[0.06] hover:border-rose-500/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_50px_rgba(225,29,72,0.1)]"
                  >
                    <div className="relative h-full min-h-[320px] sm:min-h-[500px] lg:min-h-full bg-[#0a0a0f]">
                      {imageUrl ? (
                        <img src={imageUrl} alt={theme.name} loading="eager" className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-110" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800/60 to-slate-900"><Ghost className="w-16 h-16 text-slate-700/50" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent opacity-90" />

                      {/* Red accent line at top */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-rose-500/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Popular badge */}
                      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 text-rose-400" />
                        <span className="text-[11px] font-bold text-rose-200 tracking-wide uppercase">{t("hero.nowShowing")}</span>
                      </div>

                      {rating && rating.total_ratings > 0 && (
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/[0.08]">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span className="text-sm font-bold text-amber-400">{Number(rating.avg_rating).toFixed(1)}</span>
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 z-10">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/[0.1] border border-white/[0.1] text-slate-200 backdrop-blur-sm">
                            <Clock className="w-3 h-3" /> 60 min
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/[0.1] border border-white/[0.1] text-slate-200 backdrop-blur-sm">
                            <Users className="w-3 h-3" /> 2-6
                          </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight mb-1.5 sm:mb-2 group-hover:text-rose-50 transition-colors">
                          {theme.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300/80 line-clamp-2 sm:line-clamp-3 leading-relaxed mb-3 sm:mb-5 max-w-lg">
                          {theme.description || t("home.defaultThemeDesc")}
                        </p>
                        <span className="btn-shimmer inline-flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-rose-500 border border-rose-400/30 rounded-xl px-4 sm:px-5 py-2 sm:py-2.5 shadow-[0_6px_24px_rgba(225,29,72,0.3)] group-hover:shadow-[0_10px_36px_rgba(225,29,72,0.45)] transition-all">
                          <Sparkles className="w-4 h-4" />
                          {t("hero.bookNow")}
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })()}

            {/* Remaining themes — stacked on the right */}
            {themes.length > 1 && (
              <div className="flex flex-col gap-5 sm:gap-6">
                {themes.slice(1).map((theme, i) => {
                  const rating = ratingsMap.get(theme.id);
                  const imageUrl = getThemeImageFullUrl(theme.image_url);
                  return (
                    <motion.div
                      key={theme.id}
                      custom={i + 1}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: "-40px" }}
                      variants={fadeUp}
                      className="flex-1"
                    >
                      <Link
                        to={`/themes/${theme.id}`}
                        className="group block relative h-full rounded-2xl overflow-hidden border border-white/[0.06] hover:border-rose-500/20 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(225,29,72,0.06)]"
                      >
                        <div className="relative aspect-[16/10] sm:aspect-[2/1] lg:aspect-auto lg:h-full lg:min-h-[220px] bg-[#0a0a0f]">
                          {imageUrl ? (
                            <img src={imageUrl} alt={theme.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800/60 to-slate-900"><Ghost className="w-12 h-12 text-slate-700/50" /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent opacity-90" />

                          {/* Red accent line */}
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                          {rating && rating.total_ratings > 0 && (
                            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm border border-white/[0.06]">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span className="text-xs font-bold text-amber-400">{Number(rating.avg_rating).toFixed(1)}</span>
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.08] text-slate-300 backdrop-blur-sm">
                                <Clock className="w-3 h-3" /> 60 min
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.08] text-slate-300 backdrop-blur-sm">
                                <Users className="w-3 h-3" /> 2-6
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white leading-tight mb-1 group-hover:text-rose-50 transition-colors">
                              {theme.name}
                            </h3>
                            <p className="text-xs text-slate-400/80 line-clamp-2 leading-relaxed mb-3">
                              {theme.description || t("home.defaultThemeDesc")}
                            </p>
                            <span className="inline-flex items-center gap-2 text-xs font-bold text-rose-400 group-hover:text-rose-300 transition-all">
                              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/20 group-hover:bg-rose-500/25 transition-all">
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </span>
                              {t("home.viewTimeSlots")}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {themes.length > 0 && (
          <div className="flex justify-center mt-8 sm:hidden">
            <Link to="/themes">
              <Button variant="secondary" className="gap-2">
                {t("common.viewAll")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Spacer */}
      <div className="h-20 sm:h-24" />

      {/* ══════════════════════════════════════════════
          HOW IT WORKS
         ══════════════════════════════════════════════ */}
      <section className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-px bg-gradient-to-r from-transparent via-rose-500/25 to-transparent" />

        <div className="text-center mb-14 pt-10">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="section-label mb-3 block"
          >
            {t("home.howItWorksTitle")}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-title"
          >
            {t("home.howItWorksDesc")}
          </motion.h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Sparkles, color: "rose" as const, labelKey: "home.step1Title", descKey: "home.step1Desc", step: "1" },
            { icon: CalendarCheck, color: "blue" as const, labelKey: "home.step2Title", descKey: "home.step2Desc", step: "2" },
            { icon: Users, color: "amber" as const, labelKey: "home.step3Title", descKey: "home.step3Desc", step: "3" },
            { icon: Shield, color: "emerald" as const, labelKey: "home.step4Title", descKey: "home.step4Desc", step: "4" },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={scaleIn}
              className={`relative rounded-2xl border p-6 text-center group transition-all duration-500 overflow-hidden backdrop-blur-sm hover:-translate-y-1
                ${item.color === "rose"
                  ? "border-rose-500/10 bg-gradient-to-b from-rose-500/[0.04] to-transparent hover:border-rose-500/25 hover:shadow-[0_0_30px_rgba(225,29,72,0.06)]"
                  : item.color === "amber"
                  ? "border-amber-500/10 bg-gradient-to-b from-amber-500/[0.04] to-transparent hover:border-amber-500/25 hover:shadow-[0_0_30px_rgba(245,158,11,0.06)]"
                  : item.color === "blue"
                  ? "border-blue-500/10 bg-gradient-to-b from-blue-500/[0.04] to-transparent hover:border-blue-500/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.06)]"
                  : "border-emerald-500/10 bg-gradient-to-b from-emerald-500/[0.04] to-transparent hover:border-emerald-500/20 hover:shadow-[0_0_30px_rgba(52,211,153,0.06)]"
                }`}
            >
              {/* Red top accent on hover */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-500 opacity-0 group-hover:opacity-100
                ${item.color === "rose" ? "bg-gradient-to-r from-transparent via-rose-500/60 to-transparent"
                  : item.color === "amber" ? "bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"
                  : item.color === "blue" ? "bg-gradient-to-r from-transparent via-blue-500/60 to-transparent"
                  : "bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent"
                }`} />

              <div
                className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                ${item.color === "rose"
                  ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                  : item.color === "amber"
                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                  : item.color === "blue"
                  ? "bg-blue-500/12 border border-blue-500/25 text-blue-400"
                  : "bg-emerald-500/12 border border-emerald-500/25 text-emerald-400"
                }`}
              >
                {item.step}
              </div>
              <div
                className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4 mt-2 transition-transform duration-500 group-hover:scale-110
                ${item.color === "rose"
                  ? "bg-rose-500/10 border border-rose-500/15 text-rose-400"
                  : item.color === "amber"
                  ? "bg-amber-500/10 border border-amber-500/15 text-amber-400"
                  : item.color === "blue"
                  ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                  : "bg-emerald-500/10 border border-emerald-500/15 text-emerald-400"
                }`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1.5">
                {t(item.labelKey)}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t(item.descKey)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Spacer */}
      <div className="h-20 sm:h-24" />

      {/* Reviews */}
      <ReviewsSection />

      {/* Spacer */}
      <div className="h-16 sm:h-20" />

      {/* FAQ */}
      <FAQSection />

      {/* Spacer */}
      <div className="h-16 sm:h-20" />

      {/* Contact */}
      <ContactUsSection />

      {/* Sticky CTA */}
      <StickyBookCTA />
    </motion.div>
  );
}

/* ── Stats Section Component ── */
function StatsSection({ t }: { t: (k: string) => string }) {
  const stat1 = useCountUp(500, 2000);
  const stat2 = useCountUp(98, 2000);
  const stat3 = useCountUp(60, 1500);
  const stat4 = useCountUp(5, 1200);

  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { ref: stat1.ref, value: `${stat1.count}+`, label: t("home.statGamesPlayed") || "Games Played", icon: Trophy, color: "rose" as const },
          { ref: stat2.ref, value: `${stat2.count}%`, label: t("home.statSatisfaction") || "Satisfaction", icon: Star, color: "amber" as const },
          { ref: stat3.ref, value: `${stat3.count}m`, label: t("home.stat60min") || "60 Min Adventure", icon: Timer, color: "blue" as const },
          { ref: stat4.ref, value: `${stat4.count}★`, label: t("home.statRating") || "Rating", icon: Zap, color: "emerald" as const },
        ].map((stat, i) => (
          <motion.div
            key={i}
            ref={stat.ref}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="stat-card group"
          >
            <div className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-500 group-hover:scale-110
              ${stat.color === "rose" ? "bg-rose-500/10 border border-rose-500/15 text-rose-400"
                : stat.color === "amber" ? "bg-amber-500/10 border border-amber-500/15 text-amber-400"
                : stat.color === "blue" ? "bg-blue-500/10 border border-blue-500/15 text-blue-400"
                : "bg-emerald-500/10 border border-emerald-500/15 text-emerald-400"
              }`}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mb-1 tabular-nums">
              {stat.value}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
