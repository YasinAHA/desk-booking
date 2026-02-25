import type { ButtonHTMLAttributes } from "react";

import { cn } from "../lib/cn";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover active:bg-primary-active active:translate-y-[1px]",
  secondary:
    "border border-border bg-surface text-foreground shadow-soft hover:bg-surface-muted active:translate-y-[1px]",
  destructive:
    "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 active:translate-y-[1px]",
  ghost:
    "border border-border bg-transparent text-foreground hover:bg-surface-muted active:translate-y-[1px]"
};

export function Button({
  className,
  type = "button",
  variant = "primary",
  ...props
}: Readonly<ButtonProps>): JSX.Element {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-[var(--radius-button)] px-4 text-sm font-semibold tracking-[0.01em] transition-[background-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}

