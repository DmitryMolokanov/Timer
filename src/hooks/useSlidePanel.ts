import { useCallback, useEffect, useRef, useState } from "react";

const SLIDE_MS = 320;
// насколько экран под панелью уезжает влево и темнеет при полном открытии
const SCREEN_SHIFT_PERCENT = 25;
const DIM_OPACITY = 0.35;
// жест начинается, когда палец ушёл по горизонтали дальше и заметно больше, чем по вертикали
const START_SLOP_PX = 10;
// быстрый взмах сам решает, открыть или закрыть, даже с короткого движения
const FLING_PX_PER_MS = 0.4;
const ANIMATING_CLASS = "slide-animating";

interface Drag {
  x: number;
  y: number;
  from: number;
  progress: number;
  active: boolean;
  lastX: number;
  lastT: number;
  velocity: number;
}

/**
 * Панель, выезжающая справа: открывается свайпом справа налево в любом месте экрана,
 * закрывается свайпом обратно, кнопкой или системным «Назад» (запись в истории браузера).
 */
export function useSlidePanel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  // содержимое панели живёт, пока она открыта, тянется пальцем или доезжает анимацией
  const [isMounted, setIsMounted] = useState(false);
  const openRef = useRef(false);
  const settleTimer = useRef<number | undefined>(undefined);

  // progress: 0 — панель закрыта, 1 — открыта
  const apply = useCallback((progress: number) => {
    if (panelRef.current) panelRef.current.style.transform = `translateX(${(1 - progress) * 100}%)`;
    if (screenRef.current) {
      screenRef.current.style.transform = progress ? `translateX(${-SCREEN_SHIFT_PERCENT * progress}%)` : "";
    }
    if (dimRef.current) dimRef.current.style.opacity = String(DIM_OPACITY * progress);
  }, []);

  const settle = useCallback(
    (open: boolean) => {
      openRef.current = open;
      setIsOpen(open);
      if (open) setIsMounted(true);
      const root = rootRef.current;
      root?.classList.add(ANIMATING_CLASS);
      apply(open ? 1 : 0);
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => {
        root?.classList.remove(ANIMATING_CLASS);
        if (!openRef.current) setIsMounted(false);
      }, SLIDE_MS);
    },
    [apply]
  );

  const open = useCallback(() => {
    if (openRef.current) return;
    history.pushState({ settings: true }, "");
    settle(true);
  }, [settle]);

  const close = useCallback(() => {
    if (!openRef.current) return;
    // закрываем сразу, а не по popstate: иначе второе нажатие ✕ до его прихода
    // вызвало бы ещё один history.back() и увело со страницы вместе с таймером
    settle(false);
    // свою запись из истории убираем сами; пришедший popstate панель уже не тронет
    if (history.state?.settings) history.back();
  }, [settle]);

  // системное «Назад» (Android) закрывает панель, а не приложение
  useEffect(() => {
    if (history.state?.settings) history.replaceState(null, "");
    const onPopState = () => {
      if (openRef.current) settle(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [settle]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // жест
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let drag: Drag | null = null;
    let suppressClickUntil = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      const from = openRef.current ? 1 : 0;
      drag = { x: e.clientX, y: e.clientY, from, progress: from, active: false, lastX: e.clientX, lastT: e.timeStamp, velocity: 0 };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag || !e.isPrimary) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.active) {
        if (Math.abs(dy) > START_SLOP_PX && Math.abs(dy) > Math.abs(dx)) {
          drag = null; // вертикальная прокрутка
          return;
        }
        if (Math.abs(dx) < START_SLOP_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        // закрытую панель тянут только влево, открытую — только вправо
        if ((drag.from === 0 && dx > 0) || (drag.from === 1 && dx < 0)) {
          drag = null;
          return;
        }
        drag.active = true;
        window.clearTimeout(settleTimer.current);
        root.classList.remove(ANIMATING_CLASS);
        setIsMounted(true);
      }
      drag.velocity = (e.clientX - drag.lastX) / Math.max(1, e.timeStamp - drag.lastT);
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
      drag.progress = Math.min(1, Math.max(0, drag.from - dx / root.clientWidth));
      apply(drag.progress);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!drag || !e.isPrimary) return;
      const { active, from, progress } = drag;
      // палец остановился перед отрывом — это не взмах
      const velocity = e.timeStamp - drag.lastT > 100 ? 0 : drag.velocity;
      drag = null;
      if (!active) return;

      suppressClickUntil = e.timeStamp + 300;
      const shouldOpen =
        Math.abs(velocity) > FLING_PX_PER_MS ? velocity < 0 : from === 1 ? progress > 2 / 3 : progress > 1 / 3;
      if (shouldOpen === openRef.current) settle(shouldOpen); // вернуть на место
      else if (shouldOpen) open();
      else close();
    };

    // клик, который может прийти сразу после перетаскивания, — не нажатие кнопки под пальцем
    const onClickCapture = (e: MouseEvent) => {
      if (e.timeStamp < suppressClickUntil) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    root.addEventListener("click", onClickCapture, true);
    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      root.removeEventListener("click", onClickCapture, true);
    };
  }, [apply, settle, open, close]);

  return { rootRef, screenRef, dimRef, panelRef, isOpen, isMounted, open, close };
}
