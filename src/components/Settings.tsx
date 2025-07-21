import { useState, type FC } from 'react';
import leftArrow from '../assets/icons/arrow_left.svg'
import rightArrow from '../assets/icons/arrow_right.svg'
import SettingsBtn from './Buttons/SettingsBtn';
import type { InitTimer } from '../types/Timer';

interface SettingsProps {
    setInitTimer: (arg: InitTimer) => void
    setInitBreackTimer: (arg: InitTimer) => void
    setInitShowSettings: (arg: boolean) => void
}

const Settings: FC<SettingsProps> = ({ setInitTimer, setInitBreackTimer, setInitShowSettings }) => {

    const [timer, setTimer] = useState({ min: 0, sec: 0 })
    const [timerBreak, setTimerBreak] = useState({ min: 0, sec: 0 })
    const [errMessage, setErrMessage] = useState('')


    const validation = () => {
        if (timer.min === 0 && timer.sec === 0) {
            setErrMessage('Set the round time')
            return false
        }
        if (timerBreak.min === 0 && timerBreak.sec === 0) {
            setErrMessage('Set a break time')
            return false
        }
        return true
    }

    // таймер
    const decrementMin = () => {
        if (timer.min > 0) {
            setTimer((prev) => ({ ...prev, min: prev.min - 1 }))
        }
    }

    const incrementMin = () => {
        if (timer.min < 100) {
            setTimer((prev) => ({ ...prev, min: prev.min + 1 }))
        }
    }


    const decrementSec = () => {
        if (timer.sec > 0) {
            setTimer((prev) => ({ ...prev, sec: prev.sec - 15 }))
        }
    }

    const incrementSec = () => {
        if (timer.sec < 60) {
            setTimer((prev) => ({ ...prev, sec: prev.sec + 15 }))
        }
    }

    // отдых
    const decrementBreakMin = () => {
        if (timerBreak.min > 0) {
            setTimerBreak((prev) => ({ ...prev, min: prev.min - 1 }))
        }
    }

    const incrementBreakMin = () => {
        if (timerBreak.min < 100) {
            setTimerBreak((prev) => ({ ...prev, min: prev.min + 1 }))
        }
    }


    const decrementBreakSec = () => {
        if (timerBreak.sec > 0) {
            setTimerBreak((prev) => ({ ...prev, sec: prev.sec - 15 }))
        }
    }

    const incrementBreakSec = () => {
        if (timerBreak.sec < 60) {
            setTimerBreak((prev) => ({ ...prev, sec: prev.sec + 15 }))
        }
    }

    const saveData = () => {
        if (!validation()) return
        setInitTimer(timer)
        setInitBreackTimer(timerBreak)
        setInitShowSettings(false)
    }

    return (
        <div className="settings">
            <h2>Установить время таймера</h2>
            <div className='settings__item'>
                <div className='settings__time'>
                    <span>Минуты</span>
                    <div className='settings__counter'>
                        <SettingsBtn img={leftArrow} handler={decrementMin} />
                        <span>{timer.min}</span>
                        <SettingsBtn img={rightArrow} handler={incrementMin} />
                    </div>
                </div>
            </div>

            <div className='settings__item'>
                <div className='settings__time'>
                    <span>Секунды</span>
                    <div className='settings__counter'>
                        <SettingsBtn img={leftArrow} handler={decrementSec} />
                        <span>{timer.sec}</span>
                        <SettingsBtn img={rightArrow} handler={incrementSec} />
                    </div>
                </div>
            </div>

            <h2>Установить время отдыха</h2>
            <div className='settings__item'>
                <div className='settings__time'>
                    <span>Минуты</span>
                    <div className='settings__counter'>
                        <SettingsBtn img={leftArrow} handler={decrementBreakMin} />
                        <span >{timerBreak.min}</span>
                        <SettingsBtn img={rightArrow} handler={incrementBreakMin} />
                    </div>
                </div>
            </div>

            <div className='settings__item'>
                <div className='settings__time'>
                    <span>Секунды</span>
                    <div className='settings__counter'>
                        <SettingsBtn img={leftArrow} handler={decrementBreakSec} />
                        <span>{timerBreak.sec}</span>
                        <SettingsBtn img={rightArrow} handler={incrementBreakSec} />
                    </div>
                </div>
            </div>
            <button
                className='btn-main'
                onClick={saveData}
            >
                Save
            </button>
            {errMessage
                ? <div className='error-message'>
                    <span>{errMessage}</span>
                </div>
                : null
            }
        </div>
    )
};

export default Settings
