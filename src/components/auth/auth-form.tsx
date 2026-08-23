"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";
type Values = { fullName?: string; email: string; password: string };

/**
 * One component for both screens. Validation runs in the browser through the
 * same Zod schemas the API uses, and per-field messages returned by the server
 * are mapped straight back onto the matching inputs.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(mode === "signup" ? signupSchema : loginSchema),
    defaultValues: { fullName: "", email: "", password: "" },
    mode: "onBlur",
  });

  const { register, handleSubmit, setError, formState } = form;
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await apiFetch(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(values),
      });

      toast.success(mode === "signup" ? "Account created." : "Signed in.");
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        let matched = false;
        for (const [field, message] of Object.entries(error.failure.fieldErrors ?? {})) {
          if (field in values) {
            setError(field as keyof Values, { message });
            matched = true;
          }
        }
        if (!matched) setFormError(error.failure.message);
        return;
      }
      setFormError("Could not reach the server. Check your connection and try again.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {mode === "signup" && (
        <Field label="Full name" error={errors.fullName?.message} htmlFor="fullName">
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="Aditi Sharma"
            aria-invalid={!!errors.fullName}
            {...register("fullName")}
          />
        </Field>
      )}

      <Field label="Email" error={errors.email?.message} htmlFor="email">
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>

      <Field
        label="Password"
        error={errors.password?.message}
        htmlFor="password"
        hint={mode === "signup" ? "At least 8 characters, with a number and mixed case." : undefined}
      >
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="••••••••"
            className="pr-10"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {mode === "signup" ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <p
        className={cn(
          "text-xs",
          error ? "text-destructive" : "text-muted-foreground",
          !error && !hint && "hidden"
        )}
        role={error ? "alert" : undefined}
      >
        {error ?? hint}
      </p>
    </div>
  );
}
