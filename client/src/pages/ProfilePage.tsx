import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, CalendarDays, Clock3, Pencil, Check, X, UserCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { customerBookingApi, publicApiEndpoints, userProfileApi, getApiMessage } from "../api/endpoints";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { formatDate, formatTime, cn } from "../lib/utils";

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn("transition-colors", readonly ? "cursor-default" : "cursor-pointer")}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={cn(
              "w-5 h-5 transition-colors",
              (hover || value) >= star
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-slate-600"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ProfilePage() {
  const { isAuthenticated, user, updateUser } = useAuth();
  const { t } = useLocale();
  const [ratingBookingId, setRatingBookingId] = useState<number | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const bookingsQuery = useQuery({
    queryKey: ["my-bookings"],
    queryFn: customerBookingApi.myBookings,
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => customerBookingApi.cancel(id),
    onSuccess: () => {
      toast.success(t("profile.cancel") + " \u2713");
      bookingsQuery.refetch();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const ratingMutation = useMutation({
    mutationFn: (body: { booking_id: number; rating: number; comment?: string | null }) =>
      publicApiEndpoints.submitRating(body),
    onSuccess: () => {
      toast.success(t("rating.success"));
      setRatingBookingId(null);
      setRatingValue(0);
      setRatingComment("");
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const profileMutation = useMutation({
    mutationFn: (body: { full_name: string; phone: string }) =>
      userProfileApi.updateProfile(body),
    onSuccess: (data) => {
      updateUser(data.user);
      toast.success(t("profile.editSuccess"));
      setIsEditing(false);
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  function startEditing() {
    if (!user) return;
    setEditName(user.full_name);
    setEditPhone(user.phone);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  function saveProfile() {
    profileMutation.mutate({ full_name: editName, phone: editPhone });
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Client can only rate after admin confirms the booking (confirmed/arrived/completed)
  const canRate = (status: string) => status === "confirmed" || status === "arrived" || status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Profile card */}
      <Card>
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/15 to-red-500/10 border border-white/[0.08] flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-slate-300" />
          </div>
        </div>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("profile.title")}</CardTitle>
            {!isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("profile.edit")}
              </button>
            )}
          </div>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{t("profile.name")}</p>
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            ) : (
              <p className="text-sm text-slate-100 font-medium">{user.full_name}</p>
            )}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{t("profile.phone")}</p>
            {isEditing ? (
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            ) : (
              <p className="text-sm text-slate-100 font-medium">{user.phone}</p>
            )}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{t("profile.verified")}</p>
            <p className={cn("text-sm font-medium", user.is_phone_verified ? "text-emerald-300" : "text-amber-300")}>
              {user.is_phone_verified ? t("profile.yes") : t("profile.no")}
            </p>
          </div>
        </div>
        {isEditing && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              onClick={saveProfile}
              loading={profileMutation.isPending}
              disabled={!editName.trim() || !editPhone.trim()}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              {profileMutation.isPending ? t("profile.saving") : t("profile.save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEditing}>
              <X className="w-3.5 h-3.5 mr-1" />
              {t("profile.cancel")}
            </Button>
          </div>
        )}
      </Card>

      {/* My Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.myBookings")}</CardTitle>
          <CardContent className="mb-0">
            <p className="text-sm text-slate-400">{t("profile.details")}</p>
          </CardContent>
        </CardHeader>
        <div className="space-y-3">
          {(bookingsQuery.data?.bookings || []).map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-100">{b.theme_name}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {formatDate(b.start_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="w-3.5 h-3.5" />
                      {formatTime(b.start_at)}
                    </span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                    b.status === "confirmed" && "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30",
                    b.status === "pending" && "bg-amber-500/15 text-amber-300 border border-amber-400/30",
                    b.status === "cancelled" && "bg-red-500/15 text-red-300 border border-red-400/30",
                    b.status === "arrived" && "bg-rose-500/15 text-rose-300 border border-rose-400/30",
                    b.status === "completed" && "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30",
                    b.status === "no_show" && "bg-slate-500/15 text-slate-400 border border-slate-500/30",
                  )}>
                    {b.status === "pending" ? (t("profile.status") === "Status" ? "Pending" : "\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631") :
                     b.status === "confirmed" ? (t("profile.status") === "Status" ? "Confirmed" : "\u0645\u0624\u0643\u062f") :
                     b.status === "cancelled" ? (t("profile.status") === "Status" ? "Cancelled" : "\u0645\u0644\u063a\u064a") :
                     b.status === "arrived" ? (t("profile.status") === "Status" ? "Arrived" : "\u0648\u0635\u0644") :
                     b.status === "completed" ? (t("profile.status") === "Status" ? "Completed" : "\u0645\u0643\u062a\u0645\u0644") :
                     b.status === "no_show" ? (t("profile.status") === "Status" ? "No Show" : "\u0644\u0645 \u064a\u062d\u0636\u0631") :
                     b.status}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => cancelMutation.mutate(b.id)}
                      loading={cancelMutation.isPending}
                    >
                      {t("profile.cancel")}
                    </Button>
                  )}
                  {canRate(b.status) && (
                    <button
                      type="button"
                      className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors"
                      onClick={() => { setRatingBookingId(b.id); setRatingValue(0); setRatingComment(""); }}
                    >
                      <Star className="w-3.5 h-3.5" />
                      {t("rating.rateThisBooking")}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline rating form */}
              {ratingBookingId === b.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 pt-3 border-t border-white/[0.06] space-y-3"
                >
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{t("rating.title")}</p>
                  <StarRating value={ratingValue} onChange={setRatingValue} />
                  <textarea
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                    rows={2}
                    placeholder={t("rating.placeholder")}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={ratingValue === 0}
                      loading={ratingMutation.isPending}
                      onClick={() => ratingMutation.mutate({ booking_id: b.id, rating: ratingValue, comment: ratingComment || null })}
                    >
                      {t("rating.submit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRatingBookingId(null)}>
                      {t("profile.cancel")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
          {bookingsQuery.data && bookingsQuery.data.bookings.length === 0 && (
            <p className="text-slate-400 text-sm">{t("profile.noBookings")}</p>
          )}
        </div>
        <Link to="/" className="inline-block mt-6">
          <Button>{t("profile.browseThemes")}</Button>
        </Link>
      </Card>
    </motion.div>
  );
}
