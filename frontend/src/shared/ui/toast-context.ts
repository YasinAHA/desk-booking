import { createContext } from "react";

type ToastVariant = "success" | "error" | "info";

export type ToastContextValue = {
  pushToast: (message: string, variant?: ToastVariant) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
