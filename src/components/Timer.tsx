import { useCallback, useEffect, useRef, useState, type FC } from "react";
import type { InitTimer } from "../types/Timer";
import { sounds } from "../audio";
import { useWakeLock } from "../hooks/useWakeLock";
import { toMs } from "../settings";
import {
  advance,
  initialState,
  phaseDuration,
  soundEvents,
  ROUND_WARNING_MS,
  SOUND_HORIZON_MS,
  TICK_MS,
  type TimerState,
} from "../timeline";

const pad = (n: number) => n.toString().padStart(2, "0");

interface TimerProps {
  initTimer: InitTimer;
  initBreakTimer: InitTimer;
  hidden?: boolean;
}

const Timer: FC<TimerProps> = ({ initTimer, initBreakTimer, hidden }) => {
  const roundMs = toMs(initTimer);
  const breakMs = toMs(initBreakTimer);

  const [state, setState] = useState<TimerState>(() =>
    initialState({ roundMs, breakMs })
  );
  const [now, setNow] = useState(() => Date.now());

  const stateRef = useRef(state);
  const scheduledUntil = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useWakeLock(state.running);

  useEffect(() => {
    sounds.preload();
    return () => sounds.cancelPending();
  }, []);

  const scheduleSounds = useCallback(
    (s: TimerState, from: number) => {
      const to = Date.now() + SOUND_HORIZON_MS;
      for (const e of soundEvents(s, { roundMs, breakMs }, from, to)) {
        sounds.playAt(e.name, e.at);
      }
      scheduledUntil.current = to;
    },
    [roundMs, breakMs]
  );

  useEffect(() => {
    if (!state.running) return;

    const sync = () => {
      const t = Date.now();
      const s = advance(stateRef.current, t, { roundMs, breakMs });
      setNow(t);
      setState(s);
      if (scheduledUntil.current - t < SOUND_HORIZON_MS / 2) {
        scheduleSounds(s, scheduledUntil.current);
      }
    };

    // после возврата в приложение часы AudioContext могли стоять (iOS) — планируем звуки заново
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const t = Date.now();
      sounds.resume();
      sounds.cancelPending();
      scheduleSounds(advance(stateRef.current, t, { roundMs, breakMs }), t);
      sync();
    };

    const id = setInterval(sync, TICK_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [state.running, roundMs, breakMs, scheduleSounds]);

  const toggleTimer = () => {
    const t = Date.now();
    if (state.running) {
      const s = advance(state, t, { roundMs, breakMs });
      sounds.cancelPending();
      setState({ ...s, running: false, remainingMs: Math.max(0, s.endAt - t) });
      return;
    }

    sounds.unlock();
    const s = { ...state, running: true, endAt: t + state.remainingMs };
    // гонг, если раунд начинается с начала
    if (state.phase === "round" && state.remainingMs === roundMs) {
      sounds.playAt("bell", t);
    }
    scheduleSounds(s, t);
    setNow(t);
    setState(s);
  };

  const resetTimer = () => {
    sounds.cancelPending();
    setState(initialState({ roundMs, breakMs }));
  };

  const duration = phaseDuration(state.phase, { roundMs, breakMs });
  const remainingMs = state.running
    ? Math.min(duration, Math.max(0, state.endAt - now))
    : state.remainingMs;
  const totalSec = Math.ceil(remainingMs / 1000);
  const isBreak = state.phase === "break";
  const isTimeRunningOut =
    state.running && !isBreak && remainingMs <= ROUND_WARNING_MS;

  const className = [
    "content",
    state.running && "content-start",
    isBreak && "content-break",
    isTimeRunningOut && "content-time-is-running-out",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} hidden={hidden}>
      <div className="timer">
        <div className="timer__round-container">
          <span>Round</span>
          <span>{state.round}</span>
        </div>
        <div className="timer__timer-container">
          <span>
            {pad(Math.floor(totalSec / 60))} : {pad(totalSec % 60)}
          </span>
        </div>
      </div>
      <div className="group-btn">
        <button onClick={resetTimer}>Reset</button>
        <button onClick={toggleTimer}>{state.running ? "Pause" : "Start"}</button>
      </div>
    </div>
  );
};

export default Timer;
