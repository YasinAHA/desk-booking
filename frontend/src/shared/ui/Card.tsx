import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;
type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;
type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export function Card({ className, ...props }: Readonly<CardProps>): JSX.Element {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: Readonly<CardProps>): JSX.Element {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: Readonly<CardTitleProps>): JSX.Element {
  return (
    <h3
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: Readonly<CardDescriptionProps>): JSX.Element {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: Readonly<CardProps>): JSX.Element {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: Readonly<CardProps>): JSX.Element {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
