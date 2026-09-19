import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Users,
  Star,
  Ghost,
  ArrowLeft,
  Clock3,
  Sparkles,
  Shield,
  Timer,
  Lock,
  Flame,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "../context/LocaleContext";
import { Button } from "../components/ui/Button";
import { publicApiEndpoints } from "../api/endpoints";
import { getThemeImageFullUrl } from "../lib/themeImage";

const posterFadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: "easeOut" as const },
  }),
};

/* ── Skeleton card while loading ── */
function ThemeSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0f]/50 overflow-hidden">
      <div className="aspect-[4/5] sm:aspect-[3/4] w-full bg-white/[0.04] animate-pulse" />
      <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-3">
        <div className="flex gap-3">
          <div className="h-4 w-16 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-12 rounded bg-white/[0.06] animate-pulse" />
        </div>
        <div className="h-10 rounded-xl bg-white/[0.06] animate-pulse" />
      </div>
    </div>
  );
}

export function ThemesPage() {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Back */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-8 group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        {t("summary.backHome")}
      </Link>

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="section-label mb-2 block"
        >
          {t("home.tonightSessions")}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
        >
          <span className="bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent">
            {t("home.chooseStory")}
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto mt-3"
        >
          {t("home.chooseStoryDesc")}
        </motion.p>
      </div>

      {/* Trust badges row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex flex-wrap items-center justify-center gap-3 mb-10"
      >
        {[
          { icon: Shield, label: t("urgency.freeCancellation"), color: "emerald" },
          { icon: Timer, label: t("urgency.instantConfirm"), color: "rose" },
          { icon: Sparkles, label: t("urgency.payAtVenue"), color: "amber" },
        ].map((b, i) => (
          <span key={i} className={`flex items-center gap-1.5 text-[11px] font-medium rounded-full border px-3 py-1.5 backdrop-blur-sm transition-all duration-300 hover:scale-105
            ${b.color === "emerald" ? "text-emerald-300/80 bg-emerald-500/[0.05] border-emerald-500/15"
              : b.color === "rose" ? "text-rose-300/80 bg-rose-500/[0.05] border-rose-500/15"
              : "text-amber-300/80 bg-amber-500/[0.05] border-amber-500/15"
            }`}>
            <b.icon className="w-3 h-3" />
            {b.label}
          </span>
        ))}
      </motion.div>

      {/* Skeleton loading */}
      {isLoading && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <ThemeSkeleton />
          <ThemeSkeleton />
          <ThemeSkeleton />
        </div>
      )}

      {/* Empty */}
      {!isLoading && themes.length === 0 && (
        <div className="text-center py-24">
          <Ghost className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">{t("home.themesEmpty")}</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && themes.length > 0 && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme, i) => {
            const r = ratingsMap.get(theme.id);
            const imageUrl = getThemeImageFullUrl(theme.image_url);
            const isFeatured = i === 0;
            const slotsToday = Number(theme.slots_available_today) || 0;

            return (
              <motion.div
                key={theme.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={posterFadeUp}
                className={isFeatured && themes.length > 2 ? "sm:col-span-2 lg:col-span-1" : ""}
              >
                <Link to={`/themes/${theme.id}`} className="block h-full">
                  <div className="group h-full rounded-2xl border border-white/[0.06] bg-[#0a0a0f]/50 overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2 hover:border-rose-500/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_40px_rgba(225,29,72,0.08)]">
                    {/* Poster */}
                    <div className="relative aspect-[4/5] sm:aspect-[3/4] w-full overflow-hidden">
                      {imageUrl ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={theme.name}
                            loading={i < 3 ? "eager" : "lazy"}
                            className="absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/35 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800/60 to-[#0a0a0f]">
                          <Lock className="w-14 h-14 text-slate-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/25 to-transparent" />
                        </div>
                      )}

                      {/* Red accent line at top */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Featured badge */}
                      {isFeatured && (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 backdrop-blur-sm">
                          <Sparkles className="w-3 h-3 text-rose-400" />
                          <span className="text-[10px] font-bold text-rose-200 tracking-wide uppercase">{t("hero.nowShowing")}</span>
                        </div>
                      )}

                      {/* Slots available today badge */}
                      {slotsToday > 0 && slotsToday <= 3 && (
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm urgency-pulse">
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] font-bold text-amber-200 tracking-wide">
                            {slotsToday === 1 ? (t("urgency.lastSlot") || "Last slot today!") : `${slotsToday} ${t("urgency.slotsLeft") || "slots left today"}`}
                          </span>
                        </div>
                      )}

                      {/* Rating */}
                      {r && r.total_ratings > 0 && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm border border-white/[0.06] text-xs font-semibold text-amber-400">
                          <Star className="w-3 h-3 fill-amber-500" />
                          {Number(r.avg_rating).toFixed(1)}
                        </div>
                      )}

                      {/* Title overlay */}
                      <div className="absolute bottom-0 inset-x-0 p-5">
                        <h2 className="text-xl font-bold text-white leading-tight drop-shadow-lg group-hover:text-rose-50 transition-colors">
                          {theme.name}
                        </h2>
                        {theme.description && (
                          <p className="mt-1.5 text-xs text-slate-300/70 line-clamp-2 leading-relaxed">
                            {theme.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Meta + CTA */}
                    <div className="px-4 sm:px-5 py-3 sm:py-4 flex flex-col gap-2.5 sm:gap-3 mt-auto">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="w-3.5 h-3.5 text-slate-500" />
                            60 min
                          </span>
                          <span className="w-px h-3 bg-slate-700/60" />
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            2-6
                          </span>
                          {r && r.total_ratings > 0 && (
                            <>
                              <span className="w-px h-3 bg-slate-700/60" />
                              <span className="inline-flex items-center gap-1 text-amber-400/80">
                                <Star className="w-3.5 h-3.5 fill-amber-500" />
                                {Number(r.avg_rating).toFixed(1)}
                              </span>
                            </>
                          )}
                        </div>
                        {/* Slots today indicator */}
                        {slotsToday > 0 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${slotsToday <= 2 ? "bg-rose-500/15 text-rose-300 border border-rose-500/20" : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"}`}>
                            {slotsToday} {t("urgency.today") || "today"}
                          </span>
                        )}
                      </div>
                      <Button className="w-full gap-2 group/btn" variant="primary">
                        <span>{t("hero.bookNow")}</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
