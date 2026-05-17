import { Bell, X } from "lucide-react";

export default function NotificationToasts({ toasts, removeToast }) {
  return (
    <div className="notification-toast-stack">
      {toasts.map((toast) => (
        <div className={`notification-toast ${toast.type}`} key={toast.id}>
          <Bell size={18} />

          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>

          <button onClick={() => removeToast(toast.id)}>
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}