import { useEffect, useMemo, useState } from "react";
import "./App.css";
import menu from "./assets/icons/menu-burger.svg";
import bellSound from "./assets/sound/boxingBell.mp3";

function App() {
  const [initTimer, setInitTimer] = useState({ min: 3, sec: 0 });
  const [min, setMin] = useState(0);
  const [sec, setSec] = useState(5);
  const [start, setStart] = useState(false);
  const [round, setRound] = useState(1);
  const [breakRound, setBreakRound] = useState(false);

  const startTimer = () => {
    setStart((prev) => !prev);
  };

  const resetTimer = () => {
    setStart(false);
    setMin(initTimer.min);
    setSec(initTimer.sec);
  };

  useEffect(() => {
    let timerSecId: number;
    if (start || breakRound) {
      // гонг
      if (initTimer.min === min && initTimer.sec === sec && start) {
        const startBellSound = new Audio(bellSound);
        startBellSound.play();
      }
      // декремент минут
      if (min > 0 && sec === 0) {
        setMin((prev) => prev - 1);
        setSec(59);
      }

      // декремент секунд
      if (sec > 0 && start) {
        timerSecId = setTimeout(() => setSec((prev) => prev - 1), 1000);
        return () => clearTimeout(timerSecId);
      }

      // перерыв
      if (sec === 0 && min === 0) {
        setBreakRound(true);
        setMin(0);
        setSec(3);
      }

      // следующий раунд
      if (sec === 0 && min === 0 && breakRound) {
        setBreakRound(false);
        setStart(true);
        setRound((prev) => prev + 1);
        setMin(0);
        setSec(5);
      }
    }
  }, [start, sec, min, breakRound, initTimer]);

  const timeConverter = useMemo(() => {
    return `${min.toString().padStart(2, "0")} : ${sec
      .toString()
      .padStart(2, "0")}`;
  }, [min, sec]);

  return (
    <div className="app-layout">
      <div className="header">
        <div className="header__menu-container">
          <img src={menu} alt="menu" />
        </div>
      </div>
      <div className="content">
        <div className="timer">
          <div className="timer__round-container">
            <span>Round</span>
            <span>{round}</span>
          </div>
          <span>{timeConverter}</span>
        </div>
        <div className="group-btn">
          <button onClick={resetTimer}>Reset</button>
          <button onClick={startTimer}>{!start ? "Start" : "Pause"}</button>
        </div>
      </div>
    </div>
  );
}

export default App;
