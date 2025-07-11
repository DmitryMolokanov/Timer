import { useCallback, useEffect, useState } from 'react'
import './App.css'

function App() {
  const [min, setMin] = useState(1)
  const [sec, setSec] = useState(3);
  const [start, setStart] = useState(false)


  const startTimer = () => {
    setStart(true)
  }

  const timer = useCallback(() => {

    if (min > 0 && sec === 0) {
      setMin(prev => prev - 1)
      setSec(59)
    }


    if (sec > 0) {
      const timerSecId = setTimeout(() => setSec(prev => prev - 1), 1000)
      return () => clearTimeout(timerSecId)
    }
  }, [sec, min])

  useEffect(() => {
    if (start) {
      timer()
    }
  }, [timer, start]);


  return (
    <div>
      <span>{min}:{sec}</span>
      <button onClick={startTimer}>Start</button>
    </div>
  );

}

export default App
