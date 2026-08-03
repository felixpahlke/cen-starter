// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { ToastNotification, type ToastNotificationProps } from "@carbon/react";
import { useCallback, useEffect, useState } from "react";

type ToastKind = NonNullable<ToastNotificationProps["kind"]>;

type ToastOptions = {
  title?: string;
  caption?: string;
  duration?: number;
};

type Toast = {
  id: number;
  kind: ToastKind;
  title: string;
  message: string;
  caption: string;
  duration: number;
};

const DEFAULT_DURATION = 5000;
const EXIT_DURATION = 160;
const listeners = new Set<(toast: Toast) => void>();
let nextId = 0;

const defaultTitles: Record<ToastKind, string> = {
  error: "Error",
  info: "Information",
  "info-square": "Information",
  success: "Success",
  warning: "Warning",
  "warning-alt": "Warning",
};

function showToast(kind: ToastKind, message: string, options: ToastOptions = {}) {
  const notification: Toast = {
    id: nextId++,
    kind,
    title: options.title ?? defaultTitles[kind],
    message,
    caption:
      options.caption ??
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    duration: Math.max(0, options.duration ?? DEFAULT_DURATION),
  };

  for (const listener of listeners) listener(notification);
}

export const toast = {
  success: (message: string, options?: ToastOptions) => showToast("success", message, options),
  error: (message: string, options?: ToastOptions) => showToast("error", message, options),
  warning: (message: string, options?: ToastOptions) => showToast("warning", message, options),
  info: (message: string, options?: ToastOptions) => showToast("info", message, options),
};

export function Toaster() {
  const [notifications, setNotifications] = useState<Toast[]>([]);
  const remove = useCallback((id: number) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  useEffect(() => {
    const listener = (notification: Toast) => {
      setNotifications((current) => [notification, ...current]);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div className="cen-toast-stack">
      {notifications.map((notification) => (
        <ToastItem key={notification.id} notification={notification} onRemove={remove} />
      ))}
    </div>
  );
}

function ToastItem({
  notification,
  onRemove,
}: {
  notification: Toast;
  onRemove: (id: number) => void;
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!closing && notification.duration === 0) return;

    const timeout = window.setTimeout(
      () => (closing ? onRemove(notification.id) : setClosing(true)),
      closing ? EXIT_DURATION : notification.duration,
    );
    return () => window.clearTimeout(timeout);
  }, [closing, notification.duration, notification.id, onRemove]);

  return (
    <div className="cen-toast" data-closing={closing || undefined}>
      <div className="cen-toast__content">
        <ToastNotification
          aria-label="Close notification"
          caption={notification.caption}
          kind={notification.kind}
          onClose={() => {
            setClosing(true);
            return false;
          }}
          role={notification.kind === "error" ? "alert" : "status"}
          subtitle={notification.message}
          title={notification.title}
        />
      </div>
    </div>
  );
}
