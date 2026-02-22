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
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }
  if (variant === "error") {
    return "border-red-300 bg-red-50 text-red-800";
  }
  return "border-blue-300 bg-blue-50 text-blue-800";
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
            className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-card ${getToastStyles(item.variant)}`}
          >
            {item.message}
          </output>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
