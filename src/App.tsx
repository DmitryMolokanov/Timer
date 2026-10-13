import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./App.css";
import menu from "./assets/icons/menu-burger.svg";
import Timer from "./components/Timer";
import Settings from "./components/Settings";
import { loadSettings, saveSettings, toMs, type TimerSettings } from "./settings";

function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [isShowSettings, setIsShowSettings] = useState(false);

  // новая версия ставится по нажатию, а не сама: перезагрузка посреди раунда сбросила бы таймер
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const saveTimerSettings = (next: TimerSettings) => {
    setSettings(next);
    saveSettings(next);
    setIsShowSettings(false);
  };

  return (
    <div className="app-layout">
      <div className="header">
        {isShowSettings && <h1 className="header__title">Настройки</h1>}
        {needRefresh && (
          <button className="header__update" onClick={() => updateServiceWorker(true)}>
            Обновить приложение
          </button>
        )}
        <button
          className="header__menu-container"
          aria-label={isShowSettings ? "Закрыть настройки" : "Настройки"}
          onClick={() => setIsShowSettings((prev) => !prev)}
        >
          {isShowSettings ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <img src={menu} alt="" />
          )}
        </button>
      </div>
      {/* таймер остаётся смонтированным, чтобы открытие настроек не сбрасывало тренировку;
          новые настройки (смена key) запускают его заново */}
      <Timer
        key={`${toMs(settings.round)}-${toMs(settings.break)}`}
        hidden={isShowSettings}
        initTimer={settings.round}
        initBreakTimer={settings.break}
      />
      {isShowSettings && (
        <Settings settings={settings} onSave={saveTimerSettings} />
      )}
    </div>
  );
}

export default App;
