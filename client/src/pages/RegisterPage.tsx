import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { authApi, getApiMessage } from "../api/endpoints";
import { useLocale } from "../context/LocaleContext";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const schema = z.object({
  full_name: z.string().min(1, "Name required").max(120),
  phone: z.string().min(1, "Phone required").regex(/^(\+964[0-9]{9,11}|07[0-9]{8,10}|\+[1-9][0-9]{8,14})$/, "Invalid phone"),
  password: z.string().min(8, "At least 8 characters"),
});

type Form = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: Form) => authApi.register(data),
    onSuccess: (data) => {
      toast.success(t("auth.createAccount") + " \u2713");
      // نمرر رقم الهاتف وكلمة السر حتى بعد التحقق يسجل دخول تلقائياً
      navigate("/verify-phone", { state: { phone: (data as { user?: { phone?: string } }).user?.phone, password: mutation.variables?.password } });
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[60vh] flex items-center justify-center"
    >
      <div className="w-full max-w-md">
        <Card>
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 mb-1.5">
              {t("auth.newPlayer")}
            </p>
            <CardTitle>{t("auth.createProfile")}</CardTitle>
            <CardContent className="mb-0">
              <p className="text-sm text-slate-300">
                {t("auth.createProfileDesc")}
              </p>
            </CardContent>
          </CardHeader>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <Input
              label={t("book.fullName")}
              placeholder="Ali Hassan"
              error={errors.full_name?.message}
              {...register("full_name")}
            />
            <Input
              label={t("profile.phone")}
              type="tel"
              placeholder="+964 770 000 0000"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" className="w-full" loading={mutation.isPending}>
              {t("auth.createAccount")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-300">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="text-rose-300 font-medium hover:text-rose-200">
              {t("auth.signIn")}
            </Link>
          </p>
        </Card>
      </div>
    </motion.div>
  );
}
