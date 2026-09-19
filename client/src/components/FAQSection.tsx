import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useLocale } from "../context/LocaleContext";

const faqKeys = [1, 2, 3, 4, 5, 6] as const;

export function FAQSection() {
  const { t, dir } = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <motion.section
      className="relative"
      aria-labelledby="faq-heading"
      dir={dir}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Decorative line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />

      <div className="text-center pt-10 mb-10">
        <span className="section-label mb-2 block">
          FAQ
        </span>
        <h2
          id="faq-heading"
          className="section-title"
        >
          {t("faq.title")}
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
          {t("faq.desc")}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {faqKeys.map((num, i) => {
          const isOpen = openIndex === i;

          return (
            <motion.div
              key={num}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className={`glass-card rounded-2xl border transition-all duration-300 overflow-hidden
                ${isOpen
                  ? "border-rose-500/20 bg-gradient-to-b from-rose-500/[0.04] to-white/[0.01] shadow-[0_0_25px_rgba(225,29,72,0.05)]"
                  : "border-white/[0.06] hover:border-white/[0.1]"
                }`}
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                aria-expanded={isOpen}
              >
                <span className="text-sm sm:text-base font-medium text-slate-100">
                  {t(`faq.q${num}` as any)}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="flex-shrink-0"
                >
                  <ChevronDown
                    className={`w-4.5 h-4.5 transition-colors duration-300 ${
                      isOpen ? "text-rose-400" : "text-slate-500"
                    }`}
                  />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pt-0">
                      <div className="h-px w-full bg-white/[0.06] mb-3" />
                      <p className="text-sm leading-relaxed text-slate-400">
                        {t(`faq.a${num}` as any)}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
