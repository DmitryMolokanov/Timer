import { useRef, type ButtonHTMLAttributes, type FC, type PointerEvent } from "react";

// кнопка с волной от точки касания: волна запускается в момент нажатия и доигрывает до конца,
// даже если палец уже убран и текст кнопки сменился (волны живут в отдельном слое, React его не перерисовывает)
const RippleButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className,
  onPointerDown,
  ...props
}) => {
  const layerRef = useRef<HTMLSpanElement>(null);

  const showRipple = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(e);
    const layer = layerRef.current;
    if (!layer) return;

    const rect = layer.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const wave = document.createElement("span");
    wave.className = "ripple__wave";
    wave.style.width = wave.style.height = `${size}px`;
    wave.style.left = `${e.clientX - rect.left - size / 2}px`;
    wave.style.top = `${e.clientY - rect.top - size / 2}px`;
    wave.addEventListener("animationend", () => wave.remove());
    layer.appendChild(wave);
  };

  return (
    <button
      {...props}
      className={className ? `ripple ${className}` : "ripple"}
      onPointerDown={showRipple}
    >
      {children}
      <span ref={layerRef} className="ripple__layer" aria-hidden="true" />
    </button>
  );
};

export default RippleButton;
