import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  Users,
  CheckCircle2,
  ChevronRight,
  Trash2,
  MapPin,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { getApiMessage, publicApiEndpoints, type ParticipantInput } from "../api/endpoints";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { toISODate, formatTime, cn } from "../lib/utils";
import { getThemeImageFullUrl } from "../lib/themeImage";

const PHONE_REGEX = /^(\+964[0-9]{9,13}|07[0-9]{8,12}|\+[1-9][0-9]{6,14})$/;
const participantSchema = z.object({
  full_name: z.string().min(1, "Name required"),
  phone: z.string().min(1, "Phone required").regex(PHONE_REGEX, "Invalid phone number"),
  is_primary: z.boolean(),
});

const schema = z.object({
  start_at: z.string().min(1, "Time slot required"),
  participants: z.array(participantSchema).min(1).max(8),
  notes: z.string().optional(),
}).refine(
  (d) => d.participants.filter((p) => p.is_primary).length === 1,
  { message: "Exactly one primary participant", path: ["participants"] }
);

type Form = z.infer<typeof schema>;

type Slot = {
  start_at: string;
  end_at: string;
  schedule_id: number | null;
  branch_name?: string | null;
};

const STEPS = ["book.stepDate", "book.stepTime", "book.stepParticipants"] as const;

