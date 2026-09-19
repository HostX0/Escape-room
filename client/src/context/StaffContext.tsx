import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Staff = {
  id: number;
  full_name: string;
  username: string;
  role: "booking_agent" | "accountant" | "manager";
  branch_id: number | null;
};

const TOKEN_KEY = "staff_token";
const STAFF_KEY = "staff_data";

function loadStored(): { token: string | null; staff: Staff | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(STAFF_KEY);
    const staff = raw ? (JSON.parse(raw) as Staff) : null;
    return { token: token || null, staff };
  } catch {
    return { token: null, staff: null };
  }
}

type StaffState = {
  token: string | null;
  staff: Staff | null;
  isAuthenticated: boolean;
};

type StaffContextValue = StaffState & {
  setStaffAuth: (token: string, staff: Staff) => void;
  logout: () => void;
  hasRole: (...roles: Staff["role"][]) => boolean;
};

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StaffState>(() => {
    const { token, staff } = loadStored();
    return {
      token,
      staff,
      isAuthenticated: Boolean(token && staff),
    };
  });

  const setStaffAuth = useCallback((token: string, staff: Staff) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
    setState({ token, staff, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STAFF_KEY);
    setState({ token: null, staff: null, isAuthenticated: false });
  }, []);

  const hasRole = useCallback(
    (...roles: Staff["role"][]) => {
      const r = state.staff?.role;
      return r ? roles.includes(r) : false;
    },
    [state.staff?.role]
  );

  const value = useMemo<StaffContextValue>(
    () => ({ ...state, setStaffAuth, logout, hasRole }),
    [state, setStaffAuth, logout, hasRole]
  );

  return (
    <StaffContext.Provider value={value}>{children}</StaffContext.Provider>
  );
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used within StaffProvider");
  return ctx;
}
