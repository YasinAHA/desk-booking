import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: Readonly<CardProps>): JSX.Element {
  return (
    <section
      className={cn(
        "rounded-[--radius-card] border border-border bg-surface p-4 shadow-card",
        className
      )}
      {...props}
    />
  );
}
