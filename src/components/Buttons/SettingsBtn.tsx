import type { FC } from "react";

interface SettingsBtnProps {
    img: string
    label: string
    handler: () => void
}

const SettingsBtn: FC<SettingsBtnProps> = ({ img, label, handler }) => {
    return (
        <button
            className="settings__btn"
            aria-label={label}
            onClick={handler}
        >
            <img src={img} alt="" />
        </button>)
};

export default SettingsBtn
