import { describe, expect, it } from "vitest";
import {
  advance,
  BREAK_WARNING_MS,
  ROUND_WARNING_MS,
  soundEvents,
  type Durations,
  type TimerState,
} from "./timeline";

const T0 = 1_700_000_000_000;
const D: Durations = { roundMs: 180_000, breakMs: 60_000 };
const CYCLE = D.roundMs + D.breakMs;

const started = (d: Durations = D): TimerState => ({
  phase: "round",
  round: 1,
  running: true,
  endAt: T0 + d.roundMs,
  remainingMs: d.roundMs,
});

describe("advance", () => {
  it("не меняет фазу до её конца", () => {
    const s = started();
    expect(advance(s, s.endAt - 1, D)).toBe(s);
  });

  it("переключает раунд на отдых ровно в момент конца раунда", () => {
    const s = advance(started(), T0 + D.roundMs, D);
    expect(s).toMatchObject({ phase: "break", round: 1, endAt: T0 + CYCLE });
  });

  it("после отдыха начинается следующий раунд", () => {
    const s = advance(started(), T0 + CYCLE, D);
    expect(s).toMatchObject({ phase: "round", round: 2, endAt: T0 + CYCLE + D.roundMs });
  });

  it("проходит сразу несколько фаз, если приложение долго было в фоне", () => {
    const s = advance(started(), T0 + 5 * CYCLE + 1000, D);
    expect(s).toMatchObject({ phase: "round", round: 6, endAt: T0 + 5 * CYCLE + D.roundMs });
  });

  it("не накапливает ошибку: через 100 раундов границы фаз на своих местах", () => {
    let s = started();
    // идём тиками с неровным шагом, как настоящий таймер
    for (let t = T0; t < T0 + 100 * CYCLE; t += 173) s = advance(s, t, D);
    s = advance(s, T0 + 100 * CYCLE, D);
    expect(s).toMatchObject({ phase: "round", round: 101, endAt: T0 + 100 * CYCLE + D.roundMs });
  });

  it("на паузе ничего не делает", () => {
    const s = { ...started(), running: false };
    expect(advance(s, T0 + 10 * CYCLE, D)).toBe(s);
  });
});

describe("soundEvents", () => {
  it("даёт сигналы первого цикла 3/1 в нужные моменты", () => {
    expect(soundEvents(started(), D, T0, T0 + CYCLE)).toEqual([
      { name: "beep", at: T0 + D.roundMs - ROUND_WARNING_MS },
      { name: "bell", at: T0 + D.roundMs },
      { name: "knock", at: T0 + CYCLE - BREAK_WARNING_MS },
      { name: "bell", at: T0 + CYCLE },
    ]);
  });

  it("гонг звучит ровно в момент смены фазы", () => {
    const s = started();
    const bells = soundEvents(s, D, T0, T0 + 10 * CYCLE).filter((e) => e.name === "bell");
    expect(bells).toHaveLength(20);
    for (const { at } of bells) {
      expect(advance(s, at - 1, D).phase).not.toBe(advance(s, at, D).phase);
    }
  });

  it("предупреждения за 30 сек. до конца раунда и за 10 сек. до конца отдыха", () => {
    const s = started();
    for (const e of soundEvents(s, D, T0, T0 + 10 * CYCLE)) {
      if (e.name === "bell") continue;
      const phase = advance(s, e.at, D);
      expect(phase.phase).toBe(e.name === "beep" ? "round" : "break");
      expect(phase.endAt - e.at).toBe(e.name === "beep" ? ROUND_WARNING_MS : BREAK_WARNING_MS);
    }
  });

  it("интервал (from, to]: граница from не включается, to — включается", () => {
    const bellAt = T0 + D.roundMs;
    expect(soundEvents(started(), D, bellAt, bellAt + 1)).toEqual([]);
    expect(soundEvents(started(), D, bellAt - 1, bellAt)).toEqual([{ name: "bell", at: bellAt }]);
  });

  it("планирование кусками даёт те же сигналы, без пропусков и повторов", () => {
    const s = started();
    const whole = soundEvents(s, D, T0, T0 + 20 * CYCLE);
    const parts = [];
    // так планирует Timer: каждый следующий кусок начинается там, где кончился предыдущий
    for (let from = T0; from < T0 + 20 * CYCLE; from += 450_000) {
      const now = advance(s, from, D);
      parts.push(...soundEvents(now, D, from, Math.min(from + 450_000, T0 + 20 * CYCLE)));
    }
    expect(parts).toEqual(whole);
  });

  it("короткие фазы — без предупреждений", () => {
    const short = { roundMs: ROUND_WARNING_MS, breakMs: BREAK_WARNING_MS };
    const names = soundEvents(started(short), short, T0, T0 + 3 * (short.roundMs + short.breakMs)).map(
      (e) => e.name
    );
    expect(names.every((n) => n === "bell")).toBe(true);
  });
});
