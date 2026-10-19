// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sounds } from "../audio";
import { TICK_SLACK_MS } from "../timeline";
import Timer from "./Timer";

vi.mock("../audio", () => ({
  sounds: {
    preload: vi.fn(),
    unlock: vi.fn(),
    resume: vi.fn(),
    playAt: vi.fn(),
    cancelPending: vi.fn(),
    resync: vi.fn(),
  },
}));

const T0 = 1_700_000_000_000;
const ROUND_MS = 180_000;
const BREAK_MS = 60_000;
const CYCLE = ROUND_MS + BREAK_MS;

// что должен показывать таймер 3/1, запущенный в T0, в момент t
function expected(t: number) {
  const inCycle = (t - T0) % CYCLE;
  const round = Math.floor((t - T0) / CYCLE) + 1;
  const isBreak = inCycle >= ROUND_MS;
  const remaining = isBreak ? CYCLE - inCycle : ROUND_MS - inCycle;
  return { round, isBreak, sec: Math.ceil(remaining / 1000) };
}

// что таймер показывает: в последние секунды фазы крупные секунды в кольце, иначе мм:сс
function shown() {
  const clock = document.querySelector(".clock")!;
  const sec = Number(clock.querySelector(".clock__sec")!.textContent);
  const min = Number(clock.querySelector(".clock__min")!.textContent);
  return {
    round: Number(document.querySelector(".timer__round-container span:last-child")!.textContent),
    isBreak: document.querySelector(".content-break") !== null,
    sec: clock.classList.contains("clock--countdown") ? sec : min * 60 + sec,
  };
}

const at = (t: number) => act(() => vi.advanceTimersByTime(t - Date.now()));
const press = (label: string) => fireEvent.click(screen.getByText(label));
const playAt = vi.mocked(sounds.playAt);
const scheduled = (name: string) =>
  playAt.mock.calls.filter(([n]) => n === name).map(([, when]) => when);

beforeEach(() => {
  vi.useFakeTimers({ now: T0 });
  // без анимации цифр: в jsdom нет element.animate
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  render(<Timer initTimer={{ min: 3, sec: 0 }} initBreakTimer={{ min: 1, sec: 0 }} />);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Timer", () => {
  it("до старта показывает полный раунд", () => {
    expect(shown()).toEqual({ round: 1, isBreak: false, sec: 180 });
    expect(screen.getByText("Start")).toBeTruthy();
  });

  it("секунды меняются точно вовремя два полных цикла подряд", () => {
    press("Start");
    for (let s = 1; s <= 2 * CYCLE / 1000; s++) {
      const boundary = T0 + s * 1000;
      // за миллисекунду до смены секунды — ещё старое значение
      at(boundary - 1);
      expect(shown(), `за 1 мс до ${s} с`).toEqual(expected(boundary - 1));
      // не позже TICK_SLACK_MS после смены — уже новое
      at(boundary + TICK_SLACK_MS);
      expect(shown(), `${s} с`).toEqual(expected(boundary));
    }
  });

  it("после паузы посреди секунды цифры тоже меняются вовремя", () => {
    press("Start");
    at(T0 + 10_300);
    press("Pause");
    at(T0 + 15_000);
    press("Start");
    // с учётом паузы таймер будто бы стартовал на 4,7 сек. позже
    const shift = 4_700;
    for (let s = 11; s <= CYCLE / 1000 + 11; s++) {
      const boundary = T0 + shift + s * 1000;
      at(boundary - 1);
      expect(shown(), `за 1 мс до ${s} с`).toEqual(expected(boundary - shift - 1));
      at(boundary + TICK_SLACK_MS);
      expect(shown(), `${s} с`).toEqual(expected(boundary - shift));
    }
  });

  it("сигналы назначены на нужные моменты 3/1", () => {
    press("Start");
    expect(scheduled("bell").slice(0, 4)).toEqual([T0, T0 + ROUND_MS, T0 + CYCLE, T0 + CYCLE + ROUND_MS]);
    expect(scheduled("beep").slice(0, 2)).toEqual([T0 + ROUND_MS - 30_000, T0 + CYCLE + ROUND_MS - 30_000]);
    expect(scheduled("knock").slice(0, 2)).toEqual([T0 + CYCLE - 10_000, T0 + 2 * CYCLE - 10_000]);
  });

  it("гонг звучит в тот же момент, когда на экране меняется фаза", () => {
    press("Start");
    const bells = scheduled("bell").filter((t) => t > T0 && t <= T0 + 2 * CYCLE);
    expect(bells).toHaveLength(4);
    for (const bell of bells) {
      at(bell - 1);
      const before = shown().isBreak;
      at(bell + TICK_SLACK_MS);
      expect(shown().isBreak).not.toBe(before);
    }
  });

  it("звуки планируются наперёд без пропусков и повторов", () => {
    press("Start");
    at(T0 + 3 * 3600_000);
    const bells = scheduled("bell");
    // гонг на старте + две смены фазы на каждый цикл
    const expectedBells = [T0];
    for (let t = T0 + ROUND_MS; t <= bells.at(-1)!; t += CYCLE) expectedBells.push(t, t + BREAK_MS);
    expect(bells).toEqual(expectedBells.slice(0, bells.length));
    expect(bells.at(-1)!).toBeGreaterThan(Date.now());
    expect(sounds.resync).toHaveBeenCalled();
  });

  it("пауза останавливает время, продолжение — с того же места", () => {
    press("Start");
    at(T0 + 10_300);
    press("Pause");
    expect(sounds.cancelPending).toHaveBeenCalled();
    expect(shown().sec).toBe(170);

    at(T0 + 70_300);
    expect(shown().sec).toBe(170);

    playAt.mockClear();
    const resumedAt = Date.now();
    press("Start");
    // гонг только при старте раунда с начала
    expect(scheduled("bell")[0]).toBe(resumedAt + 169_700);
    expect(scheduled("beep")[0]).toBe(resumedAt + 169_700 - 30_000);

    at(resumedAt + 700 + TICK_SLACK_MS);
    expect(shown().sec).toBe(169);
  });

  it("Reset возвращает начальное состояние и отменяет сигналы", () => {
    press("Start");
    at(T0 + 200_000);
    press("Reset");
    expect(sounds.cancelPending).toHaveBeenCalled();
    expect(shown()).toEqual({ round: 1, isBreak: false, sec: 180 });
    expect(screen.getByText("Start")).toBeTruthy();
  });

  it("после возврата из фона фаза пересчитывается, а звуки ставятся заново", () => {
    press("Start");
    at(T0 + 1000);
    // приложение было свёрнуто, JS не работал
    vi.setSystemTime(T0 + 2 * CYCLE + 5000);
    playAt.mockClear();
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(sounds.cancelPending).toHaveBeenCalled();
    expect(shown()).toEqual({ round: 3, isBreak: false, sec: 175 });
    // прошедшие сигналы не догоняют, следующий — предупреждение этого раунда
    expect(Math.min(...playAt.mock.calls.map(([, t]) => t))).toBe(T0 + 2 * CYCLE + ROUND_MS - 30_000);
  });
});