function StepIndicator({ currentStep, t }: { currentStep: number; t: (k: string) => string }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8">
      {STEPS.map((key, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        return (
          <div key={key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border",
                  isDone
                    ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                    : isActive
                    ? "bg-rose-500/20 border-rose-400/60 text-rose-200 shadow-[0_0_20px_rgba(225,29,72,0.3)]"
                    : "bg-white/[0.04] border-white/[0.06] text-slate-500"
                )}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden sm:inline text-xs font-medium transition-colors",
                  isDone ? "text-emerald-300" : isActive ? "text-slate-100" : "text-slate-500"
                )}
              >
                {t(key)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className={cn("w-4 h-4", i < currentStep ? "text-emerald-400/60" : "text-slate-700")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BookPage() {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { t } = useLocale();
  const [date, setDate] = useState(toISODate(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const id = Number(themeId || 0);

  const { data: themesData } = useQuery({
    queryKey: ["public-themes"],
    queryFn: publicApiEndpoints.themes,
  });
  const selectedTheme = useMemo(() => themesData?.themes?.find((t) => Number(t.id) === id), [themesData, id]);

  const { data: availability, isLoading: loadingSlots } = useQuery({
    queryKey: ["theme-availability", id, date],
    queryFn: () => publicApiEndpoints.themeAvailability(id, date),
    enabled: id > 0 && Boolean(date),
  });

  const slots = availability?.slots || [];

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      start_at: "",
      participants: [{ full_name: "", phone: "", is_primary: true }],
    },
  });

  const participants = watch("participants");

  useEffect(() => {
    if (isAuthenticated && user) {
      setValue("participants.0.full_name", user.full_name);
      setValue("participants.0.phone", user.phone);
      setValue("participants.0.is_primary", true);
    }
  }, [isAuthenticated, user, setValue]);

  const mutation = useMutation({
    mutationFn: (body: { theme_id: number; start_at: string; participants: ParticipantInput[]; notes?: string }) =>
      publicApiEndpoints.createBooking(body),
    onSuccess: (data) => {
      toast.success(t("book.bookingCreated"));
      navigate(`/booking/confirm/${data.booking.id}`, { replace: true, state: { booking: data.booking } });
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const onSubmit = (d: Form) => {
    if (!selectedSlot) {
      toast.error(t("book.pickSlotError"));
      return;
    }
    for (let i = 0; i < d.participants.length; i += 1) {
      const p = d.participants[i];
      if (!p.full_name?.trim()) {
        toast.error(`${t("book.participant")} #${i + 1}: ${t("book.nameRequired")}`);
        return;
      }
      if (!p.phone?.trim() || !PHONE_REGEX.test(p.phone.trim())) {
        toast.error(`${t("book.participant")} #${i + 1}: ${t("book.phoneRequired")}`);
        return;
      }
    }
    mutation.mutate({
      theme_id: id,
      start_at: selectedSlot.start_at,
      participants: d.participants,
      notes: d.notes ?? undefined,
    });
  };

  // Determine current step
  const currentStep = selectedSlot ? 2 : date ? 1 : 0;

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[50vh] flex items-center justify-center"
      >
        <div className="max-w-md w-full">
          <Card className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center mb-5">
              <Users className="w-7 h-7 text-rose-300" />
            </div>
            <CardHeader>
              <CardTitle>{t("book.signInToBook")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300 mb-6">
                {t("book.signInDesc")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/login">
                  <Button size="md" className="w-full sm:w-auto">{t("book.goToLogin")}</Button>
                </Link>
                <Link to="/register">
                  <Button variant="secondary" size="md" className="w-full sm:w-auto">{t("nav.signUp")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Back to themes */}
      <Link
        to="/themes"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("book.backToThemes")}
      </Link>

      {/* Theme hero banner */}
      <Card className="overflow-hidden p-0">
        {id > 0 && getThemeImageFullUrl(selectedTheme?.image_url) ? (
          <div className="h-40 sm:h-48 md:h-56 relative">
            <img src={getThemeImageFullUrl(selectedTheme?.image_url)!} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,17,32,0.9)] via-[rgba(11,17,32,0.4)] to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                {selectedTheme?.name || t("book.themeBooking")}
              </h1>
              <p className="text-sm text-slate-300 mt-1 line-clamp-2 max-w-lg">
                {selectedTheme?.description || t("book.chooseDateDesc")}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-semibold text-slate-50">
              {selectedTheme?.name || t("book.themeBooking")}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              {selectedTheme?.description || t("book.chooseDateDesc")}
            </p>
          </div>
        )}
      </Card>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} t={t} />

      {/* Step 1 — Date picker */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <CardTitle className="text-base">{t("book.selectDate")}</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">{t("book.selectDateDesc")}</p>
          </div>
        </CardHeader>
        <input
          type="date"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base sm:text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-transparent transition-all min-h-[48px]"
          value={date}
          min={toISODate(new Date())}
          onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }}
        />
      </Card>

      {/* Step 2 — Time slots */}
      <AnimatePresence>
        {date && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                  <Clock3 className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <CardTitle className="text-base">{t("book.availableSlots")}</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">{t("book.pickSlotDesc")}</p>
                </div>
              </CardHeader>

              {loadingSlots && <LoadingSpinner />}

              {!loadingSlots && slots.length === 0 && (
                <div className="text-center py-6">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center mb-3">
                    <Clock3 className="w-5 h-5 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400">{t("book.noSlots")}</p>
                  <p className="text-xs text-slate-500 mt-1">{t("book.tryAnotherDate")}</p>
                </div>
              )}

              {!loadingSlots && slots.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.start_at === slot.start_at;
                    return (
                      <button
                        key={`${slot.start_at}-${slot.schedule_id ?? "x"}`}
                        type="button"
                        onClick={() => { setSelectedSlot(slot); setValue("start_at", slot.start_at); toast.success(`${t("book.slotSelected") || "Time selected"}: ${formatTime(slot.start_at)}${slot.branch_name ? " — " + slot.branch_name : ""}`); }}
                        className={cn(
                          "relative flex flex-col items-center gap-1 px-3 py-3.5 sm:py-3 rounded-xl border text-sm font-medium transition-all duration-200 min-h-[52px]",
                          isSelected
                            ? "bg-rose-500/20 text-rose-100 border-rose-400/60 shadow-[0_0_24px_rgba(225,29,72,0.25)] ring-1 ring-rose-400/30"
                            : "border-white/[0.08] bg-white/[0.03] hover:border-rose-400/40 hover:bg-white/[0.06] text-slate-200"
                        )}
                      >
                        <span className="text-base font-semibold">{formatTime(slot.start_at)}</span>
                        {slot.branch_name && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <MapPin className="w-3 h-3" />
                            {slot.branch_name}
                          </span>
                        )}
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 3 — Participants */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{t("book.participants")}</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("book.participantsDesc")}
                  </p>
                </div>
              </CardHeader>

              {/* Selected slot summary */}
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 px-4 py-3 mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-rose-300" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock3 className="w-4 h-4 text-rose-300" />
                  <span>{formatTime(selectedSlot.start_at)}</span>
                </div>
                {selectedSlot.branch_name && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-300" />
                    <span>{selectedSlot.branch_name}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit(onSubmit, (formErrors) => {
                // Show validation errors as toast on mobile
                const firstError = Object.values(formErrors).flat()[0];
                if (firstError && typeof firstError === 'object' && 'message' in firstError) {
                  toast.error(String(firstError.message));
                } else if (formErrors.participants) {
                  const pErrors = formErrors.participants;
                  if (Array.isArray(pErrors)) {
                    for (const pe of pErrors) {
                      if (pe?.full_name?.message) { toast.error(pe.full_name.message); return; }
                      if (pe?.phone?.message) { toast.error(pe.phone.message); return; }
                    }
                  }
                  if ((pErrors as any).root?.message) toast.error((pErrors as any).root.message);
                }
              })} className="space-y-4">
                <input type="hidden" {...register("start_at")} />

                {participants.map((_, i) => {
                  const showReadOnlyForPrimary = isAuthenticated && user && i === 0 && participants[0]?.is_primary === true;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          {t("book.participant")} #{i + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="primary-participant"
                              checked={participants[i]?.is_primary}
                              onChange={() => participants.forEach((_, j) => setValue(`participants.${j}.is_primary`, j === i))}
                              className="accent-rose-500"
                            />
                            <span className={cn("text-xs", participants[i]?.is_primary ? "text-rose-300 font-medium" : "text-slate-400")}>
                              {t("book.primary")}
                            </span>
                          </label>
                          {i > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = participants.filter((_, j) => j !== i);
                                setValue("participants", updated);
                              }}
                              className="text-slate-500 hover:text-red-400 transition-colors p-1"
                              title={t("book.removeParticipant")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {showReadOnlyForPrimary ? (
                        <>
                          <input type="hidden" {...register(`participants.${i}.full_name`)} />
                          <input type="hidden" {...register(`participants.${i}.phone`)} />
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{t("profile.name")}</p>
                              <p className="text-slate-100">{user?.full_name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{t("profile.phone")}</p>
                              <p className="text-slate-200">{user?.phone}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            label={t("book.fullName")}
                            required
                            {...register(`participants.${i}.full_name`)}
                            error={errors.participants?.[i]?.full_name?.message}
                          />
                          <Input
                            label={t("book.phone")}
                            required
                            {...register(`participants.${i}.phone`)}
                            error={errors.participants?.[i]?.phone?.message}
                          />
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {participants.length < 8 && (
                  <button
                    type="button"
                    onClick={() => setValue("participants", [...participants, { full_name: "", phone: "", is_primary: false }])}
                    className="w-full rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] py-3 text-sm text-slate-400 hover:text-slate-200 hover:border-rose-400/40 hover:bg-white/[0.03] transition-all flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    {t("book.addParticipant")} ({participants.length}/8)
                  </button>
                )}

                <Input label={t("book.notesOptional")} {...register("notes")} />

                <Button type="submit" className="w-full" size="lg" loading={mutation.isPending}>
                  {t("book.createBooking")}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
