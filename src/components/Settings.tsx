import { useState, type Dispatch, type FC, type SetStateAction } from 'react';
import leftArrow from '../assets/icons/arrow_left.svg'
import rightArrow from '../assets/icons/arrow_right.svg'
import SettingsBtn from './Buttons/SettingsBtn';
import type { InitTimer } from '../types/Timer';
import { MAX_MIN, MAX_SEC, SEC_STEP, type TimerSettings } from '../settings';

interface SettingsProps {
    settings: TimerSettings
    onSave: (settings: TimerSettings) => void
}

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

interface CounterProps {
    label: string
    value: number
    onDecrement: () => void
    onIncrement: () => void
}

const Counter: FC<CounterProps> = ({ label, value, onDecrement, onIncrement }) => (
    <div className='settings__item'>
        <div className='settings__time'>
            <span>{label}</span>
            <div className='settings__counter'>
                <SettingsBtn img={leftArrow} label={`${label}: уменьшить`} handler={onDecrement} />
                <span>{value}</span>
                <SettingsBtn img={rightArrow} label={`${label}: увеличить`} handler={onIncrement} />
            </div>
        </div>
    </div>
)

const Settings: FC<SettingsProps> = ({ settings, onSave }) => {

    const [timer, setTimer] = useState(settings.round)
    const [timerBreak, setTimerBreak] = useState(settings.break)
    const [errMessage, setErrMessage] = useState('')

    const validation = () => {
        if (timer.min === 0 && timer.sec === 0) {
            setErrMessage('Установите время раунда')
            return false
        }
        if (timerBreak.min === 0 && timerBreak.sec === 0) {
            setErrMessage('Установите время отдыха')
            return false
        }
        return true
    }

    const changeMin = (setter: Dispatch<SetStateAction<InitTimer>>, delta: number) => () =>
        setter((prev) => ({ ...prev, min: clamp(prev.min + delta, MAX_MIN) }))

    const changeSec = (setter: Dispatch<SetStateAction<InitTimer>>, delta: number) => () =>
        setter((prev) => ({ ...prev, sec: clamp(prev.sec + delta, MAX_SEC) }))

    const saveData = () => {
        if (!validation()) return
        onSave({ round: timer, break: timerBreak })
    }

    return (
        <div className="settings">
            <h2>Установить время таймера</h2>
            <Counter
                label='Минуты'
                value={timer.min}
                onDecrement={changeMin(setTimer, -1)}
                onIncrement={changeMin(setTimer, 1)}
            />
            <Counter
                label='Секунды'
                value={timer.sec}
                onDecrement={changeSec(setTimer, -SEC_STEP)}
                onIncrement={changeSec(setTimer, SEC_STEP)}
            />

            <h2>Установить время отдыха</h2>
            <Counter
                label='Минуты'
                value={timerBreak.min}
                onDecrement={changeMin(setTimerBreak, -1)}
                onIncrement={changeMin(setTimerBreak, 1)}
            />
            <Counter
                label='Секунды'
                value={timerBreak.sec}
                onDecrement={changeSec(setTimerBreak, -SEC_STEP)}
                onIncrement={changeSec(setTimerBreak, SEC_STEP)}
            />
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
