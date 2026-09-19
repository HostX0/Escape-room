import { publicApi, userApi, staffApi, getApiMessage } from "./client";
import type { AxiosResponse } from "axios";

export type ApiResponse<T> = { success: true; data: T } | { success: false; message: string };

function unwrap<T>(res: AxiosResponse<{ success: boolean; data?: T; message?: string }>): T {
  const data = res.data;
  if (data.success && data.data !== undefined) return data.data as T;
  throw new Error((data as { message?: string }).message || "Request failed");
}

export const authApi = {
  register: (body: { full_name: string; phone: string; password: string }) =>
    publicApi.post("/auth/register", body).then((res) => unwrap<{ user: { phone?: string }; verification: { expires_at: string; code?: string } }>(res)),
  verifyPhone: (body: { phone: string; code: string }) =>
    publicApi.post("/auth/verify-phone", body).then((res) => unwrap<{ verified: boolean; message?: string }>(res)),
  login: (body: { phone: string; password: string }) =>
    publicApi.post("/auth/login", body).then((res) => unwrap<{ token: string; user: { id: number; full_name: string; phone: string; is_phone_verified: boolean } }>(res)),
};

export const adminApi = {
  login: (body: { username: string; password: string }) =>
    publicApi.post("/admin/login", body).then((res) => unwrap<{ token: string; staff: { id: number; full_name: string; username: string; role: string; branch_id: number | null } }>(res)),
};

export type ParticipantInput = { full_name: string; phone: string; is_primary: boolean };

export type Theme = { id: number; name: string; description?: string | null; image_url?: string | null; min_price_iqd?: number | null; slots_available_today?: number | string | null };
export type ThemeAvailability = {
  theme_id: number;
  date: string;
  duration_min: number;
  slots: Array<{ start_at: string; end_at: string; schedule_id: number | null; branch_name?: string | null }>;
};
export type CreatePublicBookingResult = {
  booking: {
    id: number;
    theme: Theme;
    branch_name?: string | null;
    start_at: string;
    end_at: string;
    amount_iqd: number;
    status: string;
  };
  payment: { id: number; amount_iqd: number; status: string; method: string };
};

export type ThemeRating = { id: number; rating: number; comment?: string | null; created_at: string; full_name: string };
export type ThemeRatingsResult = { theme_id: number; avg_rating: number | null; total_ratings: number; ratings: ThemeRating[] };
export type ThemeRatingSummary = { theme_id: number; avg_rating: number; total_ratings: number };
export type ContactInfo = { phone: string; address: string; email: string };

export const publicApiEndpoints = {
  themes: () => publicApi.get("/public/themes").then((res) => unwrap<{ themes: Theme[] }>(res)),
  themeAvailability: (themeId: number, date: string) =>
    publicApi.get(`/public/themes/${themeId}/availability`, { params: { date } }).then((res) => unwrap<ThemeAvailability>(res)),
  createBooking: (body: { theme_id: number; start_at: string; participants: ParticipantInput[]; notes?: string | null }) =>
    userApi.post("/public/bookings", body).then((res) => unwrap<CreatePublicBookingResult>(res)),
  confirmBooking: (id: number) =>
    userApi.post(`/public/bookings/${id}/confirm`).then((res) => unwrap<unknown>(res)),
  themeRatings: (themeId: number) =>
    publicApi.get(`/public/themes/${themeId}/ratings`).then((res) => unwrap<ThemeRatingsResult>(res)),
  themesRatingsSummary: () =>
    publicApi.get("/public/themes-ratings").then((res) => unwrap<{ ratings: ThemeRatingSummary[] }>(res)),
  submitRating: (body: { booking_id: number; rating: number; comment?: string | null }) =>
    userApi.post("/public/ratings", body).then((res) => unwrap<unknown>(res)),
  contactInfo: () =>
    publicApi.get("/public/contact-info").then((res) => unwrap<ContactInfo>(res)),
};

export const userProfileApi = {
  updateProfile: (body: { full_name: string; phone: string }) =>
    userApi.patch("/auth/profile", body).then((res) => unwrap<{ user: { id: number; full_name: string; phone: string; is_phone_verified: boolean } }>(res)),
};

