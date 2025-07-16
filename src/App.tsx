import { useState } from "react";
import "./App.css";
import menu from "./assets/icons/menu-burger.svg";
import Timer from "./components/Timer";
import type { InitTimer } from "./types/Timer";
import Settings from "./components/Settings";

function App() {
  const [initTimer, setInitTimer] = useState<InitTimer>({ min: 3, sec: 0 });
  const [initBreakTimer, setInitBreackTimer] = useState<InitTimer>({ min: 1, sec: 0 })
  const [isShowSettings, setInitShowSettings] = useState(false)


  const showSettings = () => {
    setInitShowSettings(prev => !prev)
  }

  return (
    <div className="app-layout">
      <div className="header">
        <div className="header__menu-container"
          onClick={showSettings}
        >
          <img src={menu} alt="menu" />
        </div>
      </div>
      {
        !isShowSettings
          ? <Timer initTimer={initTimer} initBreakTimer={initBreakTimer} />
          : <Settings setInitTimer={setInitTimer} setInitBreackTimer={setInitBreackTimer} />
      }
    </div>
  );
}

export default App;
