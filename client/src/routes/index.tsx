import { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { LocaleProvider } from "../context/LocaleContext";
import { StaffProvider } from "../context/StaffContext";
import { Layout } from "../components/Layout";
import { HomePage } from "../pages/HomePage";
import { ThemesPage } from "../pages/ThemesPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { VerifyPhonePage } from "../pages/VerifyPhonePage";
import { ProfilePage } from "../pages/ProfilePage";
import { BookPage } from "../pages/BookPage";
import { BookingConfirmPage } from "../pages/BookingConfirmPage";
import { BookingSummaryPage } from "../pages/BookingSummaryPage";

const StaffLayout = lazy(() => import("../components/StaffLayout").then((m) => ({ default: m.StaffLayout })));
const StaffLoginPage = lazy(() => import("../pages/staff/StaffLoginPage").then((m) => ({ default: m.StaffLoginPage })));
const StaffDashboardPage = lazy(() =>
  import("../pages/staff/StaffDashboardPage").then((m) => ({ default: m.StaffDashboardPage })),
);

function StaffLoader() {
  return <div className="min-h-screen flex items-center justify-center text-slate-300">Loading staff portal...</div>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <LocaleProvider>
        <AuthProvider>
          <Layout />
        </AuthProvider>
      </LocaleProvider>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: "themes", element: <ThemesPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "verify-phone", element: <VerifyPhonePage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "themes/:themeId", element: <BookPage /> },
      { path: "book", element: <Navigate to="/themes" replace /> },
      { path: "booking/confirm/:bookingId", element: <BookingConfirmPage /> },
      { path: "booking/summary/:bookingId", element: <BookingSummaryPage /> },
    ],
  },
  {
    path: "/staff",
    element: (
      <StaffProvider>
        <Suspense fallback={<StaffLoader />}>
          <StaffLayout />
        </Suspense>
      </StaffProvider>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<StaffLoader />}>
            <StaffDashboardPage />
          </Suspense>
        ),
      },
      {
        path: "login",
        element: (
          <Suspense fallback={<StaffLoader />}>
            <StaffLoginPage />
          </Suspense>
        ),
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function Routes() {
  return <RouterProvider router={router} />;
}
