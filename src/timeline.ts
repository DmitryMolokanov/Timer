import type { SoundName } from "./audio";

export type Phase = "round" | "break";

export interface TimerState {
  phase: Phase;
  round: number;
  running: boolean;
  // пока таймер идёт — момент конца текущей фазы (Date.now())
  endAt: number;
  // на паузе — сколько осталось
  remainingMs: number;
}

export interface Durations {
  roundMs: number;
  breakMs: number;
}

export const TICK_MS = 200;
// на сколько вперёд планировать звуки: при свёрнутом приложении браузер редко будит JS
export const SOUND_HORIZON_MS = 15 * 60 * 1000;
// до конца раунда 30 сек.
export const ROUND_WARNING_MS = 30_000;
// до начала раунда 10 сек.
export const BREAK_WARNING_MS = 10_000;

export const phaseDuration = (phase: Phase, d: Durations) =>
  phase === "round" ? d.roundMs : d.breakMs;

// крупный отсчёт секунд в кольце: последние 30 сек. фазы, а короткий перерыв (до минуты) — целиком
const COUNTDOWN_MS = 30_000;
const SHORT_BREAK_MS = 60_000;

export function countdownWindow(phase: Phase, d: Durations) {
  const duration = phaseDuration(phase, d);
  if (phase === "break" && duration <= SHORT_BREAK_MS) return duration;
  return Math.min(COUNTDOWN_MS, duration);
}

export const initialState = (d: Durations): TimerState => ({
  phase: "round",
  round: 1,
  running: false,
  endAt: 0,
  remainingMs: d.roundMs,
});

// переводит идущий таймер в фазу на момент now: пока приложение было в фоне, могло пройти несколько фаз
export function advance(state: TimerState, now: number, d: Durations): TimerState {
  if (!state.running || now < state.endAt) return state;
  let { phase, round, endAt } = state;
  while (now >= endAt) {
    if (phase === "round") {
      phase = "break";
    } else {
      phase = "round";
      round++;
    }
    endAt += phaseDuration(phase, d);
  }
  return { ...state, phase, round, endAt };
}

// сигналы идущего таймера в интервале (from, to]
export function soundEvents(state: TimerState, d: Durations, from: number, to: number) {
  const events: { name: SoundName; at: number }[] = [];
  let { phase, endAt } = state;
  while (endAt - phaseDuration(phase, d) <= to) {
    const duration = phaseDuration(phase, d);
    if (phase === "round" && duration > ROUND_WARNING_MS) {
      events.push({ name: "beep", at: endAt - ROUND_WARNING_MS });
    }
    if (phase === "break" && duration > BREAK_WARNING_MS) {
      events.push({ name: "knock", at: endAt - BREAK_WARNING_MS });
    }
    // гонг на смену раунда и отдыха
    events.push({ name: "bell", at: endAt });
    phase = phase === "round" ? "break" : "round";
    endAt += phaseDuration(phase, d);
  }
  return events.filter((e) => e.at > from && e.at <= to);
}
