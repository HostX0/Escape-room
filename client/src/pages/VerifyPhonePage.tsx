import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { authApi, getApiMessage } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const schema = z.object({
  phone: z.string().min(1, "Phone required"),
  code: z.string().min(1, "Code required").max(10),
});

type Form = z.infer<typeof schema>;

export function VerifyPhonePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const { t } = useLocale();
  const state = location.state as { phone?: string; password?: string } | null;
  const statePhone = state?.phone ?? "";
  const statePassword = state?.password ?? "";

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { phone: statePhone },
  });

  // بعد التحقق بنجاح، سجل دخول تلقائياً إذا عندنا كلمة السر
  const loginMutation = useMutation({
    mutationFn: (body: { phone: string; password: string }) => authApi.login(body),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success(t("auth.welcomeBack"));
      navigate("/", { replace: true });
    },
    onError: () => {
      // لو فشل تسجيل الدخول التلقائي، وجّه لصفحة الدخول عادي
      navigate("/login", { replace: true });
    },
  });

  const mutation = useMutation({
    mutationFn: (data: Form) => authApi.verifyPhone(data),
    onSuccess: (_data, variables) => {
      // احذف رسالة الـ OTP من الشاشة بعد اكمال التحقق
      const otpToastId = sessionStorage.getItem("otp_toast_id");
      if (otpToastId) { toast.dismiss(otpToastId); sessionStorage.removeItem("otp_toast_id"); }
      toast.success(t("auth.verifyTitle") + " \u2713");
      if (statePassword) {
        // تسجيل دخول تلقائي بعد التحقق مباشرة
        loginMutation.mutate({ phone: variables.phone, password: statePassword });
      } else {
        navigate("/login", { replace: true });
      }
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  const isLoading = mutation.isPending || loginMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto"
    >
      <Card>
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <CardHeader>
          <CardTitle>{t("auth.verifyTitle")}</CardTitle>
          <CardContent className="mb-0">
            <p className="text-sm text-slate-300">{t("auth.verifyDesc")}</p>
          </CardContent>
        </CardHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <Input
            label={t("profile.phone")}
            type="tel"
            placeholder="+9647700000000"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            label="Code"
            placeholder="123456"
            error={errors.code?.message}
            {...register("code")}
          />
          <Button type="submit" className="w-full" loading={isLoading}>
            {t("auth.verify")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-300">
          <Link to="/login" className="text-violet-300 font-medium">{t("auth.backToLogin")}</Link>
        </p>
      </Card>
    </motion.div>
  );
}
