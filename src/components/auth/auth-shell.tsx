import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Logo } from "@/components/layout/logo";

const HIGHLIGHTS = [
  "One account, all your applications",
  "Resume a part-filled form at any time",
  "Re-download your acknowledgement whenever you need it",
];

/**
 * Split layout shared by sign-in and sign-up: a brand panel that only appears
 * once there is room for it, and the form column, which is always full width
 * on a phone.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="pcp-grid-backdrop hidden flex-col justify-between border-r p-10 lg:flex">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>

        <div className="max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance">
            A single place to file and track your Provisional Certificate request.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-foreground text-xs">
          Office of the Registrar · Provisional Certificate Cell
        </p>
      </div>

      <div className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Link href="/" className="inline-block">
              <Logo />
            </Link>
          </div>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight lg:mt-0">{title}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="text-muted-foreground mt-6 text-sm">{footer}</div>
        </div>
      </div>
    </div>
  );
}
