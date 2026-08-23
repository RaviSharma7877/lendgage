import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { ApplyWizard } from "@/components/apply/apply-wizard";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New application" };

export default async function ApplyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/apply");

  // Pre-filling from the session saves the applicant retyping what we know.
  return <ApplyWizard defaults={{ fullName: user.fullName, email: user.email }} />;
}
