import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./App.css";
import menu from "./assets/icons/menu-burger.svg";
import Timer from "./components/Timer";
import Settings from "./components/Settings";
import { useSlidePanel } from "./hooks/useSlidePanel";
import { loadSettings, saveSettings, toMs, type TimerSettings } from "./settings";

function App() {
  const [settings, setSettings] = useState(loadSettings);
  // настройки выезжают справа: свайп влево, ☰; закрываются свайпом вправо, ✕ или системным «Назад»
  const panel = useSlidePanel();

  // новая версия ставится по нажатию, а не сама: перезагрузка посреди раунда сбросила бы таймер
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const saveTimerSettings = (next: TimerSettings) => {
    setSettings(next);
    saveSettings(next);
    panel.close();
  };

  return (
    <div className="app-layout" ref={panel.rootRef}>
      <div className="app-screen" ref={panel.screenRef}>
        <div className="header">
          {needRefresh && (
            <button className="header__update" onClick={() => updateServiceWorker(true)}>
              Обновить приложение
            </button>
          )}
          <button
            className="header__menu-container"
            aria-label="Настройки"
            aria-expanded={panel.isOpen}
            onClick={panel.open}
          >
            <img src={menu} alt="" />
          </button>
        </div>
        {/* таймер не размонтируется, пока открыты настройки, — тренировка продолжается;
            новые настройки (смена key) запускают его заново */}
        <Timer
          key={`${toMs(settings.round)}-${toMs(settings.break)}`}
          initTimer={settings.round}
          initBreakTimer={settings.break}
        />
      </div>

      <div className="app-dim" ref={panel.dimRef} />

      <div className="settings-panel" ref={panel.panelRef} inert={!panel.isOpen}>
        <div className="header">
          <h1 className="header__title">Настройки</h1>
          <button className="header__menu-container" aria-label="Закрыть настройки" onClick={panel.close}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {panel.isMounted && <Settings settings={settings} onSave={saveTimerSettings} />}
      </div>
    </div>
  );
}

export default App;
