import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

type AlertVariant = "default" | "error" | "success" | "warning" | "info";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

const variantClassName: Record<AlertVariant, string> = {
  default: "border-border bg-surface-muted text-foreground",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info"
};

export function Alert({
  className,
  variant = "default",
  ...props
}: Readonly<AlertProps>): JSX.Element {
  return (
    <div
      role="status"
      className={cn(
        "rounded-[var(--radius-button)] border px-3 py-2 text-sm",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}
