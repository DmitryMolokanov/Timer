import { useEffect } from "react";

// не выключать экран, пока active; браузер снимает блокировку при сворачивании — запрашиваем заново
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let requesting = false;
    let disposed = false;

    const request = async () => {
      if (document.visibilityState !== "visible" || requesting) return;
      if (sentinel && !sentinel.released) return;
      requesting = true;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (disposed) lock.release().catch(() => {});
        else sentinel = lock;
      } catch (err) {
        // отказ возможен, например, в режиме энергосбережения
        console.warn(err);
      } finally {
        requesting = false;
      }
    };

    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", request);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
