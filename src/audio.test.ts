import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SoundName } from "./audio";

/**
 * Модель звуковой карты: стенные часы (Date.now, performance.now) и часы AudioContext,
 * которые могут идти с другой скоростью, стоять и выводить звук с задержкой.
 * Для каждого звука считается стенной момент, когда он слышен из динамика.
 */
class FakeAudio {
  wall = 1_700_000_000_000;
  audio = 1;
  // скорость часов AudioContext относительно стенных
  rate = 1;
  // задержка вывода, сек.: отсчёт contextTime слышен, когда currentTime = contextTime + latency
  latency = 0;
  failDecodes = 0;
  sources = new Set<FakeSource>();
  heard: { name: SoundName; wall: number }[] = [];
  private perfOrigin = this.wall - 50_000;

  perfNow = () => this.wall - this.perfOrigin;

  // stalled — аудиопоток стоит, а реальное время идёт
  advance(ms: number, { stalled = false } = {}) {
    const from = this.audio;
    const to = stalled ? from : from + (ms / 1000) * this.rate;
    for (const s of [...this.sources]) {
      // start() с моментом в прошлом играет сразу
      const heardAt = Math.max(s.startTime + this.latency, from);
      if (heardAt <= to && to > from) {
        this.heard.push({ name: s.buffer.name, wall: this.wall + ((heardAt - from) / this.rate) * 1000 });
        this.sources.delete(s);
        s.onended?.();
      }
    }
    this.audio = to;
    this.wall += ms;
  }

  // shift — смещение стенного времени до ближайшей отметки шага: тики таймера не совпадают с сигналами
  run(ms: number, step: number, onTick?: () => void, shift = 37) {
    this.advance(shift);
    for (let t = shift; t < ms; t += step) {
      this.advance(step);
      onTick?.();
    }
  }
}

interface FakeBuffer {
  name: SoundName;
}

class FakeSource {
  buffer!: FakeBuffer;
  startTime = -1;
  onended: (() => void) | null = null;
  private hw: FakeAudio;
  constructor(hw: FakeAudio) {
    this.hw = hw;
  }
  connect() {}
  start(when = 0) {
    this.startTime = when;
    // беззвучный буфер из unlock() не учитываем
    if (this.buffer?.name) this.hw.sources.add(this);
  }
  stop() {
    this.hw.sources.delete(this);
    const onended = this.onended;
    queueMicrotask(() => onended?.());
  }
}

const NAMES: SoundName[] = ["bell", "beep", "knock"];
const nameOf = (bytes: number) => NAMES[bytes - 1];

function install(hw: FakeAudio) {
  vi.spyOn(Date, "now").mockImplementation(() => hw.wall);
  vi.spyOn(performance, "now").mockImplementation(hw.perfNow);
  // длина файла кодирует, какой это звук
  vi.stubGlobal("fetch", async (url: string) => {
    const name = url.includes("beep") ? "beep" : url.includes("knock") ? "knock" : "bell";
    return { arrayBuffer: async () => new ArrayBuffer(NAMES.indexOf(name) + 1) };
  });
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      destination = {};
      get currentTime() {
        return hw.audio;
      }
      resume = async () => {};
      createBuffer = () => ({});
      createBufferSource = () => new FakeSource(hw);
      getOutputTimestamp = () => ({ contextTime: hw.audio - hw.latency, performanceTime: hw.perfNow() });
      // как в браузере: decodeAudioData забирает буфер себе
      decodeAudioData = async (data: ArrayBuffer) => {
        const bytes = structuredClone(data, { transfer: [data] }).byteLength;
        if (hw.failDecodes > 0) {
          hw.failDecodes--;
          throw new Error("decode failed");
        }
        if (bytes === 0) throw new Error("detached buffer");
        return { name: nameOf(bytes) };
      };
    }
  );
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const MIN = 60_000;
const TICK = 200;
// допуск resync() в audio.ts — 20 мс
const TOLERANCE_MS = 21;

let hw: FakeAudio;

async function loadPlayer() {
  vi.resetModules();
  const { sounds } = await import("./audio");
  sounds.unlock();
  await flush();
  return sounds;
}

