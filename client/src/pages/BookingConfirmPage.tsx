import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Sparkles,
  AlertCircle,
  Users,
  Banknote,
} from "lucide-react";
import { customerBookingApi, getApiMessage } from "../api/endpoints";
import { useLocale } from "../context/LocaleContext";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Link } from "react-router-dom";
import { formatDate, formatTime } from "../lib/utils";

export function BookingConfirmPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLocale();
  const id = Number(bookingId);
  const bookingFromState = (location.state as {
    booking?: {
      start_at?: string;
      end_at?: string;
      theme?: { name?: string };
      branch_name?: string | null;
      participants_count?: number;
      amount_iqd?: number;
      status?: string;
    };
  } | null)?.booking;

  const confirm = useMutation({
    mutationFn: () => customerBookingApi.confirm(id),
    onSuccess: () => {
      toast.success(t("confirm.successToast"));
      navigate(`/booking/summary/${id}`, { replace: true, state: { booking: bookingFromState } });
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  if (!bookingId || Number.isNaN(id)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Card className="max-w-sm text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/15 border border-red-400/30 flex items-center justify-center mb-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-sm text-red-400 mb-3">{t("confirm.invalidBooking")}</p>
          <Link to="/">
            <Button variant="secondary" size="sm">{t("summary.backHome")}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto space-y-6"
    >
      <Card>
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-amber-300" />
          </div>
          <CardHeader className="mb-0">
            <CardTitle className="text-xl">{t("confirm.title")}</CardTitle>
          </CardHeader>
          <p className="text-sm text-slate-400 mt-1">{t("confirm.instructions")}</p>
        </div>

        {/* Booking details card */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">{t("confirm.bookingId")}</span>
            <span className="text-sm font-semibold text-rose-300">#{id}</span>
          </div>

          {bookingFromState?.theme?.name && (
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">{t("confirm.theme")}</span>
              <span className="text-sm font-medium text-slate-100">{bookingFromState.theme.name}</span>
            </div>
          )}

          {bookingFromState?.start_at && (
            <>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                  <CalendarDays className="w-3.5 h-3.5" /> {t("confirm.date")}
                </span>
                <span className="text-sm text-slate-200">{formatDate(bookingFromState.start_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                  <Clock3 className="w-3.5 h-3.5" /> {t("confirm.time")}
                </span>
                <span className="text-sm text-slate-200">{formatTime(bookingFromState.start_at)}</span>
              </div>
            </>
          )}

          {bookingFromState?.branch_name && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                <MapPin className="w-3.5 h-3.5" /> {t("confirm.branch")}
              </span>
              <span className="text-sm text-slate-200">{bookingFromState.branch_name}</span>
            </div>
          )}

          {bookingFromState?.participants_count && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-500">
                <Users className="w-3.5 h-3.5" /> {t("book.participants") || "Participants"}
              </span>
              <span className="text-sm text-slate-200">{bookingFromState.participants_count}</span>
            </div>
          )}
        </div>

        {/* Price summary */}
        {bookingFromState?.amount_iqd && (
          <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                <Banknote className="w-4 h-4 text-rose-400" />
                {t("confirm.total") || "Total"}
              </span>
              <span className="text-lg font-bold text-white">
                {Number(bookingFromState.amount_iqd).toLocaleString()} IQD
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">{t("urgency.payAtVenue") || "Pay at venue"}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => confirm.mutate()} loading={confirm.isPending} size="lg" className="flex-1">
            {t("confirm.button")}
          </Button>
          <Link to="/" className="flex-1">
            <Button variant="secondary" size="lg" className="w-full">
              {t("confirm.backToBook")}
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
