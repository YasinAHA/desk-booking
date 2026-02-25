import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClassName: Record<BadgeVariant, string> = {
  default: "bg-surface-muted text-secondary border border-border",
  success: "border border-success-border bg-success-soft text-success",
  warning: "border border-warning-border bg-warning-soft text-warning",
  destructive: "border border-danger-border bg-danger-soft text-destructive",
  info: "border border-info-border bg-info-soft text-info"
};

export function Badge({
  className,
  variant = "default",
  ...props
}: Readonly<BadgeProps>): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-button)] px-2.5 py-1 text-xs font-semibold tracking-[0.01em]",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}

