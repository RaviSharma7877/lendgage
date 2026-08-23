import { Check } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type StepDefinition = { id: number; title: string; description: string };

export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: StepDefinition[];
  current: number;
  onSelect?: (step: number) => void;
}) {
  const percent = ((current - 1) / (steps.length - 1)) * 100;

  return (
    <div>
      {/* Compact indicator for phones. */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">{steps[current - 1]?.title}</p>
          <p className="text-muted-foreground text-xs">
            Step {current} of {steps.length}
          </p>
        </div>
        <Progress value={percent} className="mt-3" />
      </div>

      {/* Full stepper from sm upwards. */}
      <ol className="hidden items-center gap-3 sm:flex">
        {steps.map((step, index) => {
          const isComplete = step.id < current;
          const isCurrent = step.id === current;
          const clickable = Boolean(onSelect) && step.id < current;

          return (
            <li key={step.id} className="flex flex-1 items-center gap-3">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onSelect?.(step.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors",
                  clickable && "hover:bg-accent cursor-pointer",
                  !clickable && "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors",
                    isComplete && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary bg-primary/10",
                    !isComplete && !isCurrent && "text-muted-foreground border-border"
                  )}
                >
                  {isComplete ? <Check className="size-4" /> : step.id}
                </span>
                <span className="hidden lg:block">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      !isCurrent && !isComplete && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">{step.description}</span>
                </span>
              </button>

              {index < steps.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1 transition-colors",
                    step.id < current ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
