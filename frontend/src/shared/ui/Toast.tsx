import { useMemo, type ReactNode } from "react";

import { Toaster, toast } from "sonner";

import { ToastContext } from "./toast-context";

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: Readonly<ToastProviderProps>): JSX.Element {
  const contextValue = useMemo(
    () => ({
      pushToast: (message: string, variant: "success" | "error" | "info" = "info") => {
        if (variant === "success") {
          toast.success(message);
          return;
        }
        if (variant === "error") {
          toast.error(message);
          return;
        }
        toast(message);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        expand={false}
        visibleToasts={4}
        duration={3200}
        toastOptions={{
          classNames: {
            toast:
              "rounded-[var(--radius-button)] border border-border bg-surface text-foreground shadow-soft px-3 py-2",
            title: "font-sans text-sm font-medium leading-5",
            description: "font-sans text-xs text-muted",
            closeButton:
              "border-border bg-surface text-secondary hover:text-foreground"
          }
        }}
      />
    </ToastContext.Provider>
  );
}
