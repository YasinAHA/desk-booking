import {
  useCallback,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { ToastContext } from "./toast-context";

type ToastItem = {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
};
let toastSequence = 0;

function getToastStyles(variant: ToastItem["variant"]): string {
  if (variant === "success") {
    return "border-success-border bg-success-soft text-success";
  }
  if (variant === "error") {
    return "border-danger-border bg-danger-soft text-destructive";
  }
  return "border-info-border bg-info-soft text-info";
}

type ToastProviderProps = {
  children: ReactNode;
};

export function ToastProvider({ children }: Readonly<ToastProviderProps>): JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, variant: ToastItem["variant"] = "info") => {
      toastSequence += 1;
      const id = `toast-${toastSequence}`;
      setItems(current => [...current, { id, message, variant }]);
      globalThis.setTimeout(() => {
        removeToast(id);
      }, 3200);
    },
    [removeToast]
  );

  const contextValue = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 grid max-w-sm gap-2">
        {items.map(item => (
          <output
            key={item.id}
            aria-live="polite"
            className={`m-0 pointer-events-auto block rounded-[var(--radius-button)] border px-3 py-2 text-sm font-medium shadow-soft ${getToastStyles(item.variant)}`}
          >
            {item.message}
          </output>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

