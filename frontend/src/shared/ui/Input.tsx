import type { InputHTMLAttributes } from "react";

import { cn } from "../lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: Readonly<InputProps>): JSX.Element {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-(--radius-button) border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