export const customerBookingApi = {
  confirm: (id: number) => publicApiEndpoints.confirmBooking(id),
  myBookings: () =>
    userApi.get("/bookings/me/bookings").then((res) =>
      unwrap<{
        bookings: Array<{
          id: number;
          theme_name: string;
          start_at: string;
          end_at: string;
          status: string;
          fixed_price_iqd: number;
          payment_status?: string | null;
          paid_amount_iqd?: number | null;
        }>;
      }>(res),
    ),
  cancel: (id: number) => userApi.post(`/bookings/${id}/cancel`).then((res) => unwrap<unknown>(res)),
};

export const adminEndpoints = {
  themes: () =>
    staffApi
      .get("/admin/themes")
      .then((res) => unwrap<{ themes: Array<{ id: number; name: string; description?: string | null; image_url?: string | null; is_active: boolean }> }>(res)),
  createTheme: (body: { name: string; description?: string | null; is_active?: boolean }) =>
    staffApi.post("/admin/themes", body).then((res) => unwrap<{ id: number }>(res)),
  updateTheme: (id: number, body: { name?: string; description?: string | null; is_active?: boolean }) =>
    staffApi.patch(`/admin/themes/${id}`, body).then((res) => unwrap<{ id: number }>(res)),
  uploadThemeImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return staffApi.post(`/admin/themes/${id}/image`, formData, { headers: { "Content-Type": "multipart/form-data" } }).then((res) => unwrap<{ id: number; image_url: string }>(res));
  },
  branches: () =>
    staffApi.get("/admin/branches").then((res) =>
      unwrap<{
        branches: Array<{
          id: number;
          name: string;
          address?: string | null;
          phone?: string | null;
          open_time?: string | null;
          close_time?: string | null;
          is_active?: boolean;
        }>;
      }>(res),
    ),
  createBranch: (body: { name: string; address?: string | null; phone?: string | null; open_time?: string | null; close_time?: string | null; is_active?: boolean }) =>
    staffApi.post("/admin/branches", body).then((res) => unwrap<unknown>(res)),
  updateBranch: (id: number, body: { name?: string; address?: string | null; phone?: string | null; open_time?: string | null; close_time?: string | null; is_active?: boolean }) =>
    staffApi.patch(`/admin/branches/${id}`, body).then((res) => unwrap<unknown>(res)),
  schedules: (params: { date: string; branch_id?: number; room_id?: number; theme_id?: number }) =>
    staffApi.get("/admin/theme-schedules", { params }).then((res) =>
      unwrap<{
        schedules: Array<{
          id: number;
          room_id: number;
          room_name: string;
          branch_id: number;
          branch_name: string;
          theme_id: number;
          theme_name: string;
          start_at: string;
          end_at: string;
        }>;
      }>(res),
    ),
  createSchedule: (body: { room_id: number; theme_id: number; start_at: string; end_at: string }) =>
    staffApi.post("/admin/theme-schedules", body).then((res) => unwrap<{ id: number }>(res)),
  updateSchedule: (id: number, body: { room_id: number; theme_id: number; start_at: string; end_at: string }) =>
    staffApi.put(`/admin/theme-schedules/${id}`, body).then((res) => unwrap<{ id: number }>(res)),
  deleteSchedule: (id: number) => staffApi.delete(`/admin/theme-schedules/${id}`).then((res) => unwrap<{ deleted: boolean }>(res)),
  rooms: (branch_id?: number) =>
    staffApi
      .get("/admin/rooms", { params: branch_id ? { branch_id } : {} })
      .then((res) => unwrap<{ rooms: Array<{ id: number; name: string; branch_id: number; capacity_min: number; capacity_max: number; is_active?: boolean }> }>(res)),
  createRoom: (body: { branch_id: number; name: string; capacity_min?: number; capacity_max?: number; is_active?: boolean }) =>
    staffApi.post("/admin/rooms", body).then((res) => unwrap<unknown>(res)),
  updateRoom: (id: number, body: { branch_id?: number; name?: string; capacity_min?: number; capacity_max?: number; is_active?: boolean }) =>
    staffApi.patch(`/admin/rooms/${id}`, body).then((res) => unwrap<unknown>(res)),
  bookings: (params: { date?: string; status?: string; theme_id?: number }) =>
    staffApi
      .get("/admin/bookings", { params })
      .then((res) =>
        unwrap<{
          date: string | null;
          bookings: Array<{
            id: number;
            theme_id: number;
            theme_name: string;
            start_at: string;
            end_at: string;
            status: string;
            expected_amount_iqd: number;
            booker_name: string;
            booker_phone: string;
            participants_count: number;
            paid_amount_iqd: number;
            payment_status: string | null;
          }>;
        }>(res),
      ),
  bookingDetails: (id: number) =>
    staffApi
      .get(`/admin/bookings/${id}`)
      .then((res) =>
        unwrap<{
          booking: {
            id: number;
            theme_name: string;
            start_at: string;
            end_at: string;
            status: string;
            expected_amount_iqd: number;
            paid_amount_iqd: number;
            payment_status: string | null;
            payment_method: string | null;
            booker_name: string;
            booker_phone: string;
          };
          participants: Array<{ id: number; full_name: string; phone: string; is_primary: boolean }>;
        }>(res),
      ),
  confirmBooking: (id: number) => staffApi.post(`/admin/bookings/${id}/confirm`).then((res) => unwrap<unknown>(res)),
  arrive: (id: number) => staffApi.post(`/admin/bookings/${id}/arrive`).then((res) => unwrap<unknown>(res)),
  noShow: (id: number) => staffApi.post(`/admin/bookings/${id}/no-show`).then((res) => unwrap<unknown>(res)),
  complete: (id: number) => staffApi.post(`/admin/bookings/${id}/complete`).then((res) => unwrap<unknown>(res)),
  cancelBooking: (id: number) => staffApi.post(`/admin/bookings/${id}/cancel`).then((res) => unwrap<unknown>(res)),
  waiversGenerate: (id: number) =>
    staffApi.post(`/admin/bookings/${id}/generate-waivers`).then((res) => unwrap<{ booking_id: number; generated: unknown[]; skipped: unknown[] }>(res)),
  waiversList: (bookingId: number) =>
    staffApi.get(`/admin/bookings/${bookingId}/waivers`).then((res) =>
      unwrap<{
        waivers: Array<{
          id: number;
          booking_id: number;
          participant_id: number;
          pdf_path: string;
          generated_at: string;
          signed_at: string | null;
          full_name: string;
          phone: string;
          is_primary: boolean;
        }>;
      }>(res),
    ),
  signWaiver: (bookingId: number, waiverId: number, signatureBase64: string) =>
    staffApi.post(`/admin/bookings/${bookingId}/waivers/${waiverId}/sign`, { signature_base64: signatureBase64 }).then((res) => unwrap<unknown>(res)),
  downloadWaiver: (waiverId: number) =>
    staffApi.get(`/admin/waivers/${waiverId}/download`, { responseType: "blob" }).then((res) => res.data as Blob),
  markPaid: (bookingId: number, body: { method?: "cash" | "pos" | "other"; reference_no?: string | null }) =>
    staffApi.post(`/admin/payments/${bookingId}/mark-paid`, body).then((res) => unwrap<unknown>(res)),
  dailyReport: (date: string) =>
    staffApi.get("/admin/reports/daily", { params: { date } }).then((res) => unwrap<{ bookings_count: number; total_participants: number; total_revenue_iqd: number; total_paid_iqd: number; date: string }>(res)),
  staffUsers: () =>
    staffApi
      .get("/admin/staff-users")
      .then((res) => unwrap<{ staff_users: Array<{ id: number; full_name: string; username: string; role: "booking_agent" | "accountant" | "manager"; is_active: boolean; branch_id: number | null }> }>(res)),
  createStaffUser: (body: { full_name: string; username: string; password: string; role: "booking_agent" | "accountant" | "manager"; branch_id?: number | null }) =>
    staffApi.post("/admin/staff-users", body).then((res) => unwrap<unknown>(res)),
  updateStaffUser: (id: number, body: { full_name?: string; username?: string; password?: string; role?: "booking_agent" | "accountant" | "manager"; branch_id?: number | null; is_active?: boolean }) =>
    staffApi.patch(`/admin/staff-users/${id}`, body).then((res) => unwrap<unknown>(res)),
  getContactSettings: () =>
    staffApi.get("/admin/contact-settings").then((res) => unwrap<ContactInfo>(res)),
  updateContactSettings: (body: { phone: string; address: string; email: string }) =>
    staffApi.put("/admin/contact-settings", body).then((res) => unwrap<unknown>(res)),
};

export { getApiMessage };
