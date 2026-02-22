import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClassName: Record<BadgeVariant, string> = {
  default: "bg-surface-muted text-secondary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info"
};

export function Badge({
  className,
  variant = "default",
  ...props
}: Readonly<BadgeProps>): JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[--radius-button] px-2 py-1 text-xs font-medium",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}
