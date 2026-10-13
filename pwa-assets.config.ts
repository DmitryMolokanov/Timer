import {
  AllAppleDeviceNames,
  createAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// иконки и заставки iOS генерируются при сборке из public/timer.svg (vite-plugin-pwa, опция pwaAssets)
const ICON_BACKGROUND = '#4169e1'
const SPLASH_BACKGROUND = '#2B2B2B'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    // в timer.svg уже есть отступы, а значок помещается в безопасную зону maskable-иконки
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: ICON_BACKGROUND } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: ICON_BACKGROUND } },
    // без этих картинок iOS показывает при запуске белый экран
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.75,
        resizeOptions: { background: SPLASH_BACKGROUND },
        linkMediaOptions: { log: false, addMediaScreen: true, xhtml: false },
      },
      AllAppleDeviceNames.filter((name) => name.startsWith('iPhone')),
    ),
  },
  images: ['public/timer.svg'],
})
