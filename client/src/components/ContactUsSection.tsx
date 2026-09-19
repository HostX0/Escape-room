import { Phone, MapPin, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { publicApiEndpoints } from "../api/endpoints";
import { motion } from "framer-motion";
import { useLocale } from "../context/LocaleContext";

export function ContactUsSection() {
  const { t, dir } = useLocale();
  const { data } = useQuery({
    queryKey: ["public-contact-info"],
    queryFn: publicApiEndpoints.contactInfo,
  });

  const phone = data?.phone || "+964 XXX XXX XXXX";
  const address = data?.address || "بغداد، العراق";
  const email = data?.email || "info@escaperoomiraq.com";

  const items = [
    { icon: Phone, label: t("contact.phone"), value: phone, color: "rose" as const },
    { icon: MapPin, label: t("contact.address"), value: address, color: "blue" as const },
    { icon: Mail, label: t("contact.email"), value: email, color: "amber" as const },
  ];

  return (
    <section
      className="relative"
      aria-labelledby="contact-us-heading"
      dir={dir}
    >
      <div className="glass-card p-6 sm:p-8 relative overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-rose-500/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/[0.04] blur-3xl" />

        {/* Red accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />

        <div className="text-center mb-8 relative z-10">
          <span className="section-label mb-2 block">
            {t("contact.title")}
          </span>
          <h2
            id="contact-us-heading"
            className="section-title"
          >
            {t("contact.desc")}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 relative z-10">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`rounded-2xl border px-4 py-4 flex items-start gap-3 group transition-all duration-300 backdrop-blur-sm hover:-translate-y-1
                ${item.color === "rose"
                  ? "border-rose-500/10 bg-rose-500/[0.04] hover:border-rose-500/20 hover:bg-rose-500/[0.06] hover:shadow-[0_0_20px_rgba(225,29,72,0.05)]"
                  : item.color === "blue"
                  ? "border-blue-500/10 bg-blue-500/[0.03] hover:border-blue-500/20 hover:bg-blue-500/[0.05] hover:shadow-[0_0_20px_rgba(59,130,246,0.05)]"
                  : "border-amber-500/10 bg-amber-500/[0.03] hover:border-amber-500/20 hover:bg-amber-500/[0.05] hover:shadow-[0_0_20px_rgba(245,158,11,0.05)]"
                }`}
            >
              <div className={`rounded-xl p-2 flex-shrink-0 border transition-all duration-300 group-hover:scale-110
                ${item.color === "rose"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400 group-hover:text-rose-300"
                  : item.color === "blue"
                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:text-blue-300"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:text-amber-300"
                }`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="text-sm font-medium text-slate-200 break-all">
                  {item.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
