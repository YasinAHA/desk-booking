import type { OutputHTMLAttributes } from "react";

import { cn } from "../lib/cn";

type AlertVariant = "default" | "error" | "success" | "warning" | "info";

type AlertProps = OutputHTMLAttributes<HTMLOutputElement> & {
  variant?: AlertVariant;
};

const variantClassName: Record<AlertVariant, string> = {
  default: "border-border bg-surface-muted text-foreground",
  error: "border-danger-border bg-danger-soft text-destructive",
  success: "border-success-border bg-success-soft text-success",
  warning: "border-warning-border bg-warning-soft text-warning",
  info: "border-info-border bg-info-soft text-info"
};

export function Alert({
  className,
  variant = "default",
  ...props
}: Readonly<AlertProps>): JSX.Element {
  return (
    <output
      aria-live="polite"
      className={cn(
        "rounded-[var(--radius-button)] border px-3 py-2 text-sm shadow-soft",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}

