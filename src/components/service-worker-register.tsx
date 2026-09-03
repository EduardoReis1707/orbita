"use client";

import { useEffect } from "react";

/** Registra o service worker em produção para tornar o app instalável (PWA). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registro do SW é best-effort
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
