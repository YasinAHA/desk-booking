import type { HTMLAttributes } from "react";

import { cn } from "@shared/lib/cn";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: Readonly<SkeletonProps>): JSX.Element {
  return (
    <div
      className={cn("animate-pulse rounded-[var(--radius-button)] bg-surface-muted", className)}
      {...props}
    />
  );
}

