import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import SignatureCanvas from "react-signature-canvas";
import { useStaff } from "../../context/StaffContext";
import { adminEndpoints, getApiMessage } from "../../api/endpoints";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toISODate, formatDateTime } from "../../lib/utils";
import { getThemeImageFullUrl } from "../../lib/themeImage";

type MenuSection = "themes" | "schedules" | "bookings" | "staff" | "settings";

type WaiverRow = {
  id: number;
  booking_id: number;
  participant_id: number;
  pdf_path: string;
  generated_at: string;
  signed_at: string | null;
  full_name: string;
  phone: string;
  is_primary: boolean;
};

function BookingDetailsPanel({
  bookingId,
  loading,
  bookingData,
  canSchedule,
  onRefresh: _onRefresh,
}: {
  bookingId: number;
  loading: boolean;
  bookingData?: { booking: { theme_name: string; start_at: string; status: string; booker_name: string; booker_phone: string; expected_amount_iqd: number; paid_amount_iqd: number; payment_status: string | null }; participants: Array<{ id: number; full_name: string; phone: string; is_primary: boolean }> };
  canSchedule: boolean;
  onRefresh: () => void;
}) {
  void _onRefresh;
  const [signingWaiver, setSigningWaiver] = useState<WaiverRow | null>(null);
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);

  const { data: waiversData, refetch: refetchWaivers, isLoading: loadingWaivers } = useQuery({
    queryKey: ["admin-waivers", bookingId],
    queryFn: () => adminEndpoints.waiversList(bookingId),
    enabled: bookingId > 0,
  });

  const generateMutation = useMutation({
    mutationFn: () => adminEndpoints.waiversGenerate(bookingId),
    onSuccess: (data) => {
      const gen = (data as { generated: unknown[] }).generated?.length || 0;
      toast.success(`Generated ${gen} waiver(s)`);
      refetchWaivers();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const signMutation = useMutation({
    mutationFn: (payload: { waiverId: number; base64: string }) =>
      adminEndpoints.signWaiver(bookingId, payload.waiverId, payload.base64),
    onSuccess: () => {
      toast.success("Waiver signed successfully");
      setSigningWaiver(null);
      refetchWaivers();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  function handleSign() {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      toast.error("Please draw a signature first");
      return;
    }
    if (!signingWaiver) return;
    const base64 = sigCanvasRef.current.toDataURL("image/png");
    signMutation.mutate({ waiverId: signingWaiver.id, base64 });
  }

  async function handleViewWaiver(waiverId: number) {
    try {
      const blob = await adminEndpoints.downloadWaiver(waiverId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      toast.error(getApiMessage(err));
    }
  }

  const waivers = waiversData?.waivers || [];

  return (
    <div className="mt-6 border-t border-slate-800 pt-4">
      <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Booking Details #{bookingId}</h3>
      {loading && <LoadingSpinner />}
      {bookingData?.booking && (
        <div className="space-y-3 text-sm">
          <div className="font-medium text-slate-100">
            {bookingData.booking.theme_name} · {formatDateTime(bookingData.booking.start_at)} · {bookingData.booking.status}
          </div>
          <div className="text-slate-400 text-xs">
            {bookingData.booking.booker_name} ({bookingData.booking.booker_phone})
          </div>
          <div className="text-slate-400 text-xs">
            Expected {Number(bookingData.booking.expected_amount_iqd || 0).toLocaleString()} / Paid {Number(bookingData.booking.paid_amount_iqd || 0).toLocaleString()} IQD
          </div>

          {/* Participants */}
          <div className="space-y-1">
            {bookingData.participants.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs">
                {p.full_name} · {p.phone} {p.is_primary ? <span className="text-indigo-300">(primary)</span> : ""}
              </div>
            ))}
          </div>

          {/* Waivers section */}
          {canSchedule && (
            <div className="mt-4 pt-4 border-t border-slate-800/60">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Liability Waivers</h4>
                {waivers.length === 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => generateMutation.mutate()}
                    loading={generateMutation.isPending}
                  >
                    Generate Waivers
                  </Button>
                )}
              </div>

              {loadingWaivers && <LoadingSpinner />}

              {waivers.length > 0 && (
                <div className="space-y-2">
                  {waivers.map((w) => (
                    <div
                      key={w.id}
                      className="rounded-xl border border-slate-800/70 bg-slate-900/40 px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-100">{w.full_name}</span>
                          {w.is_primary && <span className="text-[10px] text-indigo-300">(primary)</span>}
                          {w.signed_at ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                              ✓ Signed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
                              Unsigned
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{w.phone}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!w.signed_at && (
                          <Button size="sm" variant="primary" onClick={() => setSigningWaiver(w)}>
                            Sign
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => handleViewWaiver(w.id)}>
                          View PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {waivers.length === 0 && !loadingWaivers && (
                <p className="text-xs text-slate-500">No waivers yet. Waivers are auto-generated when a booking is confirmed. For older bookings, click "Generate Waivers".</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Signature Modal */}
      {signingWaiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto"
          >
            <div className="p-6">
              {/* Modal header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-100">Sign Waiver</h3>
                <button
                  type="button"
                  onClick={() => setSigningWaiver(null)}
                  className="text-slate-400 hover:text-slate-200 text-xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Participant info */}
              <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3 mb-4">
                <div className="text-sm font-medium text-slate-100">{signingWaiver.full_name}</div>
                <div className="text-xs text-slate-400">{signingWaiver.phone}</div>
              </div>

              {/* Waiver text preview */}
              <div className="rounded-xl bg-slate-950/60 border border-slate-800/60 p-4 mb-4 max-h-40 overflow-auto" dir="rtl">
                <p className="text-xs text-slate-400 font-semibold mb-2">تعهد وإقرار بإخلاء المسؤولية</p>
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line">
                  أقر أنا الموقع أدناه بأنني أشارك في نشاط غرفة الهروب بمحض إرادتي الكاملة، وأنني على دراية تامة بطبيعة هذا النشاط وما قد يتضمنه من تحديات جسدية ونفسية...
                </p>
              </div>

              {/* Signature canvas */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">Draw signature below</p>
                <div className="rounded-xl border-2 border-dashed border-slate-600 bg-white overflow-hidden" style={{ touchAction: "none" }}>
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    canvasProps={{
                      className: "w-full",
                      style: { width: "100%", height: "280px" },
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      willReadFrequently: true,
                    } as any}
                    penColor="#1e293b"
                    backgroundColor="#ffffff"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  size="md"
                  onClick={handleSign}
                  loading={signMutation.isPending}
                >
                  Save Signature
                </Button>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => sigCanvasRef.current?.clear()}
                >
                  Clear
                </Button>
                <Button
                  size="md"
                  variant="ghost"
                  onClick={() => setSigningWaiver(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

export function StaffDashboardPage() {
  const { staff, hasRole } = useStaff();
  const isManager = hasRole("manager");
  const isBookingAgent = hasRole("booking_agent");
  const isAccountant = hasRole("accountant");
  const canViewBookings = isManager || isAccountant || isBookingAgent;
  const canSchedule = isManager || isBookingAgent;
  const canCancelBooking = isManager || isBookingAgent;
  const [section, setSection] = useState<MenuSection>(isManager ? "themes" : "schedules");

  const [bookingsDate, setBookingsDate] = useState(toISODate(new Date()));
  const [bookingsStatus, setBookingsStatus] = useState("");
  const [bookingsThemeId, setBookingsThemeId] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [bookingToCancelId, setBookingToCancelId] = useState<number | null>(null);
  const [scheduleToDeleteId, setScheduleToDeleteId] = useState<number | null>(null);

  const [scheduleBranchId, setScheduleBranchId] = useState("");
  const [scheduleRoomId, setScheduleRoomId] = useState("");
  const [scheduleThemeId, setScheduleThemeId] = useState("");
  const [scheduleDate, setScheduleDate] = useState(toISODate(new Date()));
  const [startHour, setStartHour] = useState("10:00");
  const [endHour, setEndHour] = useState("11:00");
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [themeActive, setThemeActive] = useState(true);
  const [editingThemeId, setEditingThemeId] = useState<number | null>(null);
  const [themeImageFile, setThemeImageFile] = useState<File | null>(null);
  const [themeImagePreview, setThemeImagePreview] = useState<string | null>(null);

  const [staffName, setStaffName] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"booking_agent" | "accountant" | "manager">("booking_agent");
  const [staffBranchId, setStaffBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchOpen, setBranchOpen] = useState("");
  const [branchClose, setBranchClose] = useState("");
  const [branchActive, setBranchActive] = useState(true);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [roomBranchId, setRoomBranchId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCapacityMin, setRoomCapacityMin] = useState("1");
  const [roomCapacityMax, setRoomCapacityMax] = useState("8");
  const [roomActive, setRoomActive] = useState(true);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Switch Escape Room — Dashboard";
  }, []);

  const { data: branchesData, refetch: refetchBranches } = useQuery({
    queryKey: ["admin-branches"],
    queryFn: adminEndpoints.branches,
    enabled: canSchedule || isManager,
  });

  const { data: roomsData, refetch: refetchRooms } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: () => adminEndpoints.rooms(),
    enabled: canSchedule || isManager,
  });

  const { data: themesData, refetch: refetchThemes } = useQuery({
    queryKey: ["admin-themes"],
    queryFn: adminEndpoints.themes,
    enabled: canSchedule || isManager,
  });

  const { data: schedulesData, isLoading: loadingSchedules, refetch: refetchSchedules } = useQuery({
    queryKey: ["admin-schedules", scheduleDate],
    queryFn: () =>
      adminEndpoints.schedules({
        date: scheduleDate,
      }),
    enabled: canSchedule,
  });

  const { data: adminBookingsData, isLoading: loadingAdminBookings, refetch: refetchAdminBookings } = useQuery({
    queryKey: ["admin-bookings-list", bookingsDate, bookingsStatus, bookingsThemeId],
    queryFn: () =>
      adminEndpoints.bookings({
        date: bookingsDate || undefined,
        status: bookingsStatus || undefined,
        theme_id: bookingsThemeId ? Number(bookingsThemeId) : undefined,
      }),
    enabled: canViewBookings,
  });

  const { data: bookingDetailsData, isLoading: loadingBookingDetails, refetch: refetchBookingDetails } = useQuery({
    queryKey: ["admin-booking-details", selectedBookingId],
    queryFn: () => adminEndpoints.bookingDetails(Number(selectedBookingId)),
    enabled: canViewBookings && selectedBookingId != null,
  });

  const { data: dailyReportData, isLoading: loadingDailyReport, refetch: refetchDailyReport } = useQuery({
    queryKey: ["admin-daily-report-staff", bookingsDate],
    queryFn: () => adminEndpoints.dailyReport(bookingsDate),
    enabled: canViewBookings,
  });

  const { data: staffUsersData, refetch: refetchStaffUsers } = useQuery({
    queryKey: ["admin-staff-users"],
    queryFn: adminEndpoints.staffUsers,
    enabled: isManager,
  });

  const roomsForScheduleBranch = useMemo(() => {
    const all = roomsData?.rooms || [];
    if (!scheduleBranchId) return [];
    return all.filter((r) => Number(r.branch_id) === Number(scheduleBranchId));
  }, [roomsData, scheduleBranchId]);

  function buildIso(dateStr: string, hour: string) {
    return new Date(`${dateStr}T${hour}:00`).toISOString();
  }

  function validateScheduleForm() {
    if (!scheduleThemeId) return "Theme is required";
    if (!scheduleBranchId) return "Branch is required";
    if (!scheduleRoomId) return "Room is required";
    if (!scheduleDate || Number.isNaN(new Date(`${scheduleDate}T00:00:00`).getTime())) return "Date is invalid";
    if (!HOURS.includes(startHour) || !HOURS.includes(endHour)) return "Time must be hour-based";

    const selectedBranch = (branchesData?.branches || []).find((b) => Number(b.id) === Number(scheduleBranchId));
    if (!selectedBranch) return "Please select a valid branch";

    const selectedRoom = (roomsData?.rooms || []).find((r) => Number(r.id) === Number(scheduleRoomId));
    const roomNo = Number((selectedRoom?.name || "").replace(/[^\d]/g, ""));
    if (!selectedRoom || roomNo < 1 || roomNo > 3) return "Room must be 1, 2, or 3";

    const startIso = buildIso(scheduleDate, startHour);
    const endIso = buildIso(scheduleDate, endHour);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) return "End hour must be after start hour";
    return "";
  }

  const createSchedule = useMutation({
    mutationFn: (payload: { room_id: number; theme_id: number; start_at: string; end_at: string }) => adminEndpoints.createSchedule(payload),
    onSuccess: () => {
      toast.success("Schedule added");
      setEditingScheduleId(null);
      setFormError("");
      refetchSchedules();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const updateSchedule = useMutation({
    mutationFn: (payload: { id: number; room_id: number; theme_id: number; start_at: string; end_at: string }) =>
      adminEndpoints.updateSchedule(payload.id, payload),
    onSuccess: () => {
      toast.success("Schedule updated");
      setEditingScheduleId(null);
      setFormError("");
      refetchSchedules();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const deleteSchedule = useMutation({
    mutationFn: (id: number) => adminEndpoints.deleteSchedule(id),
    onSuccess: () => {
      toast.success("Schedule deleted");
      refetchSchedules();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const confirmBookingMutation = useMutation({
    mutationFn: (id: number) => adminEndpoints.confirmBooking(id),
    onSuccess: () => {
      toast.success("Booking confirmed.");
      refetchAdminBookings();
      refetchDailyReport();
      if (selectedBookingId) refetchBookingDetails();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const arriveMutation = useMutation({
    mutationFn: (id: number) => adminEndpoints.arrive(id),
    onSuccess: () => {
      toast.success("Marked as arrived.");
      refetchAdminBookings();
      refetchDailyReport();
      if (selectedBookingId) refetchBookingDetails();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => adminEndpoints.complete(id),
    onSuccess: () => {
      toast.success("Booking completed.");
      refetchAdminBookings();
      refetchDailyReport();
      if (selectedBookingId) refetchBookingDetails();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => adminEndpoints.markPaid(id, { method: "cash" }),
    onSuccess: () => {
      toast.success("Payment recorded.");
      refetchAdminBookings();
      refetchDailyReport();
      if (selectedBookingId) refetchBookingDetails();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (id: number) => adminEndpoints.cancelBooking(id),
    onSuccess: () => {
      toast.success("Booking cancelled successfully.");
      setBookingToCancelId(null);
      refetchAdminBookings();
      refetchDailyReport();
      if (selectedBookingId) refetchBookingDetails();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const createTheme = useMutation({
    mutationFn: (payload: { name: string; description?: string | null; is_active?: boolean }) => adminEndpoints.createTheme(payload),
    onSuccess: async (data: { id: number }) => {
      if (themeImageFile) {
        try { await adminEndpoints.uploadThemeImage(data.id, themeImageFile); } catch { /* ignore upload error */ }
      }
      setThemeImageFile(null);
      setThemeImagePreview(null);
      toast.success("Theme created");
      setThemeName("");
      setThemeDescription("");
      setThemeActive(true);
      setEditingThemeId(null);
      refetchThemes();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const updateTheme = useMutation({
    mutationFn: (payload: { id: number; name?: string; description?: string | null; is_active?: boolean }) =>
      adminEndpoints.updateTheme(payload.id, payload),
    onSuccess: async (_data, variables) => {
      if (variables.id != null && themeImageFile) {
        try { await adminEndpoints.uploadThemeImage(variables.id, themeImageFile); } catch { /* ignore upload error */ }
      }
      setThemeImageFile(null);
      setThemeImagePreview(null);
      toast.success("Theme updated");
      setThemeName("");
      setThemeDescription("");
      setThemeActive(true);
      setEditingThemeId(null);
      refetchThemes();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const createStaff = useMutation({
    mutationFn: () =>
      adminEndpoints.createStaffUser({
        full_name: staffName,
        username: staffUsername,
        password: staffPassword,
        role: staffRole,
        branch_id: staffBranchId ? Number(staffBranchId) : null,
      }),
    onSuccess: () => {
      toast.success("Staff user created");
      setStaffName("");
      setStaffUsername("");
      setStaffPassword("");
      setStaffRole("booking_agent");
      setStaffBranchId("");
      refetchStaffUsers();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const updateStaff = useMutation({
    mutationFn: (payload: { id: number; is_active: boolean }) =>
      adminEndpoints.updateStaffUser(payload.id, { is_active: payload.is_active }),
    onSuccess: () => {
      toast.success("Staff user updated");
      refetchStaffUsers();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const createBranch = useMutation({
    mutationFn: () =>
      adminEndpoints.createBranch({
        name: branchName,
        address: branchAddress || null,
        phone: branchPhone || null,
        open_time: branchOpen || null,
        close_time: branchClose || null,
        is_active: branchActive,
      }),
    onSuccess: () => {
      toast.success("Branch created");
      setBranchName("");
      setBranchAddress("");
      setBranchPhone("");
      setBranchOpen("");
      setBranchClose("");
      setBranchActive(true);
      setEditingBranchId(null);
      refetchBranches();
      refetchRooms();
      refetchSchedules();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const updateBranch = useMutation({
    mutationFn: (id: number) =>
      adminEndpoints.updateBranch(id, {
        name: branchName,
        address: branchAddress || null,
        phone: branchPhone || null,
        open_time: branchOpen || null,
        close_time: branchClose || null,
        is_active: branchActive,
      }),
    onSuccess: () => {
      toast.success("Branch updated");
      setBranchName("");
      setBranchAddress("");
      setBranchPhone("");
      setBranchOpen("");
      setBranchClose("");
      setBranchActive(true);
      setEditingBranchId(null);
      refetchBranches();
      refetchRooms();
      refetchSchedules();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const createRoom = useMutation({
    mutationFn: () =>
      adminEndpoints.createRoom({
        branch_id: Number(roomBranchId),
        name: roomName,
        capacity_min: Number(roomCapacityMin),
        capacity_max: Number(roomCapacityMax),
        is_active: roomActive,
      }),
    onSuccess: () => {
      toast.success("Room created");
      setRoomBranchId("");
      setRoomName("");
      setRoomCapacityMin("1");
      setRoomCapacityMax("8");
      setRoomActive(true);
      setEditingRoomId(null);
      refetchRooms();
      refetchSchedules();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const updateRoom = useMutation({
    mutationFn: (id: number) =>
      adminEndpoints.updateRoom(id, {
        branch_id: Number(roomBranchId),
        name: roomName,
        capacity_min: Number(roomCapacityMin),
        capacity_max: Number(roomCapacityMax),
        is_active: roomActive,
      }),
    onSuccess: () => {
      toast.success("Room updated");
      setRoomBranchId("");
      setRoomName("");
      setRoomCapacityMin("1");
      setRoomCapacityMax("8");
      setRoomActive(true);
      setEditingRoomId(null);
      refetchRooms();
      refetchSchedules();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  function submitSchedule() {
    const err = validateScheduleForm();
    if (err) {
      setFormError(err);
      toast.error(err);
      return;
    }
    const payload = {
      room_id: Number(scheduleRoomId),
      theme_id: Number(scheduleThemeId),
      start_at: buildIso(scheduleDate, startHour),
      end_at: buildIso(scheduleDate, endHour),
    };
    if (editingScheduleId) {
      updateSchedule.mutate({ id: editingScheduleId, ...payload });
      return;
    }
    createSchedule.mutate(payload);
  }

  function beginEditSchedule(row: { id: number; room_id: number; theme_id: number; start_at: string; end_at: string }) {
    const st = new Date(row.start_at);
    const en = new Date(row.end_at);
    const room = (roomsData?.rooms || []).find((r) => Number(r.id) === Number(row.room_id));
    setEditingScheduleId(row.id);
    setScheduleThemeId(String(row.theme_id));
    setScheduleBranchId(room ? String(room.branch_id) : "");
    setScheduleRoomId(String(row.room_id));
    setScheduleDate(st.toISOString().slice(0, 10));
    setStartHour(`${String(st.getHours()).padStart(2, "0")}:00`);
    setEndHour(`${String(en.getHours()).padStart(2, "0")}:00`);
    setFormError("");
  }

  function submitTheme() {
    if (!themeName.trim()) {
      toast.error("Theme name is required");
      return;
    }
    if (editingThemeId) {
      updateTheme.mutate({ id: editingThemeId, name: themeName.trim(), description: themeDescription.trim() || null, is_active: themeActive });
      return;
    }
    createTheme.mutate({ name: themeName.trim(), description: themeDescription.trim() || null, is_active: themeActive });
  }

  function beginEditTheme(row: { id: number; name: string; description?: string | null; image_url?: string | null; is_active: boolean }) {
    setEditingThemeId(row.id);
    setThemeName(row.name);
    setThemeDescription(row.description || "");
    setThemeActive(row.is_active);
    setThemeImageFile(null);
    setThemeImagePreview(getThemeImageFullUrl(row.image_url));
  }

  function submitBranch() {
    if (!branchName.trim()) {
      toast.error("Branch name is required");
      return;
    }
    if (editingBranchId) {
      updateBranch.mutate(editingBranchId);
      return;
    }
    createBranch.mutate();
  }

  function beginEditBranch(row: { id: number; name: string; address?: string | null; phone?: string | null; open_time?: string | null; close_time?: string | null; is_active?: boolean }) {
    setEditingBranchId(row.id);
    setBranchName(row.name || "");
    setBranchAddress(row.address || "");
    setBranchPhone(row.phone || "");
    setBranchOpen(row.open_time ? String(row.open_time).slice(0, 5) : "");
    setBranchClose(row.close_time ? String(row.close_time).slice(0, 5) : "");
    setBranchActive(row.is_active !== false);
  }

  function submitRoom() {
    if (!roomBranchId) {
      toast.error("Room branch is required");
      return;
    }
    if (!roomName.trim()) {
      toast.error("Room name is required");
      return;
    }
    if (Number(roomCapacityMax) < Number(roomCapacityMin)) {
      toast.error("capacity_max must be greater than or equal to capacity_min");
      return;
    }
    if (editingRoomId) {
      updateRoom.mutate(editingRoomId);
      return;
    }
    createRoom.mutate();
  }

  function beginEditRoom(row: { id: number; branch_id: number; name: string; capacity_min: number; capacity_max: number; is_active?: boolean }) {
    setEditingRoomId(row.id);
    setRoomBranchId(String(row.branch_id));
    setRoomName(row.name || "");
    setRoomCapacityMin(String(row.capacity_min || 1));
    setRoomCapacityMax(String(row.capacity_max || 8));
    setRoomActive(row.is_active !== false);
  }

  const [contactPhone, setContactPhone] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const { refetch: refetchContact } = useQuery({
    queryKey: ["admin-contact-settings"],
    queryFn: adminEndpoints.getContactSettings,
    enabled: isManager && section === "settings",
  });

  // Load contact settings when switching to settings tab
  useEffect(() => {
    if (isManager && section === "settings") {
      adminEndpoints.getContactSettings().then((data) => {
        setContactPhone(data.phone || "");
        setContactAddress(data.address || "");
        setContactEmail(data.email || "");
      }).catch(() => {});
    }
  }, [isManager, section]);

  const updateContact = useMutation({
    mutationFn: () => adminEndpoints.updateContactSettings({ phone: contactPhone, address: contactAddress, email: contactEmail }),
    onSuccess: () => {
      toast.success("Contact info updated");
      refetchContact();
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  function menuItems(): Array<{ key: MenuSection; label: string }> {
    if (isManager) return [{ key: "themes", label: "Themes" }, { key: "schedules", label: "Schedules" }, { key: "bookings", label: "Bookings" }, { key: "staff", label: "Staff Management" }, { key: "settings", label: "Settings" }];
    if (isBookingAgent) return [{ key: "schedules", label: "Schedules" }, { key: "bookings", label: "Bookings" }, { key: "themes", label: "Themes (View)" }];
    if (isAccountant) return [{ key: "bookings", label: "Bookings" }];
    return [];
  }

  if (!isManager && !isBookingAgent && !isAccountant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300">You don&apos;t have permission to use this dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Signed in as {staff?.full_name} · {staff?.role}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {menuItems().map((item) => (
            <Button
              key={item.key}
              variant={section === item.key ? "primary" : "ghost"}
              size="sm"
              onClick={() => setSection(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {section === "schedules" && canSchedule && (
        <Card>
          <CardHeader>
            <CardTitle>Theme Schedules</CardTitle>
            <CardContent className="mb-0">Add and edit branch/room/date/hour schedules (cinema-style slots).</CardContent>
          </CardHeader>

          <div className="grid md:grid-cols-3 gap-3 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Theme</label>
              <select className="select-input" value={scheduleThemeId} onChange={(e) => setScheduleThemeId(e.target.value)}>
                <option value="">Select theme</option>
                {(themesData?.themes || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Branch</label>
              <select
                className="select-input"
                value={scheduleBranchId}
                onChange={(e) => {
                  setScheduleBranchId(e.target.value);
                  setScheduleRoomId("");
                }}
              >
                <option value="">Select branch</option>
                {(branchesData?.branches || []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Room (1-3)</label>
              <select className="select-input" value={scheduleRoomId} onChange={(e) => setScheduleRoomId(e.target.value)}>
                <option value="">Select room</option>
                {roomsForScheduleBranch.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <Input label="Date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Start Hour</label>
              <select className="select-input" value={startHour} onChange={(e) => setStartHour(e.target.value)}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">End Hour</label>
              <select className="select-input" value={endHour} onChange={(e) => setEndHour(e.target.value)}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          {formError && <p className="text-sm text-red-400 mb-3">{formError}</p>}
          <div className="flex gap-2 mb-6">
            <Button onClick={submitSchedule} loading={createSchedule.isPending || updateSchedule.isPending}>
              {editingScheduleId ? "Update schedule" : "Add schedule"}
            </Button>
            {editingScheduleId && (
              <Button variant="ghost" onClick={() => setEditingScheduleId(null)}>Cancel Edit</Button>
            )}
          </div>

          {loadingSchedules && <LoadingSpinner />}
          <div className="space-y-2 max-h-80 overflow-auto">
            {(schedulesData?.schedules || []).map((s) => (
              <div key={s.id} className="dashboard-row">
                <div>
                  <div className="font-medium text-slate-100">{s.theme_name} · {s.branch_name} · {s.room_name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{formatDateTime(s.start_at)} – {formatDateTime(s.end_at)}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => beginEditSchedule(s)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => setScheduleToDeleteId(s.id)} loading={deleteSchedule.isPending && scheduleToDeleteId === s.id}>Delete</Button>
                </div>
              </div>
            ))}
          </div>

          {scheduleToDeleteId != null && (
            <ConfirmDialog
              title="Delete schedule"
              message="Are you sure you want to delete this schedule? This action cannot be undone."
              confirmLabel="Delete"
              loading={deleteSchedule.isPending}
              onConfirm={() => {
                deleteSchedule.mutate(scheduleToDeleteId, {
                  onSuccess: () => setScheduleToDeleteId(null),
                });
              }}
              onCancel={() => setScheduleToDeleteId(null)}
            />
          )}
        </Card>
      )}

      {section === "themes" && (
        <Card>
          <CardHeader>
            <CardTitle>Themes</CardTitle>
            <CardContent className="mb-0">{isManager ? "Create and manage themes." : "View themes list."}</CardContent>
          </CardHeader>

          {isManager && (
            <>
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <Input label="Name" value={themeName} onChange={(e) => setThemeName(e.target.value)} />
                <Input label="Description" value={themeDescription} onChange={(e) => setThemeDescription(e.target.value)} />
                <label className="flex items-center gap-2 text-sm text-slate-300 mt-8">
                  <input type="checkbox" checked={themeActive} onChange={(e) => setThemeActive(e.target.checked)} /> Active
                </label>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Theme image</label>
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full max-w-xs text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-200 hover:file:bg-slate-700"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setThemeImageFile(file);
                      setThemeImagePreview(URL.createObjectURL(file));
                      e.target.value = "";
                    }}
                  />
                  {themeImagePreview && (
                    <>
                      <div className="relative rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 h-24 w-32 flex-shrink-0">
                        <img src={themeImagePreview} alt="Theme preview" className="h-full w-full object-cover" />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setThemeImageFile(null);
                          setThemeImagePreview(null);
                        }}
                      >
                        Remove image
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Optional. Shown on the client booking page.</p>
              </div>
            </>
          )}

          {isManager && (
            <div className="flex gap-2 mb-6">
              <Button onClick={submitTheme} loading={createTheme.isPending || updateTheme.isPending}>
                {editingThemeId ? "Update theme" : "Add theme"}
              </Button>
              {editingThemeId && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingThemeId(null);
                    setThemeImageFile(null);
                    setThemeImagePreview(null);
                  }}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {(themesData?.themes || []).map((t) => (
              <div key={t.id} className="dashboard-row">
                <div className="flex items-center gap-3 min-w-0">
                  {getThemeImageFullUrl(t.image_url) ? (
                    <img src={getThemeImageFullUrl(t.image_url)!} alt="" className="h-12 w-16 rounded-lg object-cover border border-slate-700/80 flex-shrink-0" />
                  ) : (
                    <div className="h-12 w-16 rounded-lg bg-slate-800/80 border border-slate-700/80 flex-shrink-0 flex items-center justify-center text-slate-500 text-xs">No img</div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100">{t.name} {!t.is_active && <span className="text-amber-300 text-xs">(inactive)</span>}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{t.description || "No description"}</div>
                  </div>
                </div>
                {isManager && <Button size="sm" variant="secondary" onClick={() => beginEditTheme(t)}>Edit</Button>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {section === "bookings" && canViewBookings && (
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
            <CardContent className="mb-0">Visible to manager and accountant.</CardContent>
          </CardHeader>

          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <Input label="Date" type="date" value={bookingsDate} onChange={(e) => setBookingsDate(e.target.value)} />
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Status</label>
              <select className="select-input" value={bookingsStatus} onChange={(e) => setBookingsStatus(e.target.value)}>
                <option value="">All</option>
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="cancelled">cancelled</option>
                <option value="arrived">arrived</option>
                <option value="no_show">no_show</option>
                <option value="completed">completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Theme</label>
              <select className="select-input" value={bookingsThemeId} onChange={(e) => setBookingsThemeId(e.target.value)}>
                <option value="">All</option>
                {(themesData?.themes || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="secondary" onClick={() => { refetchAdminBookings(); refetchDailyReport(); }}>
                Refresh
              </Button>
            </div>
          </div>

          {loadingDailyReport && <LoadingSpinner />}
          {dailyReportData && (
            <div className="grid sm:grid-cols-4 gap-3 mb-5">
              <div className="panel p-4 rounded-2xl border border-slate-800/80"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bookings</p><p className="text-xl font-semibold text-slate-50 mt-1">{dailyReportData.bookings_count}</p></div>
              <div className="panel p-4 rounded-2xl border border-slate-800/80"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Participants</p><p className="text-xl font-semibold text-slate-50 mt-1">{dailyReportData.total_participants}</p></div>
              <div className="panel p-4 rounded-2xl border border-slate-800/80"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Expected</p><p className="text-xl font-semibold text-slate-50 mt-1">{Number(dailyReportData.total_revenue_iqd || 0).toLocaleString()} IQD</p></div>
              <div className="panel p-4 rounded-2xl border border-slate-800/80"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Paid</p><p className="text-xl font-semibold text-slate-50 mt-1">{Number(dailyReportData.total_paid_iqd || 0).toLocaleString()} IQD</p></div>
            </div>
          )}

          {loadingAdminBookings && <LoadingSpinner />}
          <div className="space-y-2 max-h-[28rem] overflow-auto">
            {(adminBookingsData?.bookings || []).map((b) => (
              <div key={b.id} className="dashboard-row flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-100">#{b.id} · {b.theme_name}</span>
                    <span className={`inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full
                      ${b.status === "confirmed" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30" : ""}
                      ${b.status === "pending" ? "bg-amber-500/15 text-amber-300 border border-amber-400/30" : ""}
                      ${b.status === "cancelled" ? "bg-red-500/15 text-red-300 border border-red-400/30" : ""}
                      ${b.status === "arrived" ? "bg-indigo-500/15 text-indigo-300 border border-indigo-400/30" : ""}
                      ${b.status === "completed" ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30" : ""}
                      ${b.status === "no_show" ? "bg-slate-500/15 text-slate-400 border border-slate-500/30" : ""}
                    `}>
                      {b.status}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs mt-1">{formatDateTime(b.start_at)} · {b.booker_name} ({b.booker_phone}) · {b.participants_count} participants</div>
                  <div className="text-slate-400 text-xs">Expected {Number(b.expected_amount_iqd || 0).toLocaleString()} / Paid {Number(b.paid_amount_iqd || 0).toLocaleString()} IQD</div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={() => { setSelectedBookingId(b.id); refetchBookingDetails(); }}>
                    Details
                  </Button>
                  {canCancelBooking && b.status === "pending" && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => confirmBookingMutation.mutate(b.id)}
                      loading={confirmBookingMutation.isPending}
                    >
                      Confirm
                    </Button>
                  )}
                  {canCancelBooking && b.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => arriveMutation.mutate(b.id)}
                      loading={arriveMutation.isPending}
                    >
                      Arrived
                    </Button>
                  )}
                  {canViewBookings && b.payment_status !== "paid" && (b.status === "confirmed" || b.status === "arrived") && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => markPaidMutation.mutate(b.id)}
                      loading={markPaidMutation.isPending}
                    >
                      Mark Paid
                    </Button>
                  )}
                  {b.status === "arrived" && (
                    <Button size="sm" variant="secondary" onClick={() => completeMutation.mutate(b.id)} loading={completeMutation.isPending}>
                      Complete
                    </Button>
                  )}
                  {canCancelBooking && (b.status === "pending" || b.status === "confirmed") && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setBookingToCancelId(b.id)}
                      loading={cancelBookingMutation.isPending && bookingToCancelId === b.id}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {bookingToCancelId != null && (
            <ConfirmDialog
              title="Cancel booking"
              message="Are you sure you want to cancel this booking? This will set its status to cancelled in the database."
              confirmLabel="Cancel Booking"
              loading={cancelBookingMutation.isPending}
              onConfirm={() => cancelBookingMutation.mutate(bookingToCancelId)}
              onCancel={() => setBookingToCancelId(null)}
            />
          )}

          {selectedBookingId && (
            <BookingDetailsPanel
              bookingId={selectedBookingId}
              loading={loadingBookingDetails}
              bookingData={bookingDetailsData}
              canSchedule={canSchedule}
              onRefresh={() => refetchBookingDetails()}
            />
          )}
        </Card>
      )}

      {section === "staff" && isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Staff Management</CardTitle>
            <CardContent className="mb-0">Manager-only access for creating and toggling staff accounts.</CardContent>
          </CardHeader>

          <div className="grid md:grid-cols-5 gap-3 mb-4">
            <Input label="Full name" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
            <Input label="Username" value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)} />
            <Input label="Password" type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} />
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Role</label>
              <select className="select-input" value={staffRole} onChange={(e) => setStaffRole(e.target.value as "booking_agent" | "accountant" | "manager")}>
                <option value="booking_agent">booking_agent</option>
                <option value="accountant">accountant</option>
                <option value="manager">manager</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Branch</label>
              <select className="select-input" value={staffBranchId} onChange={(e) => setStaffBranchId(e.target.value)}>
                <option value="">None</option>
                {(branchesData?.branches || []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Button onClick={() => createStaff.mutate()} loading={createStaff.isPending}>Create Staff User</Button>

          <div className="space-y-2 mt-6">
            {(staffUsersData?.staff_users || []).map((u) => (
              <div key={u.id} className="dashboard-row">
                <div>
                  <div className="font-medium text-slate-100">{u.full_name} ({u.username})</div>
                  <div className="text-slate-400 text-xs mt-0.5">{u.role} · {u.is_active ? "active" : "inactive"}</div>
                </div>
                <Button
                  size="sm"
                  variant={u.is_active ? "danger" : "secondary"}
                  onClick={() => updateStaff.mutate({ id: u.id, is_active: !u.is_active })}
                  loading={updateStaff.isPending}
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6 grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Branches Management</h3>
              <Input label="Branch name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
              <Input label="Address" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} />
              <Input label="Phone" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Open time" type="time" value={branchOpen} onChange={(e) => setBranchOpen(e.target.value)} />
                <Input label="Close time" type="time" value={branchClose} onChange={(e) => setBranchClose(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={branchActive} onChange={(e) => setBranchActive(e.target.checked)} />
                Active
              </label>
              <div className="flex gap-2">
                <Button onClick={submitBranch} loading={createBranch.isPending || updateBranch.isPending}>
                  {editingBranchId ? "Update branch" : "Add branch"}
                </Button>
                {editingBranchId && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingBranchId(null);
                      setBranchName("");
                      setBranchAddress("");
                      setBranchPhone("");
                      setBranchOpen("");
                      setBranchClose("");
                      setBranchActive(true);
                    }}
                  >
                    Cancel edit
                  </Button>
                )}
              </div>
              <div className="max-h-60 overflow-auto space-y-2">
                {(branchesData?.branches || []).map((b) => (
                  <div key={b.id} className="dashboard-row">
                    <div>
                      <div className="font-medium text-slate-100">{b.name}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{b.address || "No address"} · {b.phone || "No phone"}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => beginEditBranch(b)}>
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Rooms Management</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 tracking-wide mb-1.5 uppercase">Branch</label>
                <select
                  className="select-input"
                  value={roomBranchId}
                  onChange={(e) => setRoomBranchId(e.target.value)}
                >
                  <option value="">Select branch</option>
                  {(branchesData?.branches || []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <Input label="Room name" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Capacity min" type="number" value={roomCapacityMin} onChange={(e) => setRoomCapacityMin(e.target.value)} />
                <Input label="Capacity max" type="number" value={roomCapacityMax} onChange={(e) => setRoomCapacityMax(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={roomActive} onChange={(e) => setRoomActive(e.target.checked)} />
                Active
              </label>
              <div className="flex gap-2">
                <Button onClick={submitRoom} loading={createRoom.isPending || updateRoom.isPending}>
                  {editingRoomId ? "Update room" : "Add room"}
                </Button>
                {editingRoomId && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingRoomId(null);
                      setRoomBranchId("");
                      setRoomName("");
                      setRoomCapacityMin("1");
                      setRoomCapacityMax("8");
                      setRoomActive(true);
                    }}
                  >
                    Cancel edit
                  </Button>
                )}
              </div>
              <div className="max-h-60 overflow-auto space-y-2">
                {(roomsData?.rooms || []).map((r) => (
                  <div key={r.id} className="dashboard-row">
                    <div>
                      <div className="font-medium text-slate-100">{r.name}</div>
                      <div className="text-slate-400 text-xs mt-0.5">Branch #{r.branch_id} · Capacity {r.capacity_min}–{r.capacity_max}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => beginEditRoom(r)}>
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
      {section === "settings" && isManager && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Us Settings</CardTitle>
            <CardContent className="mb-0">Edit the contact information displayed on the client-facing website.</CardContent>
          </CardHeader>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Input label="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+964 XXX XXX XXXX" />
            <Input label="Address" value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} placeholder="بغداد، العراق" />
            <Input label="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="info@escaperoomiraq.com" />
          </div>
          <Button onClick={() => updateContact.mutate()} loading={updateContact.isPending}>
            Save Contact Info
          </Button>
        </Card>
      )}
    </motion.div>
  );
}
