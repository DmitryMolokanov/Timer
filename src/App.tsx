import { useEffect, useMemo, useState } from 'react'
import './App.css'
import menu from './assets/icons/menu-burger.svg'

function App() {
  const [min, setMin] = useState(3)
  const [sec, setSec] = useState(0);
  const [start, setStart] = useState(false)


  const startTimer = () => {
    setStart(prev => !prev)
  }


  useEffect(() => {
    let timerSecId: number
    if (start) {
      if (min > 0 && sec === 0) {
        setMin(prev => prev - 1)
        setSec(59)
      }

      if (sec > 0 && start) {
        timerSecId = setTimeout(() => setSec(prev => prev - 1), 1000)
        return () => clearTimeout(timerSecId)
      }
      else {
        return () => clearTimeout(timerSecId)
      }
    }
  }, [start, sec, min]);


  const timeConverter = useMemo(() => {
    return `${min.toString().padStart(2, '0')} : ${sec.toString().padStart(2, '0')}`
  }, [min, sec])

  return (
    <div className='app-layout'>
      <div className='header'>
        <div className='header__menu-container'>
          <img src={menu} alt="menu" />
        </div>
      </div>
      <div className='content'>
        <div className='timer'>
          <span>{timeConverter}</span>
        </div>
        <div className='group-btn'>
          <button>Reset</button>
          <button onClick={startTimer}>{!start ? "Start" : "Pause"}</button>
        </div>
      </div>
    </div>
  );
}

export default App
