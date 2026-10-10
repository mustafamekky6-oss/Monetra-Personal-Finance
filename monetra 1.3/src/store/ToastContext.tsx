import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  toast(message: string, variant?: ToastVariant): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLE: Record<ToastVariant, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2 size={16} aria-hidden />, accent: 'text-income' },
  error: { icon: <XCircle size={16} aria-hidden />, accent: 'text-expense' },
  info: { icon: <Info size={16} aria-hidden />, accent: 'text-body' },
  warning: { icon: <TriangleAlert size={16} aria-hidden />, accent: 'text-warn' },
};

let nextToastId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextToastId++;
      setToasts((current) => [...current.slice(-3), { id, variant, message }]);
      timers.current[id] = setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  // Clear any pending timers when the provider unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const style = VARIANT_STYLE[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className="animate-rise pointer-events-auto flex items-start gap-3 rounded-(--radius-card) border border-lift/10 bg-card/95 p-4 backdrop-blur-xl"
            >
              <span className={`mt-0.5 shrink-0 ${style.accent}`}>{style.icon}</span>
              <p className="flex-1 text-sm leading-relaxed text-heading">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-1 text-muted transition-colors duration-200 hover:bg-lift/10 hover:text-heading"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
