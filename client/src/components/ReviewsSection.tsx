import { Star, Quote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { publicApiEndpoints } from "../api/endpoints";
import { motion } from "framer-motion";
import { useLocale } from "../context/LocaleContext";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= count ? "fill-amber-500 text-amber-500" : "fill-transparent text-slate-700"}`}
        />
      ))}
    </div>
  );
}

export function ReviewsSection() {
  const { t, dir } = useLocale();
  const { data: themesData } = useQuery({
    queryKey: ["public-themes"],
    queryFn: publicApiEndpoints.themes,
  });

  const themes = themesData?.themes ?? [];

  const { data: ratingsData } = useQuery({
    queryKey: ["public-reviews-all"],
    queryFn: async () => {
      if (themes.length === 0) return [];
      const all = await Promise.all(
        themes.map((t) => publicApiEndpoints.themeRatings(t.id).catch(() => null))
      );
      const reviews: Array<{ id: number; full_name: string; theme_name: string; rating: number; comment: string | null; created_at: string }> = [];
      all.forEach((result, i) => {
        if (!result) return;
        result.ratings.forEach((r) => {
          reviews.push({
            id: r.id,
            full_name: r.full_name,
            theme_name: themes[i].name,
            rating: r.rating,
            comment: r.comment ?? null,
            created_at: r.created_at,
          });
        });
      });
      return reviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
    },
    enabled: themes.length > 0,
  });

  const reviews = ratingsData || [];

  if (reviews.length === 0) return null;

  return (
    <section
      className="relative"
      aria-labelledby="reviews-heading"
      dir={dir}
    >
      {/* Decorative line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />

      <div className="text-center mb-10 pt-10">
        <span className="section-label mb-2 block">
          {t("rating.reviews")}
        </span>
        <h2
          id="reviews-heading"
          className="section-title"
        >
          {t("reviews.title")}
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
          {t("reviews.desc")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review, i) => (
          <motion.article
            key={review.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={`relative rounded-2xl border px-5 py-5 flex flex-col justify-between group transition-all duration-500 backdrop-blur-sm hover:-translate-y-1
              ${i % 3 === 0
                ? "border-rose-500/10 bg-gradient-to-b from-rose-500/[0.04] to-white/[0.01] hover:border-rose-500/25 hover:shadow-[0_0_30px_rgba(225,29,72,0.06)]"
                : i % 3 === 1
                ? "border-amber-500/10 bg-gradient-to-b from-amber-500/[0.03] to-white/[0.01] hover:border-amber-500/20 hover:shadow-[0_0_30px_rgba(245,158,11,0.06)]"
                : "border-blue-500/10 bg-gradient-to-b from-blue-500/[0.03] to-white/[0.01] hover:border-blue-500/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.06)]"
              }`}
          >
            {/* Red top accent */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500
              ${i % 3 === 0 ? "bg-gradient-to-r from-transparent via-rose-500/50 to-transparent"
                : i % 3 === 1 ? "bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"
                : "bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
              }`} />

            {/* Quote decoration */}
            <Quote className={`absolute top-3 left-3 w-6 h-6 rotate-180 ${i % 3 === 0 ? "text-rose-500/10" : i % 3 === 1 ? "text-amber-500/10" : "text-blue-500/10"}`} />

            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {review.full_name}
                </p>
                <p className="text-xs text-slate-500">
                  {t("reviews.playedRoom")}:{" "}
                  <span className="text-rose-400/70">{review.theme_name}</span>
                </p>
              </div>
              <Stars count={review.rating} />
            </div>
            {review.comment && (
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                {review.comment}
              </p>
            )}
          </motion.article>
        ))}
      </div>
    </section>
  );
}
