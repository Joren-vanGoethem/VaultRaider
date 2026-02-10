import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 5000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const toast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  const showSuccess = useCallback(
    (title: string, message?: string, duration: number = 3000) => {
      showToast("success", title, message, duration);
    },
    [showToast],
  );

  const showError = useCallback(
    (title: string, message?: string, duration: number = 8000) => {
      showToast("error", title, message, duration);
    },
    [showToast],
  );

  const showWarning = useCallback(
    (title: string, message?: string, duration: number = 4000) => {
      showToast("warning", title, message, duration);
    },
    [showToast],
  );

  const showInfo = useCallback(
    (title: string, message?: string, duration: number = 3000) => {
      showToast("info", title, message, duration);
    },
    [showToast],
  );

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-green-600 text-white";
      case "error":
        return "bg-red-600 text-white";
      case "warning":
        return "bg-yellow-600 text-white";
      case "info":
        return "bg-blue-600 text-white";
    }
  };

  const getToastIcon = (type: ToastType) => {
    const iconClass = "w-5 h-5 shrink-0";
    switch (type) {
      case "success":
        return <CheckCircle className={iconClass} />;
      case "error":
        return <XCircle className={iconClass} />;
      case "warning":
        return <AlertCircle className={iconClass} />;
      case "info":
        return <Info className={iconClass} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-[90vw]">
        {toasts.map((toast) => (
          <button
            type="button"
            key={toast.id}
            className={`${getToastStyles(toast.type)} px-6 py-3 rounded-lg shadow-lg flex items-start gap-3 max-w-2xl pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-300`}
            onClick={() => removeToast(toast.id)}
          >
            {getToastIcon(toast.type)}
            <div className="flex-1 min-w-0">
              <div className="font-medium break-words">{toast.title}</div>
              {toast.message && (
                <div className="text-sm opacity-90 mt-1 break-words whitespace-pre-wrap">
                  {toast.message}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
