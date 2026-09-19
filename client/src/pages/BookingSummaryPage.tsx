import { useParams, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  CalendarDays,
  Clock3,
  MapPin,
  ArrowRight,
  Home,
} from "lucide-react";
import { useLocale } from "../context/LocaleContext";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { formatDate, formatTime } from "../lib/utils";

export function BookingSummaryPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { t } = useLocale();
  const id = bookingId ?? "";
  const booking = (useLocation().state as {
    booking?: {
      theme?: { name?: string };
      start_at?: string;
      branch_name?: string | null;
    };
  } | null)?.booking;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-lg mx-auto space-y-6"
    >
      <Card className="text-center">
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-400/40 flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </motion.div>

        <CardHeader className="mb-0">
          <CardTitle className="text-2xl">{t("summary.title")}</CardTitle>
        </CardHeader>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-slate-300 mt-2 mb-6"
        >
          {t("summary.thanks").replace("{id}", id)}
        </motion.p>

        {/* Booking details */}
        {(booking?.theme?.name || booking?.start_at) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 mb-6 text-left space-y-3"
          >
            {booking.theme?.name && (
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500">{t("confirm.theme")}</span>
                <span className="text-sm font-medium text-slate-100">{booking.theme.name}</span>
              </div>
            )}
            {booking.start_at && (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                    <CalendarDays className="w-3.5 h-3.5" /> {t("confirm.date")}
                  </span>
                  <span className="text-sm text-slate-200">{formatDate(booking.start_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                    <Clock3 className="w-3.5 h-3.5" /> {t("confirm.time")}
                  </span>
                  <span className="text-sm text-slate-200">{formatTime(booking.start_at)}</span>
                </div>
              </>
            )}
            {booking.branch_name && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                  <MapPin className="w-3.5 h-3.5" /> {t("confirm.branch")}
                </span>
                <span className="text-sm text-slate-200">{booking.branch_name}</span>
              </div>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Link to="/" className="flex-1">
            <Button size="lg" className="w-full gap-2">
              {t("summary.bookAnother")} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/profile" className="flex-1">
            <Button variant="secondary" size="lg" className="w-full gap-2">
              <Home className="w-4 h-4" /> {t("summary.viewBookings")}
            </Button>
          </Link>
        </motion.div>
      </Card>
    </motion.div>
  );
}
