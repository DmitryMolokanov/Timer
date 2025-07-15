import { useCallback, useEffect, useMemo, useRef, useState, type FC } from "react";
import bellSound from "../assets/sound/boxingBell.mp3";
import type { InitTimer } from "../types/Timer";

interface TimerProps {
    initTimer: InitTimer
    initBreakTimer: InitTimer
}

const Timer: FC<TimerProps> = ({ initTimer, initBreakTimer }) => {
    const [min, setMin] = useState(3);
    const [sec, setSec] = useState(0);
    const [start, setStart] = useState(false);
    const [breakRound, setBreakRound] = useState(false);
    const [round, setRound] = useState(1);

    const timerRef = useRef<number | undefined>(undefined)

    const startTimer = () => {
        setStart((prev) => !prev);
    };

    const decrementMin = () => {
        setMin((prev) => prev - 1);
        setSec(59);
    }

    const decrementSec = () => {
        timerRef.current = setTimeout(() => setSec((prev) => prev - 1), 1000);
        return () => clearTimeout(timerRef.current);
    }

    const playSoundBell = () => {
        const startBellSound = new Audio(bellSound);
        return startBellSound.play();
    }

    const startBreak = useCallback(() => {
        playSoundBell()
        setBreakRound(true);
        setMin(initBreakTimer.min);
        setSec(initBreakTimer.sec);
    }, [initBreakTimer])

    const startNextRound = useCallback(() => {
        playSoundBell()
        setBreakRound(false);
        setStart(true);
        setRound((prev) => prev + 1);
        setMin(initTimer.min);
        setSec(initTimer.sec);
    }, [initTimer])

    const resetTimer = () => {
        setStart(false);
        setBreakRound(false)
        setMin(initTimer.min);
        setSec(initTimer.sec);
        return clearTimeout(timerRef.current)
    };

    const isTimerFinished = min === 0 && sec === 0

    useEffect(() => {

        if (start || breakRound) {

            // гонг
            if (initTimer.min === min && initTimer.sec === sec && start) {
                playSoundBell()
            }

            // декремент минут
            if (min > 0 && sec === 0) {
                decrementMin()
                return
            }

            // декремент секунд
            if (sec > 0 && start) {
                decrementSec()
            }

            // изменение начала раунда и отдыха
            if (isTimerFinished) {
                if (!breakRound) {
                    startBreak()
                } else {
                    startNextRound()
                }
            }
        }
    }, [start, sec, min, breakRound, initTimer, isTimerFinished, startBreak, startNextRound]);


    const timeConverter = useMemo(() => {
        return `${min.toString().padStart(2, "0")} : ${sec.toString().padStart(2, "0")}`;
    }, [min, sec]);

    return (
        <div className={`content ${start ? 'content-start' : ""} ${breakRound ? 'content-break' : ''}`}>
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
    )
};

export default Timer
