import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield } from "lucide-react";
import { useLocale } from "../context/LocaleContext";

export function CancellationPolicyBadge() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/80 bg-emerald-500/[0.05] border border-emerald-500/15 rounded-full px-3 py-1.5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-emerald-500/30 cursor-pointer"
      >
        <Shield className="w-3 h-3" />
        {t("urgency.freeCancellation")}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
            >
              <div className="glass-card p-6 relative">
                {/* Close */}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>

                <h3 className="text-lg font-bold text-white mb-3">
                  {t("policy.title") || "Cancellation Policy"}
                </h3>

                <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>{t("policy.free24h") || "Free cancellation up to 24 hours before your session"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>{t("policy.reschedule") || "Free rescheduling up to 12 hours before"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">!</span>
                    <span>{t("policy.late") || "Cancellations within 24 hours may be subject to a fee"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-400 mt-0.5">✗</span>
                    <span>{t("policy.noshow") || "No-shows are non-refundable"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-5 w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-medium text-slate-200 hover:bg-white/[0.1] transition-colors"
                >
                  {t("common.close") || "Close"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
