"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CloseIcon, ErrorIcon, InfoIcon, SuccessIcon } from "./icons";
import { cx } from "./primitives";
import styles from "./ui.module.css";

type ToastKind = "success" | "error" | "info";

type Toast = { id: number; kind: ToastKind; title: string; text?: string };

type ToastApi = (toast: Omit<Toast, "id">) => void;

const ToastContext = createContext<ToastApi>(() => undefined);

const DURATION_MS = 5000;

const ICON = { success: SuccessIcon, error: ErrorIcon, info: InfoIcon };

const KIND_CLASS: Record<ToastKind, string | undefined> = {
  success: styles.toastSuccess,
  error: styles.toastError,
  info: styles.toastInfo,
};

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback<ToastApi>(
    (toast) => {
      const id = ++nextId.current;
      setToasts((all) => [...all.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.kind === "error" ? DURATION_MS * 2 : DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.toasts} role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICON[toast.kind];
          return (
            <div key={toast.id} className={cx(styles.toast, KIND_CLASS[toast.kind])} role="status">
              <Icon className={styles.toastIcon} aria-hidden />
              <div className={styles.toastBody}>
                <div className={styles.toastTitle}>{toast.title}</div>
                {toast.text ? <div className={styles.toastText}>{toast.text}</div> : null}
              </div>
              <button type="button" className={styles.toastClose} onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                <CloseIcon aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
