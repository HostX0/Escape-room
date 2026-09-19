import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLocale } from "../context/LocaleContext";

const shimmerVariants = {
  animate: {
    x: ["-100%", "100%"],
    transition: { duration: 2, repeat: Infinity, ease: "linear" as const },
  },
};

export function StickyBookCTA() {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Mobile: full-width bottom bar */}
          <motion.div
            key="sticky-cta-mobile"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-40 md:hidden"
          >
            <div className="bg-[#0a0a0f]/90 backdrop-blur-lg border-t border-rose-500/20 px-4 py-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
              <Link
                to="/themes"
                className="relative flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-6 py-3.5 text-base font-bold text-white shadow-[0_0_24px_rgba(225,29,72,0.4)] overflow-hidden"
              >
                <motion.span
                  variants={shimmerVariants}
                  animate="animate"
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
                <Sparkles className="h-5 w-5 relative z-10" />
                <span className="relative z-10">{t("hero.bookNow")}</span>
              </Link>
            </div>
          </motion.div>

          {/* Desktop: floating pill in bottom-right */}
          <motion.div
            key="sticky-cta-desktop"
            initial={{ y: 80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-40 hidden md:flex flex-col items-end gap-2"
          >
            {/* CTA button */}
            <Link
              to="/themes"
              className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-600 to-rose-500 px-7 py-3.5 text-base font-bold text-white shadow-[0_0_28px_rgba(225,29,72,0.45)] hover:shadow-[0_0_40px_rgba(225,29,72,0.6)] transition-all duration-300 overflow-hidden"
            >
              <motion.span
                variants={shimmerVariants}
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
              <Sparkles className="h-5 w-5 relative z-10 transition-transform group-hover:rotate-12" />
              <span className="relative z-10">{t("hero.bookNow")}</span>
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
