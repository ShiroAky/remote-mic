import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle, Clock } from "lucide-react";

// --- TIPOS Y ESTADO GLOBAL ---
export type ToastType = "success" | "error" | "info" | "warning" | "loading";
export type ToastPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

let count = 0;
let toasts: ToastItem[] = [];
const listeners = new Set<(toasts: ToastItem[]) => void>();

const notify = () => listeners.forEach((l) => l([...toasts]));

/**
 * Función para disparar un toast desde cualquier lugar de la app.
 */
export const toast = (message: string, type: ToastType = "info", duration = 4000) => {
  const id = count++;
  toasts.push({ id, message, type, duration });
  notify();

  if (type !== "loading") {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, duration);
  }
};

// --- HOOK ---
function useToasts() {
  const [list, setList] = useState<ToastItem[]>(toasts);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return list;
}

export function removeToastGlobal(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

// --- COMPONENTE VISUAL ---
interface ToasterProps {
  position?: ToastPosition;
  allowManualClose?: boolean;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
  error: <AlertCircle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-indigo-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
  loading: <Clock className="h-5 w-5 text-zinc-400 animate-spin" />,
};

const positionClasses: Record<ToastPosition, string> = {
  "top-left": "top-4 left-4 items-start",
  "top-right": "top-4 right-4 items-end",
  "bottom-left": "bottom-4 left-4 items-start",
  "bottom-right": "bottom-4 right-4 items-end",
  "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
};

export function Toaster({ position = "bottom-right", allowManualClose = true }: ToasterProps) {
  const currentToasts = useToasts();

  const removeToast = (id: number) => {
    removeToastGlobal(id);
  };

  return (
    <div className={`fixed z-9999 flex flex-col gap-3 w-full max-w-sm pointer-events-none p-4 ${positionClasses[position]}`}>
      {currentToasts.map((t) => (
        <div
          key={t.id}
          className={`
            group pointer-events-auto relative flex flex-row w-full items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-2xl transition-all duration-300
            animate-in fade-in slide-in-from-bottom-2 bg-zinc-900/95 backdrop-blur-md
            ${t.type === "success" ? "border-emerald-500/30" : ""}
            ${t.type === "error" ? "border-red-500/30" : ""}
            ${t.type === "info" ? "border-indigo-500/30" : ""}
            ${t.type === "warning" ? "border-amber-500/30" : ""}
            ${t.type === "loading" ? "border-zinc-700" : ""}
          `}
        >
          {/* Indicador lateral de color */}
          <div className={`absolute left-0 top-0 h-full w-1 ${
            t.type === "success" ? "bg-emerald-500" : 
            t.type === "error" ? "bg-red-500" : 
            t.type === "info" ? "bg-indigo-500" : 
            t.type === "warning" ? "bg-amber-500" : "bg-zinc-500"
          }`} />

          <div className="flex flex-row gap-3 items-center flex-1 min-w-0">
            <div className="shrink-0 pt-0.5">{icons[t.type]}</div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 mb-0.5 uppercase tracking-wider">
                {t.type}
              </p>
              <p className="text-sm text-zinc-400 leading-tight wrap-break-word">
                {t.message}
              </p>
            </div>
          </div>

          {allowManualClose && (
            <button 
              onClick={() => removeToast(t.id)}
              className="ml-2 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors cursor-pointer"
              data-tauri-drag-region="false"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}