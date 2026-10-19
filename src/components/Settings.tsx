import { useState, type Dispatch, type FC, type SetStateAction } from 'react';
import type { InitTimer } from '../types/Timer';
import { isSameSettings, MAX_MIN, MAX_SEC, PRESETS, SEC_STEP, toMs, type TimerSettings } from '../settings';

interface SettingsProps {
    settings: TimerSettings
    onSave: (settings: TimerSettings) => void
}

const pad = (n: number) => n.toString().padStart(2, '0')

const Chevron: FC<{ path: string, size?: number }> = ({ path, size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={path} />
    </svg>
)

const UP = 'M6 15l6-6 6 6'
const DOWN = 'M6 9l6 6 6-6'
const RIGHT = 'M9 6l6 6-6 6'
const CHECK = 'M6 12l4 4 8-8'

interface PickerColumnProps {
    label: string
    value: number
    step: number
    max: number
    onChange: (value: number) => void
}

const PickerColumn: FC<PickerColumnProps> = ({ label, value, step, max, onChange }) => (
    <div className='picker__column'>
        <button
            className='picker__step'
            aria-label={`${label}: больше`}
            disabled={value + step > max}
            onClick={() => onChange(value + step)}
        >
            <Chevron path={UP} />
        </button>
        <span className='picker__value'>{pad(value)}</span>
        <button
            className='picker__step'
            aria-label={`${label}: меньше`}
            disabled={value - step < 0}
            onClick={() => onChange(value - step)}
        >
            <Chevron path={DOWN} />
        </button>
    </div>
)

interface PhaseProps {
    title: string
    kind: 'round' | 'break'
    value: InitTimer
    onChange: Dispatch<SetStateAction<InitTimer>>
}

const Phase: FC<PhaseProps> = ({ title, kind, value, onChange }) => (
    <div className='phase'>
        <div className='phase__title'>
            <span className={`phase__dot phase__dot--${kind}`} />
            {title}
        </div>
        <div className='picker'>
            <PickerColumn
                label={`${title}, минуты`}
                value={value.min}
                step={1}
                max={MAX_MIN}
                onChange={(min) => onChange((prev) => ({ ...prev, min }))}
            />
            <span className='picker__colon'>:</span>
            <PickerColumn
                label={`${title}, секунды`}
                value={value.sec}
                step={SEC_STEP}
                max={MAX_SEC}
                onChange={(sec) => onChange((prev) => ({ ...prev, sec }))}
            />
        </div>
    </div>
)

const Settings: FC<SettingsProps> = ({ settings, onSave }) => {

    const [timer, setTimer] = useState(settings.round)
    const [timerBreak, setTimerBreak] = useState(settings.break)
    // ошибка показывается после попытки сохранить и пропадает, как только время исправлено
    const [showError, setShowError] = useState(false)

    const current = { round: timer, break: timerBreak }
    const activePreset = PRESETS.find((preset) => isSameSettings(preset, current))
    // своя настройка сразу раскрыта, если сейчас стоит время не из готовых режимов
    const [isCustomOpen, setIsCustomOpen] = useState(!activePreset)

    const error = toMs(timer) === 0
        ? 'Установите время раунда'
        : toMs(timerBreak) === 0 ? 'Установите время отдыха' : ''
    const errMessage = showError ? error : ''

    const saveData = () => {
        if (error) {
            setShowError(true)
            return
        }
        onSave(current)
    }

    return (
        <div className="settings">
            <div className='settings__body'>
                <div className='settings__label'>Готовые режимы</div>
                <div className='presets'>
                    {PRESETS.map((preset) => (
                        <button
                            key={`${preset.round.min}-${preset.break.min}`}
                            className={preset === activePreset ? 'preset preset--active' : 'preset'}
                            onClick={() => onSave(preset)}
                        >
                            <span className='preset__digits'>{preset.round.min} / {preset.break.min}</span>
                            <span className='preset__ratio' aria-hidden="true">
                                <span className='preset__ratio-round' style={{ flex: preset.round.min }} />
                                <span className='preset__ratio-break' style={{ flex: preset.break.min }} />
                            </span>
                            <span className='preset__caption'>
                                {preset.round.min} мин работа<br />{preset.break.min} мин отдых
                            </span>
                            {preset === activePreset && (
                                <span className='preset__check'><Chevron path={CHECK} size={14} /></span>
                            )}
                        </button>
                    ))}
                </div>

                <button
                    className={isCustomOpen ? 'settings__custom-toggle settings__custom-toggle--open' : 'settings__custom-toggle'}
                    aria-expanded={isCustomOpen}
                    onClick={() => setIsCustomOpen((prev) => !prev)}
                >
                    Своя настройка <Chevron path={RIGHT} />
                </button>

                {isCustomOpen && (
                    <>
                        <Phase title='Раунд' kind='round' value={timer} onChange={setTimer} />
                        <Phase title='Отдых' kind='break' value={timerBreak} onChange={setTimerBreak} />
                    </>
                )}
            </div>

            {isCustomOpen && (
                <div className='settings__footer'>
                    {errMessage && <p className='settings__error'>{errMessage}</p>}
                    <button className='settings__save' onClick={saveData}>Сохранить</button>
                </div>
            )}
        </div>
    )
};

export default Settings
