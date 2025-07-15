import type { FC } from "react";

interface SettingsBtnProps {
    img: string
    handler: () => void
}

const SettingsBtn: FC<SettingsBtnProps> = ({ img, handler }) => {
    return (
        <button
            className="settings__btn"
            onClick={handler}
        >
            <img src={img} alt="arrow" />
        </button>)
};

export default SettingsBtn
