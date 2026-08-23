import { cn } from "@/lib/utils";

/**
 * Drawn as inline SVG rather than an image file so it stays crisp, themeable
 * and adds no network request.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg shadow-sm">
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none">
          <path
            d="M6 3.5h8.5L18 7v13.5H6z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M14 3.5V7h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="2.75" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10.3 15.4 9.5 18.6l2.5-1.3 2.5 1.3-.8-3.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight">Provisional Certificate</span>
        <span className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Office of the Registrar
        </span>
      </span>
    </span>
  );
}
