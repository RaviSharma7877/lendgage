import Link from "next/link";
import { ArrowRight, FileCheck2, FileText, Lock, ShieldCheck, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { getSessionUser } from "@/lib/auth/session";

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <div className="pcp-grid-backdrop min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">
                Go to dashboard <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="grid items-center gap-12 py-12 md:py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge variant="info" className="mb-5 gap-1.5 px-2.5 py-1">
              <ShieldCheck className="size-3.5" />
              Verified applicant portal
            </Badge>
            <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl">
              Apply for your Provisional Certificate in three steps.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-xl text-[1.05rem] leading-relaxed">
              Fill in your registration details, upload your ID proof and degree certificate,
              and download a signed acknowledgement with your application reference number —
              usually in under five minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href={user ? "/apply" : "/signup"}>
                  {user ? "Start an application" : "Start your application"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href={user ? "/dashboard" : "/login"}>
                  {user ? "View my applications" : "I already have an account"}
                </Link>
              </Button>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 border-t pt-6">
              {[
                { value: "3 steps", label: "Guided form" },
                { value: "5 MB", label: "Per PDF upload" },
                { value: "Instant", label: "Acknowledgement" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xl font-semibold tracking-tight">{stat.value}</dt>
                  <dd className="text-muted-foreground mt-0.5 text-xs">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="bg-card rounded-2xl border p-6 shadow-lg shadow-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
                  Acknowledgement preview
                </span>
                <Badge variant="success" className="gap-1">
                  <FileCheck2 className="size-3" />
                  Completed
                </Badge>
              </div>
              <div className="bg-secondary/60 mt-5 rounded-lg border border-dashed p-5">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
                  Application reference number
                </p>
                <p className="text-primary mt-1.5 font-mono text-2xl font-semibold">
                  PC-2026-7QK4XM2B9F
                </p>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["Applicant", "Aditi Raghunath Sharma"],
                  ["Registration no.", "2019/CS/04871"],
                  ["Institution", "Government Institute of Technology"],
                  ["Documents", "ID proof · Degree certificate"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-6">
                    <dt className="text-muted-foreground text-xs">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="text-muted-foreground mt-6 flex items-center gap-2 border-t pt-4 text-xs">
                <Lock className="size-3.5" />
                Generated server-side · re-downloadable any time
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: FileText,
              title: "Multi-step form that remembers",
              body: "Move back and forward between steps without losing a single field — your progress is kept until you submit.",
            },
            {
              icon: UploadCloud,
              title: "Private document storage",
              body: "PDFs are validated, checksummed and stored outside the web root. Every download link is signed and expires in five minutes.",
            },
            {
              icon: FileCheck2,
              title: "Server-generated PDF",
              body: "Your acknowledgement is drawn on the server from the submitted record, so it always reflects exactly what you filed.",
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-card rounded-xl border p-5">
              <feature.icon className="text-primary size-5" />
              <h2 className="mt-4 font-semibold tracking-tight">{feature.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto max-w-6xl px-5 pb-10 text-xs">
        Provisional Certificate Cell · This is a demonstration portal built for a take-home task.
      </footer>
    </div>
  );
}
