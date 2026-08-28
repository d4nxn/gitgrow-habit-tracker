"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      let reloaded = false;
      const reloadAfterUpdate = () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", reloadAfterUpdate);
      navigator.serviceWorker.register("/sw.js").then(registration => registration.update()).catch(() => undefined);
      return () => navigator.serviceWorker.removeEventListener("controllerchange", reloadAfterUpdate);
    }
  }, []);

  return null;
}
