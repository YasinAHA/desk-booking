import type { ButtonHTMLAttributes } from "react";

import { cn } from "../lib/cn";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "ghost"
  | "accent"
  | "outline";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover active:bg-primary-active active:translate-y-[1px]",
  secondary:
    "bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary/80 active:translate-y-[1px]",
  destructive:
    "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 active:translate-y-[1px]",
  ghost:
    "border border-border bg-transparent text-foreground hover:bg-surface-muted active:translate-y-[1px]",
  accent:
    "bg-accent text-accent-foreground shadow-soft hover:bg-accent-hover active:bg-accent-active active:translate-y-[1px]",
  outline:
    "border border-input bg-background text-foreground shadow-soft hover:bg-accent hover:text-accent-foreground active:translate-y-[1px]"
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
        "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] px-4 text-sm font-semibold tracking-[0.01em] transition-[background-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}

