import type { InputHTMLAttributes } from "react";

import { cn } from "../lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: Readonly<InputProps>): JSX.Element {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[var(--radius-button)] border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted shadow-soft transition-[border-color,box-shadow,background-color] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:bg-background disabled:opacity-80",
        className
      )}
      {...props}
    />
  );
}

