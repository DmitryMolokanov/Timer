import type { InitTimer } from "./types/Timer";

export interface TimerSettings {
  round: InitTimer;
  break: InitTimer;
}

export const MAX_MIN = 99;
export const SEC_STEP = 15;
export const MAX_SEC = 60 - SEC_STEP;

const STORAGE_KEY = "timer-settings";

const DEFAULT_SETTINGS: TimerSettings = {
  round: { min: 3, sec: 0 },
  break: { min: 1, sec: 0 },
};

// готовые режимы «минуты работы / минуты отдыха»
export const PRESETS: TimerSettings[] = [
  { round: { min: 3, sec: 0 }, break: { min: 1, sec: 0 } },
  { round: { min: 2, sec: 0 }, break: { min: 1, sec: 0 } },
];

export const toMs = ({ min, sec }: InitTimer) => (min * 60 + sec) * 1000;

export const isSameSettings = (a: TimerSettings, b: TimerSettings) =>
  toMs(a.round) === toMs(b.round) && toMs(a.break) === toMs(b.break);

const isValidTime = (value: unknown): value is InitTimer => {
  const t = value as InitTimer | null;
  return (
    !!t &&
    Number.isInteger(t.min) &&
    Number.isInteger(t.sec) &&
    t.min >= 0 &&
    t.min <= MAX_MIN &&
    t.sec >= 0 &&
    t.sec <= MAX_SEC &&
    toMs(t) > 0
  );
};

export function loadSettings(): TimerSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (isValidTime(saved?.round) && isValidTime(saved?.break)) {
      return { round: saved.round, break: saved.break };
    }
  } catch {
    // нет доступа к хранилищу или битые данные — берём значения по умолчанию
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: TimerSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // настройки просто не переживут перезапуск
  }
}