beforeEach(() => {
  hw = new FakeAudio();
  install(hw);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const lateness = (targets: number[]) => hw.heard.map((h, i) => h.wall - targets[i]);

describe("SoundPlayer", () => {
  it("звук слышен ровно в назначенный момент", async () => {
    const sounds = await loadPlayer();
    const at = hw.wall + 5000;
    sounds.playAt("bell", at);
    hw.run(6000, TICK, () => sounds.resync());
    expect(hw.heard).toHaveLength(1);
    expect(hw.heard[0].name).toBe("bell");
    expect(Math.abs(hw.heard[0].wall - at)).toBeLessThan(1);
  });

  it("учитывает задержку вывода звука (например, Bluetooth)", async () => {
    hw.latency = 0.2;
    const sounds = await loadPlayer();
    const at = hw.wall + 5000;
    sounds.playAt("beep", at);
    hw.run(6000, TICK, () => sounds.resync());
    expect(Math.abs(hw.heard[0].wall - at)).toBeLessThan(1);
  });

  describe("уход часов AudioContext от Date.now()", () => {
    const schedule = (sounds: Awaited<ReturnType<typeof loadPlayer>>) => {
      const targets = [1, 3, 6, 9, 12, 15].map((m) => hw.wall + m * MIN);
      for (const at of targets) sounds.playAt("bell", at);
      return targets;
    };

    it.each([
      ["отстают на 0,5%", 0.995],
      ["спешат на 0,5%", 1.005],
    ])("часы %s — звуки на 15 минут вперёд звучат вовремя", async (_, rate) => {
      hw.rate = rate;
      const sounds = await loadPlayer();
      const targets = schedule(sounds);
      hw.run(16 * MIN, TICK, () => sounds.resync());
      expect(hw.heard).toHaveLength(targets.length);
      for (const late of lateness(targets)) expect(Math.abs(late)).toBeLessThanOrEqual(TOLERANCE_MS);
    });

    it("без resync() отставание копится (так было до исправления)", async () => {
      hw.rate = 0.995;
      const sounds = await loadPlayer();
      const targets = schedule(sounds);
      hw.run(16 * MIN, TICK);
      const late = lateness(targets);
      expect(late[0]).toBeGreaterThan(250);
      expect(late[4]).toBeGreaterThan(3500);
      expect(late).toEqual([...late].sort((a, b) => a - b));
    });

    it("заминка аудиопотока на 2 сек. не сдвигает следующие звуки", async () => {
      const sounds = await loadPlayer();
      const targets = schedule(sounds);
      hw.run(30_000, TICK, () => sounds.resync());
      hw.advance(2000, { stalled: true });
      hw.run(16 * MIN, TICK, () => sounds.resync());
      for (const late of lateness(targets)) expect(Math.abs(late)).toBeLessThanOrEqual(TOLERANCE_MS);
    });
  });

  it("cancelPending() отменяет ещё не прозвучавшие сигналы", async () => {
    const sounds = await loadPlayer();
    sounds.playAt("bell", hw.wall + 1000);
    sounds.playAt("knock", hw.wall + 3000);
    hw.run(2000, TICK, () => sounds.resync());
    sounds.cancelPending();
    hw.run(5000, TICK, () => sounds.resync());
    expect(hw.heard.map((h) => h.name)).toEqual(["bell"]);
  });

  it("звук, опоздавший больше чем на секунду, не играет, а меньше — играет сразу", async () => {
    const sounds = await loadPlayer();
    sounds.playAt("bell", hw.wall - 2000);
    sounds.playAt("beep", hw.wall - 500);
    const now = hw.wall;
    hw.run(1000, TICK);
    expect(hw.heard).toEqual([{ name: "beep", wall: now }]);
  });

  it("звук, заказанный до окончания загрузки, всё равно звучит вовремя", async () => {
    vi.resetModules();
    const { sounds } = await import("./audio");
    sounds.unlock();
    const at = hw.wall + 3000;
    sounds.playAt("knock", at);
    await flush();
    hw.run(4000, TICK, () => sounds.resync());
    expect(hw.heard.map((h) => h.name)).toEqual(["knock"]);
    expect(Math.abs(hw.heard[0].wall - at)).toBeLessThan(1);
  });

  it("после ошибки декодирования повторный unlock() загружает звуки", async () => {
    hw.failDecodes = 1;
    const sounds = await loadPlayer();
    sounds.playAt("bell", hw.wall + 1000);
    hw.run(2000, TICK);
    expect(hw.heard).toEqual([]);

    sounds.unlock();
    await flush();
    sounds.playAt("bell", hw.wall + 1000);
    hw.run(2000, TICK);
    expect(hw.heard.map((h) => h.name)).toEqual(["bell"]);
  });
});
