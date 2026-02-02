import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 900; 

export default function Tooltip({ children, content, position = "top" }) {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isCompact) {
    // Не показываем тултип в режиме "compact"/мобильном/half-desktop
    return children;
  }

  return (
    <div className="relative group flex flex-col items-center">
      {children}
      <div className={`absolute z-50
        ${position === 'top' ? 'bottom-[110%]' : 'top-full mt-2'}
        left-[0.5px]
        w-auto bg-blue-600 text-white text-xs
        px-3 py-1 rounded-md shadow-xl
        opacity-0 group-hover:opacity-100
        transition-opacity duration-300
        pointer-events-none whitespace-nowrap`}>
        {typeof content === 'string' ? <p>{content}</p> : content}
      </div>
    </div>
  );
}
