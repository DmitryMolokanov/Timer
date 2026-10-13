// заставка из index.html: держим, пока доигрывает анимация кольца, потом плавно убираем; тап — пропустить
const MIN_VISIBLE_MS = 1400;
const FADE_MS = 300;

export function hideSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;

  const hide = () => {
    splash.classList.add("splash--leaving");
    setTimeout(() => splash.remove(), FADE_MS);
  };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // performance.now() считается от начала загрузки страницы, т.е. почти от первого кадра заставки
  const delay = reduceMotion ? 0 : Math.max(0, MIN_VISIBLE_MS - performance.now());
  const timer = setTimeout(hide, delay);

  splash.addEventListener(
    "click",
    () => {
      clearTimeout(timer);
      hide();
    },
    { once: true }
  );
}
