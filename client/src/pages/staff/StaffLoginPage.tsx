import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { adminApi, getApiMessage } from "../../api/endpoints";
import { useStaff, type Staff } from "../../context/StaffContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

const schema = z.object({
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
});

type Form = z.infer<typeof schema>;

export function StaffLoginPage() {
  const navigate = useNavigate();
  const { setStaffAuth } = useStaff();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: Form) => adminApi.login(data),
    onSuccess: (data) => {
      setStaffAuth(data.token, data.staff as Staff);
      toast.success("Welcome, " + data.staff.full_name);
      navigate("/staff", { replace: true });
    },
    onError: (err) => toast.error(getApiMessage(err)),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 mb-1.5">
              Staff only
            </p>
            <CardTitle>Staff dashboard login</CardTitle>
            <CardContent className="mb-0">
              <p className="text-sm text-slate-300">
                Sign in with your staff username to manage themes, schedules, and bookings.
              </p>
            </CardContent>
          </CardHeader>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <Input
              label="Username"
              autoComplete="username"
              error={errors.username?.message}
              {...register("username")}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" className="w-full" loading={mutation.isPending}>
              Sign in
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
