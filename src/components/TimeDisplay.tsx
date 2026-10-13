import { useLayoutEffect, useRef, type FC } from "react";

const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const FADE: KeyframeAnimationOptions = { duration: 420, easing: "cubic-bezier(.2, .8, .2, 1)" };
const VISIBLE = { opacity: 1, filter: "blur(0)" };
const BLURRED = { opacity: 0, filter: "blur(8px)" };

const pad = (n: number) => n.toString().padStart(2, "0");

interface FadingNumberProps {
  value: string;
  animate: boolean;
  className?: string;
}

// старое значение растворяется, новое проявляется; цифры живут вне React, чтобы уходящая успела доиграть
const FadingNumber: FC<FadingNumberProps> = ({ value, animate, className }) => {
  const boxRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const children = [...box.children] as HTMLElement[];
    if (children.at(-1)?.textContent === value) return;

    // цифры меняются раз в секунду, а уход длится 420 мс: всё, что ещё «уходит», — остатки
    // анимаций, которые браузер не доиграл (например, пока страница не отрисовывалась)
    const current = children.filter((el) => {
      if (!el.dataset.leaving) return true;
      el.remove();
      return false;
    });

    const next = document.createElement("span");
    next.textContent = value;
    box.appendChild(next);

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduceMotion || document.hidden || current.length === 0) {
      current.forEach((el) => el.remove());
      return;
    }
    for (const el of current) {
      el.dataset.leaving = "true";
      el.animate([VISIBLE, BLURRED], FADE).onfinish = () => el.remove();
    }
    next.animate([BLURRED, VISIBLE], FADE);
  }, [value, animate]);

  return <span ref={boxRef} className={className} />;
};

interface TimeDisplayProps {
  remainingMs: number;
  // сколько последних миллисекунд фазы показывать крупными секундами в кольце
  countdownMs: number;
}

const TimeDisplay: FC<TimeDisplayProps> = ({ remainingMs, countdownMs }) => {
  const totalSec = Math.ceil(remainingMs / 1000);
  const isCountdown = remainingMs <= countdownMs;
  const progress = isCountdown ? remainingMs / countdownMs : 1;

  return (
    <div className={isCountdown ? "clock clock--countdown" : "clock"}>
      <svg className="clock__ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="clock__ring-track" cx="50" cy="50" r={RING_RADIUS} />
        <circle
          className="clock__ring-arc"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - progress)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className="clock__min">{pad(Math.floor(totalSec / 60))}</span>
      <span className="clock__colon">:</span>
      <FadingNumber
        className="clock__sec"
        value={isCountdown ? String(totalSec) : pad(totalSec % 60)}
        animate={isCountdown}
      />
    </div>
  );
};

export default TimeDisplay;
