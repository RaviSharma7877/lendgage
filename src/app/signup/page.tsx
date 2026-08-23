import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="You will need it to track your application and re-download your acknowledgement."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
