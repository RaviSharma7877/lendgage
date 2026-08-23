import Link from "next/link";
import { FilePlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { SignOutButton } from "@/components/layout/user-menu";
import type { SessionUser } from "@/lib/auth/session";

export function SiteHeader({ user }: { user: SessionUser }) {
  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link href="/dashboard" className="shrink-0">
          <Logo />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
            <Link href="/apply">
              <FilePlus2 className="size-4" />
              New application
            </Link>
          </Button>

          <div className="flex items-center gap-2 pl-1">
            <span
              className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-xs font-semibold"
              title={user.email}
              aria-hidden="true"
            >
              {initials || "PC"}
            </span>
            <div className="hidden leading-tight md:block">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-muted-foreground text-xs">{user.email}</p>
            </div>
          </div>

          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
