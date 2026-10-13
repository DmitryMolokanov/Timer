import bellUrl from "./assets/sound/boxingBell.mp3";
import beepUrl from "./assets/sound/beep.mp3";
import knockUrl from "./assets/sound/knock.mp3";

export type SoundName = "bell" | "beep" | "knock";

const SOUND_URLS: Record<SoundName, string> = {
  bell: bellUrl,
  beep: beepUrl,
  knock: knockUrl,
};

// звук, опоздавший сильнее (например, пока приложение было свёрнуто), уже не нужен
const MAX_LATENESS_MS = 1000;

interface ScheduledSound {
  source: AudioBufferSourceNode;
  startTime: number;
}

/**
 * Звуки через Web Audio: сигналы планируются заранее на часах AudioContext,
 * поэтому звучат вовремя, даже когда браузер притормаживает таймеры JS.
 */
class SoundPlayer {
  private ctx: AudioContext | null = null;
  private data: Promise<Record<SoundName, ArrayBuffer>> | null = null;
  private decoding: Promise<void> | null = null;
  private buffers: Partial<Record<SoundName, AudioBuffer>> = {};
  private scheduled = new Set<ScheduledSound>();
  private generation = 0;

  // скачать файлы заранее, чтобы первое нажатие Start не ждало сеть
  preload() {
    if (this.data) return;
    this.data = Promise.all(
      (Object.keys(SOUND_URLS) as SoundName[]).map(async (name) => {
        const res = await fetch(SOUND_URLS[name]);
        return [name, await res.arrayBuffer()] as const;
      })
    ).then((entries) => Object.fromEntries(entries) as Record<SoundName, ArrayBuffer>);
    this.data.catch(() => {
      this.data = null;
    });
  }

  // вызывать из обработчика нажатия: iOS и Chrome разрешают звук только после жеста пользователя
  unlock() {
    if (!this.ctx) this.ctx = new AudioContext();
    const ctx = this.ctx;
    this.resume();

    // старые iOS включают звук, только если что-то проиграно прямо в обработчике жеста
    const silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, 22050);
    silent.connect(ctx.destination);
    silent.start();

    if (!this.decoding) {
      this.preload();
      this.decoding = this.data!.then(async (data) => {
        for (const name of Object.keys(data) as SoundName[]) {
          this.buffers[name] = await ctx.decodeAudioData(data[name]);
        }
      });
      this.decoding.catch((err) => {
        console.error("Не удалось загрузить звуки", err);
        this.decoding = null;
      });
    }
  }

  resume() {
    if (this.ctx && this.ctx.state !== "running") {
      this.ctx.resume().catch(() => {});
    }
  }

  // at — момент по Date.now()
  playAt(name: SoundName, at: number) {
    if (this.buffers[name]) {
      this.start(name, at);
      return;
    }
    const generation = this.generation;
    this.decoding
      ?.then(() => {
        if (generation === this.generation) this.start(name, at);
      })
      .catch(() => {});
  }

  // отменить ещё не прозвучавшие сигналы (уже играющий звук доигрывает)
  cancelPending() {
    this.generation++;
    const now = this.ctx?.currentTime ?? 0;
    for (const item of this.scheduled) {
      if (item.startTime > now) {
        item.source.stop();
        this.scheduled.delete(item);
      }
    }
  }

  private start(name: SoundName, at: number) {
    const ctx = this.ctx;
    const buffer = this.buffers[name];
    if (!ctx || !buffer) return;

    const delayMs = at - Date.now();
    if (delayMs < -MAX_LATENESS_MS) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const item = { source, startTime: ctx.currentTime + Math.max(0, delayMs) / 1000 };
    source.start(item.startTime);
    source.onended = () => this.scheduled.delete(item);
    this.scheduled.add(item);
  }
}

export const sounds = new SoundPlayer();
