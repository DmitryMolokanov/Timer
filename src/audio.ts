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
// расхождение часов, после которого запланированный звук переставляется
const DRIFT_TOLERANCE_S = 0.02;
// звук, который вот-вот начнётся, уже не трогаем: аудиопоток мог его запустить
const RESYNC_MARGIN_S = 0.1;

interface ScheduledSound {
  name: SoundName;
  // момент по Date.now()
  at: number;
  source: AudioBufferSourceNode;
  startTime: number;
}

/**
 * Звуки через Web Audio: сигналы планируются заранее на часах AudioContext,
 * поэтому звучат вовремя, даже когда браузер притормаживает таймеры JS.
 *
 * Часы AudioContext идут от звуковой карты и уходят от Date.now(): на телефонах
 * и Bluetooth-наушниках на заметные доли процента, а при заминках аудиопотока
 * просто отстают. Поэтому resync() регулярно пересчитывает уже запланированные звуки.
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
          // decodeAudioData забирает буфер себе — отдаём копию, чтобы после ошибки можно было повторить
          this.buffers[name] = await ctx.decodeAudioData(data[name].slice(0));
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

  // переставить ещё не прозвучавшие сигналы по текущему соотношению часов
  resync() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    for (const item of this.scheduled) {
      if (item.startTime <= now + RESYNC_MARGIN_S) continue;
      const startTime = this.contextTime(ctx, item.at);
      if (Math.abs(startTime - item.startTime) <= DRIFT_TOLERANCE_S) continue;
      item.source.onended = null;
      item.source.stop();
      this.play(ctx, item, startTime);
    }
  }

  private start(name: SoundName, at: number) {
    const ctx = this.ctx;
    if (!ctx || !this.buffers[name]) return;
    if (at - Date.now() < -MAX_LATENESS_MS) return;

    const item = { name, at } as ScheduledSound;
    this.play(ctx, item, this.contextTime(ctx, at));
    this.scheduled.add(item);
  }

  private play(ctx: AudioContext, item: ScheduledSound, startTime: number) {
    const source = ctx.createBufferSource();
    source.buffer = this.buffers[item.name]!;
    source.connect(ctx.destination);
    source.onended = () => this.scheduled.delete(item);
    item.source = source;
    item.startTime = Math.max(ctx.currentTime, startTime);
    source.start(item.startTime);
  }

  // момент Date.now() на часах AudioContext. getOutputTimestamp говорит, какой отсчёт
  // слышен из динамика прямо сейчас, — так учитывается и задержка вывода звука
  private contextTime(ctx: AudioContext, at: number) {
    const fromNow = (at - Date.now()) / 1000;
    const ts = ctx.getOutputTimestamp?.();
    if (ts?.contextTime && ts.performanceTime) {
      const heardNow = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
      // некоторые браузеры отдают устаревшую метку — тогда ей не верим
      const lag = ctx.currentTime - heardNow;
      if (lag >= -0.05 && lag < 0.5) return heardNow + fromNow;
    }
    return ctx.currentTime + fromNow;
  }
}

export const sounds = new SoundPlayer();
